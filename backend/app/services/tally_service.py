from typing import Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.election import Election
from app.models.voter import VoterEligibility
from app.models.candidate import Candidate
from app.models.ballot import Ballot
from app.core.crypto import derive_election_key, decrypt_ballot_payload
from app.schemas.results import ElectionResultsOut, CandidateResult
from app.services.audit_service import log_action

def compute_election_tally(db: Session, election_id: str) -> ElectionResultsOut:
    """
    Decryption and tally service:
    Executes authorized decryption of encrypted ballots only after election closure.
    Computes aggregate candidate totals and turnout percentages.
    (FR-16, FR-17).
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found."
        )

    # FR-16 & TC-19: Must be closed or published
    if election.status not in ["closed", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot tally election with status '{election.status}'. Election must be closed first."
        )

    # Derive election key for authenticated decryption
    election_key = derive_election_key(election_id)

    # Fetch candidates
    candidates = db.query(Candidate).filter(Candidate.election_id == election_id).all()
    candidate_map = {c.id: c for c in candidates}
    candidate_counts: Dict[str, int] = {c.id: 0 for c in candidates}

    # Fetch all encrypted ballots
    ballots = db.query(Ballot).filter(Ballot.election_id == election_id).all()
    valid_votes = 0

    for ballot in ballots:
        try:
            payload = decrypt_ballot_payload(ballot.encrypted_vote, election_key)
            selected_candidate_id = payload.get("candidate_id")
            if selected_candidate_id in candidate_counts:
                candidate_counts[selected_candidate_id] += 1
                valid_votes += 1
        except Exception:
            # Corrupted/invalid ballot payload skipped in tally
            continue

    # Turnout calculations
    total_eligible = db.query(VoterEligibility).filter(VoterEligibility.election_id == election_id).count()
    turnout_pct = (valid_votes / total_eligible * 100.0) if total_eligible > 0 else 0.0

    candidate_results: List[CandidateResult] = []
    for cand_id, cand_obj in candidate_map.items():
        count = candidate_counts[cand_id]
        pct = (count / valid_votes * 100.0) if valid_votes > 0 else 0.0
        candidate_results.append(CandidateResult(
            candidate_id=cand_id,
            name=cand_obj.name,
            symbol=cand_obj.symbol,
            vote_count=count,
            percentage=round(pct, 2)
        ))

    # Sort results by vote_count descending
    candidate_results.sort(key=lambda r: r.vote_count, reverse=True)

    return ElectionResultsOut(
        election_id=election.id,
        title=election.title,
        status=election.status,
        is_published=(election.status == "published"),
        total_eligible=total_eligible,
        total_votes_cast=valid_votes,
        turnout_percentage=round(turnout_pct, 2),
        candidate_results=candidate_results
    )

def publish_election_results(db: Session, election_id: str, admin_id: str) -> ElectionResultsOut:
    """
    Admin triggers publication of finalized results.
    Transitions status to 'published' and records audit log.
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found."
        )

    if election.status != "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish election with status '{election.status}'. Election must be closed before publishing."
        )

    election.status = "published"
    db.commit()

    log_action(db, "PUBLISH_RESULTS", actor_id=admin_id, metadata={"election_id": election_id})

    return compute_election_tally(db, election_id)
