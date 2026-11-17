import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Ballot(Base):
    __tablename__ = "ballots"

    # NOTE: Strictly no voter_id or student_id column exists here.
    # Anonymity guarantee: Separation of voter identity from ballot record.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id = Column(String(36), ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    encrypted_vote = Column(Text, nullable=False)
    ballot_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    election = relationship("Election", back_populates="ballots")
    transaction = relationship("Transaction", back_populates="ballot", uselist=False)
    receipt = relationship("VoteReceipt", back_populates="ballot", uselist=False)
