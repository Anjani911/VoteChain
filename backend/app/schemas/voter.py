from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class VoterOut(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    student_id: str
    department: str
    academic_year: str

class VoterEligibilityOut(BaseModel):
    id: str
    election_id: str
    voter_id: str
    status: str  # "eligible", "authorized", "voted"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EligibilityAssignRequest(BaseModel):
    voter_ids: List[str]

class VoterElectionStatusOut(BaseModel):
    election_id: str
    is_eligible: bool
    status: Optional[str] = None
    can_vote: bool
