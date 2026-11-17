from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.candidate import CandidateOut

class ElectionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime

class ElectionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class ElectionOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str
    created_by: str
    created_at: datetime
    candidates: List[CandidateOut] = []
    total_eligible: int = 0
    total_voted: int = 0

    model_config = ConfigDict(from_attributes=True)
