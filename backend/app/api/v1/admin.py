from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.voter import Voter, VoterEligibility
from app.models.election import Election
from app.models.candidate import Candidate
from app.schemas.election import ElectionCreate, ElectionUpdate, ElectionOut
from app.schemas.candidate import CandidateCreate, CandidateOut
from app.schemas.voter import VoterOut, EligibilityAssignRequest, VoterEligibilityOut
from app.api.deps import get_current_admin
from app.services.audit_service import log_action

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.post("/elections", response_model=ElectionOut, status_code=status.HTTP_201_CREATED)
def create_election(
    election_in: ElectionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin creates a new election in 'draft' status."""
    if election_in.end_time <= election_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time."
        )

    election = Election(
        title=election_in.title,
        description=election_in.description,
        start_time=election_in.start_time,
        end_time=election_in.end_time,
        status="draft",
        created_by=admin.id
    )
    db.add(election)
    db.commit()
    db.refresh(election)

    log_action(db, "CREATE_ELECTION", actor_id=admin.id, metadata={"election_id": election.id, "title": election.title})

    return ElectionOut(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        created_by=election.created_by,
        created_at=election.created_at,
        candidates=[],
        total_eligible=0,
        total_voted=0
    )

@router.get("/elections", response_model=List[ElectionOut])
def list_elections(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin lists all elections with metadata and candidate details."""
    elections = db.query(Election).order_by(Election.created_at.desc()).all()
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

@router.get("/elections/{election_id}", response_model=ElectionOut)
def get_election(
    election_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin fetches details of a specific election."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    eligible_count = db.query(VoterEligibility).filter(VoterEligibility.election_id == election.id).count()
    voted_count = db.query(VoterEligibility).filter(
        VoterEligibility.election_id == election.id,
        VoterEligibility.status == "voted"
    ).count()

    candidates_out = [CandidateOut.model_validate(c) for c in election.candidates]
    return ElectionOut(
        id=election.id,
        title=election.title,
        description=election.description,
        start_time=election.start_time,
        end_time=election.end_time,
        status=election.status,
        created_by=election.created_by,
        created_at=election.created_at,
        candidates=candidates_out,
        total_eligible=eligible_count,
        total_voted=voted_count
    )

@router.put("/elections/{election_id}", response_model=ElectionOut)
def update_election(
    election_id: str,
    election_update: ElectionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin updates an election before activation."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    if election.status not in ["draft", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update an active, closed, or published election."
        )

    if election_update.title:
        election.title = election_update.title
    if election_update.description is not None:
        election.description = election_update.description
    if election_update.start_time:
        election.start_time = election_update.start_time
    if election_update.end_time:
        election.end_time = election_update.end_time

    if election.end_time <= election.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time."
        )

    db.commit()
    db.refresh(election)
    log_action(db, "UPDATE_ELECTION", actor_id=admin.id, metadata={"election_id": election.id})
    return get_election(election_id, db, admin)

@router.post("/elections/{election_id}/candidates", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def add_candidate(
    election_id: str,
    candidate_in: CandidateCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin adds a candidate to an election."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    if election.status not in ["draft", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add candidates once election is active or closed."
        )

    candidate = Candidate(
        election_id=election.id,
        name=candidate_in.name,
        manifesto=candidate_in.manifesto,
        symbol=candidate_in.symbol
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    log_action(db, "ADD_CANDIDATE", actor_id=admin.id, metadata={"election_id": election.id, "candidate_name": candidate.name})
    return CandidateOut.model_validate(candidate)

@router.get("/voters", response_model=List[VoterOut])
def list_registered_voters(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin lists all registered college voters to assign eligibility."""
    voters = db.query(Voter).join(User).all()
    out = []
    for v in voters:
        out.append(VoterOut(
            id=v.id,
            user_id=v.user_id,
            name=v.user.name,
            email=v.user.email,
            student_id=v.student_id,
            department=v.department,
            academic_year=v.academic_year
        ))
    return out

@router.post("/elections/{election_id}/voters")
def assign_eligible_voters(
    election_id: str,
    assign_req: EligibilityAssignRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin registers a list of voters as eligible for this election."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    if election.status in ["closed", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify eligibility for closed or published election."
        )

    added_count = 0
    for voter_id in assign_req.voter_ids:
        # Check if already eligible
        existing = db.query(VoterEligibility).filter(
            VoterEligibility.election_id == election_id,
            VoterEligibility.voter_id == voter_id
        ).first()
        if not existing:
            eligibility = VoterEligibility(
                election_id=election_id,
                voter_id=voter_id,
                status="eligible"
            )
            db.add(eligibility)
            added_count += 1

    db.commit()
    log_action(db, "ASSIGN_VOTERS", actor_id=admin.id, metadata={"election_id": election_id, "count": added_count})
    return {"message": f"Successfully registered {added_count} eligible voters for this election."}

@router.get("/elections/{election_id}/voters", response_model=List[VoterOut])
def get_eligible_voters_for_election(
    election_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin lists voters eligible for this specific election."""
    records = db.query(Voter).join(VoterEligibility, VoterEligibility.voter_id == Voter.id).filter(
        VoterEligibility.election_id == election_id
    ).all()
    out = []
    for v in records:
        out.append(VoterOut(
            id=v.id,
            user_id=v.user_id,
            name=v.user.name,
            email=v.user.email,
            student_id=v.student_id,
            department=v.department,
            academic_year=v.academic_year
        ))
    return out

@router.post("/elections/{election_id}/activate")
def activate_election(
    election_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin activates the election to allow voting."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    if election.status == "active":
        return {"message": "Election is already active."}

    if election.status in ["closed", "published"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reactivate closed or published election."
        )

    # Must have at least two candidates
    candidate_count = db.query(Candidate).filter(Candidate.election_id == election_id).count()
    if candidate_count < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An election must have at least 2 candidates before activation."
        )

    election.status = "active"
    db.commit()
    log_action(db, "ACTIVATE_ELECTION", actor_id=admin.id, metadata={"election_id": election.id})
    return {"message": f"Election '{election.title}' is now active."}

@router.post("/elections/{election_id}/close")
def close_election(
    election_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin closes an active election to halt ballot submission."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Election not found")

    if election.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close an election with status '{election.status}'. Only active elections can be closed."
        )

    election.status = "closed"
    db.commit()
    log_action(db, "CLOSE_ELECTION", actor_id=admin.id, metadata={"election_id": election.id})
    return {"message": f"Election '{election.title}' has been successfully closed."}
