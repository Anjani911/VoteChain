from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CandidateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    manifesto: Optional[str] = None
    symbol: Optional[str] = None

class CandidateOut(BaseModel):
    id: str
    election_id: str
    name: str
    manifesto: Optional[str] = None
    symbol: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
