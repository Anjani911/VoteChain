from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.election import Election
from app.models.user import User
from app.schemas.results import ElectionResultsOut, CandidateResult
from app.services.tally_service import compute_election_tally, publish_election_results
from app.api.deps import get_current_admin

router = APIRouter(tags=["Election Results & Tally"])

@router.get("/results/{election_id}", response_model=ElectionResultsOut)
def get_election_results(election_id: str, db: Session = Depends(get_db)):
    """
    Returns aggregate election results and candidate tallies once published.
    (FR-17, TC-19).
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found.")

    if election.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Results are withheld until election is officially closed and published by the administrator."
        )

    return compute_election_tally(db, election_id)

@router.get("/results/{election_id}/turnout")
def get_election_turnout(election_id: str, db: Session = Depends(get_db)):
    """Returns voter turnout percentage for published election."""
    results = get_election_results(election_id, db)
    return {
        "election_id": results.election_id,
        "total_eligible": results.total_eligible,
        "total_votes_cast": results.total_votes_cast,
        "turnout_percentage": results.turnout_percentage
    }

@router.get("/results/{election_id}/candidates", response_model=List[CandidateResult])
def get_candidate_results(election_id: str, db: Session = Depends(get_db)):
    """Returns candidate-wise breakdown for published election."""
    results = get_election_results(election_id, db)
    return results.candidate_results

@router.post("/admin/elections/{election_id}/publish", response_model=ElectionResultsOut)
def trigger_publish_results(
    election_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Admin triggers decryption, tally verification, and publication of election results.
    """
    return publish_election_results(db=db, election_id=election_id, admin_id=admin.id)
