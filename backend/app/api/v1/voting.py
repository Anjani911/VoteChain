from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.voter import Voter
from app.schemas.voting import (
    AuthorizeResponse,
    VoteSubmitRequest,
    VoteSubmitResponse,
    ReceiptVerificationResponse
)
from app.api.deps import get_current_voter
from app.services.voting_service import (
    request_authorization,
    submit_ballot,
    verify_receipt
)

router = APIRouter(prefix="/voting", tags=["Voting & Ballot Submission"])

@router.post("/authorize/{election_id}", response_model=AuthorizeResponse)
def get_voting_authorization(
    election_id: str,
    db: Session = Depends(get_db),
    current_voter: Voter = Depends(get_current_voter)
):
    """
    Issues a short-lived, single-use voting authorization token to an eligible voter.
    (FR-07, FR-08).
    """
    return request_authorization(db=db, voter=current_voter, election_id=election_id)

@router.post("/submit", response_model=VoteSubmitResponse, status_code=status.HTTP_201_CREATED)
def cast_ballot(
    vote_request: VoteSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Submits an encrypted candidate ballot.
    Atomically consumes authorization token and records transaction into the blockchain ledger.
    NOTE: Voter identity is intentionally decoupled and absent from this request.
    (FR-09, FR-10, FR-11, FR-12).
    """
    return submit_ballot(
        db=db,
        election_id=vote_request.election_id,
        authorization_token=vote_request.authorization_token,
        encrypted_vote=vote_request.encrypted_vote
    )

@router.get("/receipt/{receipt_code}", response_model=ReceiptVerificationResponse)
def lookup_receipt(
    receipt_code: str,
    db: Session = Depends(get_db)
):
    """
    Verifies that a ballot was durably committed into the blockchain ledger.
    Returns block inclusion details. Does NOT leak candidate choice.
    (FR-14, TC-17, TC-18).
    """
    return verify_receipt(db=db, receipt_code=receipt_code)
