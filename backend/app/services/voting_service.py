import secrets
from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.election import Election
from app.models.voter import Voter, VoterEligibility
from app.models.authorization import VoteAuthorization, SpentAuthorization
from app.models.ballot import Ballot
from app.models.receipt import VoteReceipt
from app.core.crypto import sha256_hash
from app.blockchain.chain import blockchain_manager
from app.schemas.voting import AuthorizeResponse, VoteSubmitResponse, ReceiptVerificationResponse

def request_authorization(db: Session, voter: Voter, election_id: str) -> AuthorizeResponse:
    """
    Issues a short-lived, single-use voting authorization token (SRS FR-07, FR-08).
    Enforces eligibility and one-person-one-vote pre-checks.
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found."
        )

    now = datetime.now(timezone.utc)

    # Check election status and timeline
    if election.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Election is not active (current status: {election.status})."
        )
    
    # Check start and end time
    start_time = election.start_time if election.start_time.tzinfo else election.start_time.replace(tzinfo=timezone.utc)
    end_time = election.end_time if election.end_time.tzinfo else election.end_time.replace(tzinfo=timezone.utc)
    
    if now < start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election has not started yet."
        )
    if now > end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election voting window has concluded."
        )

    # Check voter eligibility
    eligibility = db.query(VoterEligibility).filter(
        VoterEligibility.election_id == election_id,
        VoterEligibility.voter_id == voter.id
    ).first()

    if not eligibility:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not registered as eligible for this election."
        )

    if eligibility.status == "voted":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have already cast your vote in this election."
        )

    # Generate single-use authorization token
    raw_token = secrets.token_urlsafe(32)
    jti_hash = sha256_hash(raw_token)
    expires_at = now + timedelta(minutes=15)  # 15 minute lifespan

    vote_auth = VoteAuthorization(
        election_id=election_id,
        jti_hash=jti_hash,
        expires_at=expires_at,
        issued_at=now,
        status="issued"
    )
    db.add(vote_auth)
    
    # Mark eligibility as authorized
    eligibility.status = "authorized"
    
    db.commit()

    return AuthorizeResponse(
        authorization_token=raw_token,
        election_id=election_id,
        expires_at=expires_at
    )

def submit_ballot(
    db: Session,
    election_id: str,
    authorization_token: str,
    encrypted_vote: str
) -> VoteSubmitResponse:
    """
    Submits an encrypted ballot using a single-use authorization token.
    Enforces atomic authorization consumption, spent-token persistence,
    ballot commitment, receipt creation, and blockchain ledger appending.
    
    STRICT PRIVACY GUARANTEE:
    No voter ID or student ID is accepted or persisted in this flow.
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found."
        )

    now = datetime.now(timezone.utc)

    if election.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Election is not active (status: {election.status}). Ballot rejected."
        )

    end_time = election.end_time if election.end_time.tzinfo else election.end_time.replace(tzinfo=timezone.utc)
    if now > end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Election closed. Ballot rejected."
        )

    # Hash incoming token to match against authorization storage
    jti_hash = sha256_hash(authorization_token)

    # 1. Check spent authorizations (Replay attack defense - TC-08, TC-09)
    already_spent = db.query(SpentAuthorization).filter(SpentAuthorization.jti_hash == jti_hash).first()
    if already_spent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This voting authorization has already been consumed."
        )

    # 2. Check vote authorization record
    auth_record = db.query(VoteAuthorization).filter(VoteAuthorization.jti_hash == jti_hash).first()
    if not auth_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid voting authorization token."
        )

    # 3. Check election match (TC-11: wrong election token)
    if auth_record.election_id != election_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization token is not valid for this election."
        )

    # 4. Check status and expiration (TC-10: expired token)
    if auth_record.status != "issued":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This authorization has already been consumed or revoked."
        )

    auth_expires = auth_record.expires_at if auth_record.expires_at.tzinfo else auth_record.expires_at.replace(tzinfo=timezone.utc)
    if now > auth_expires:
        auth_record.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voting authorization token has expired."
        )

    try:
        # Atomic execution of authorization consumption and ballot persistence
        # 1. Mark authorization as consumed
        auth_record.status = "consumed"
        
        # 2. Persist to spent_authorizations for durable replay prevention
        spent = SpentAuthorization(
            jti_hash=jti_hash,
            election_id=election_id,
            spent_at=now
        )
        db.add(spent)

        # 3. Calculate ballot commitment (SHA-256 of encrypted ballot payload)
        ballot_hash = sha256_hash(encrypted_vote)
        
        # Persist ballot without ANY voter identity
        ballot = Ballot(
            election_id=election_id,
            encrypted_vote=encrypted_vote,
            ballot_hash=ballot_hash,
            created_at=now
        )
        db.add(ballot)
        db.flush()  # Generates ballot.id

        # 4. Generate anonymous ballot receipt
        receipt_code = f"VC-REC-{secrets.token_hex(6).upper()}"
        receipt_hash = sha256_hash(receipt_code)
        receipt = VoteReceipt(
            receipt_code=receipt_code,
            receipt_hash=receipt_hash,
            ballot_id=ballot.id,
            election_id=election_id,
            created_at=now
        )
        db.add(receipt)
        db.flush()

        # 5. Commit ballot transaction to the private blockchain ledger
        new_block, tx = blockchain_manager.commit_ballot_to_block(db, ballot.id, ballot_hash)

        # Commit entire transaction atomically
        db.commit()

        return VoteSubmitResponse(
            status="SUCCESS",
            receipt_code=receipt_code,
            ballot_hash=ballot_hash,
            election_id=election_id,
            timestamp=now
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed during ballot ledger commitment: {str(e)}"
        )

def verify_receipt(db: Session, receipt_code: str) -> ReceiptVerificationResponse:
    """
    Allows a voter to verify inclusion of their ballot in the blockchain
    without revealing candidate choice or voter identity (SRS FR-14, TC-17).
    """
    receipt = db.query(VoteReceipt).filter(VoteReceipt.receipt_code == receipt_code).first()
    if not receipt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found. Please check your reference code."
        )

    ballot = receipt.ballot
    election = receipt.election

    # Find ledger block and transaction
    tx = ballot.transaction
    block_index = tx.block.block_index if tx and tx.block else None
    block_hash = tx.block.block_hash if tx and tx.block else None

    return ReceiptVerificationResponse(
        receipt_code=receipt.receipt_code,
        status="CONFIRMED_IN_LEDGER",
        election_id=receipt.election_id,
        election_title=election.title if election else "Election",
        ballot_hash=ballot.ballot_hash,
        block_index=block_index,
        block_hash=block_hash,
        timestamp=receipt.created_at
    )
