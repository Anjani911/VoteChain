from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.voter import Voter, VoterEligibility
from app.models.election import Election
from app.models.candidate import Candidate
from app.schemas.auth import VoterProfileOut
from app.schemas.election import ElectionOut
from app.schemas.candidate import CandidateOut
from app.schemas.voter import VoterElectionStatusOut
from app.api.deps import get_current_voter

router = APIRouter(prefix="/voters", tags=["Voter Services"])

@router.get("/me", response_model=VoterProfileOut)
def get_voter_profile(current_voter: Voter = Depends(get_current_voter)):
    """Returns voter's college profile."""
    return VoterProfileOut.model_validate(current_voter)

@router.get("/elections", response_model=List[ElectionOut])
def get_eligible_elections(
    db: Session = Depends(get_db),
    current_voter: Voter = Depends(get_current_voter)
):
    """
    Displays only elections for which the authenticated voter is registered as eligible.
    (SRS FR-06 requirement).
    """
    eligibilities = db.query(VoterEligibility).filter(
        VoterEligibility.voter_id == current_voter.id
    ).all()
    
    election_ids = [e.election_id for e in eligibilities]
    elections = db.query(Election).filter(Election.id.in_(election_ids)).order_by(Election.created_at.desc()).all()
    
    results = []
    for e in elections:
        eligible_count = db.query(VoterEligibility).filter(VoterEligibility.election_id == e.id).count()
        voted_count = db.query(VoterEligibility).filter(
            VoterEligibility.election_id == e.id,
            VoterEligibility.status == "voted"
        ).count()
        candidates_out = [CandidateOut.model_validate(c) for c in e.candidates]
        results.append(ElectionOut(
            id=e.id,
            title=e.title,
            description=e.description,
            start_time=e.start_time,
            end_time=e.end_time,
            status=e.status,
            created_by=e.created_by,
            created_at=e.created_at,
            candidates=candidates_out,
            total_eligible=eligible_count,
            total_voted=voted_count
        ))
    return results

@router.get("/elections/{election_id}/status", response_model=VoterElectionStatusOut)
def get_voter_election_status(
    election_id: str,
    db: Session = Depends(get_db),
    current_voter: Voter = Depends(get_current_voter)
):
    """
    Returns voter's eligibility and participation status for an election.
    Does NOT leak ballot choice.
    """
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    eligibility = db.query(VoterEligibility).filter(
        VoterEligibility.election_id == election_id,
        VoterEligibility.voter_id == current_voter.id
    ).first()

    if not eligibility:
        return VoterElectionStatusOut(
            election_id=election_id,
            is_eligible=False,
            status=None,
            can_vote=False
        )

    can_vote = (
        eligibility.status in ["eligible", "authorized"] and 
        election.status == "active"
    )

    return VoterElectionStatusOut(
        election_id=election_id,
        is_eligible=True,
        status=eligibility.status,
        can_vote=can_vote
    )

@router.get("/elections/{election_id}/candidates", response_model=List[CandidateOut])
def get_election_candidates(
    election_id: str,
    db: Session = Depends(get_db),
    current_voter: Voter = Depends(get_current_voter)
):
    """Returns candidate list for an eligible election."""
    # Check eligibility first
    eligibility = db.query(VoterEligibility).filter(
        VoterEligibility.election_id == election_id,
        VoterEligibility.voter_id == current_voter.id
    ).first()
    if not eligibility:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not eligible to view this election."
        )

    candidates = db.query(Candidate).filter(Candidate.election_id == election_id).all()
    return [CandidateOut.model_validate(c) for c in candidates]
