import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class VoteReceipt(Base):
    __tablename__ = "vote_receipts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    receipt_code = Column(String(64), unique=True, index=True, nullable=False)
    receipt_hash = Column(String(64), unique=True, index=True, nullable=False)
    ballot_id = Column(String(36), ForeignKey("ballots.id", ondelete="CASCADE"), unique=True, nullable=False)
    election_id = Column(String(36), ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    ballot = relationship("Ballot", back_populates="receipt")
    election = relationship("Election", back_populates="receipts")
