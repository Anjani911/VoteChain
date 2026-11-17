from typing import List, Optional
from pydantic import BaseModel

class CandidateResult(BaseModel):
    candidate_id: str
    name: str
    symbol: Optional[str] = None
    vote_count: int
    percentage: float

class ElectionResultsOut(BaseModel):
    election_id: str
    title: str
    status: str
    is_published: bool
    total_eligible: int
    total_votes_cast: int
    turnout_percentage: float
    candidate_results: List[CandidateResult] = []
