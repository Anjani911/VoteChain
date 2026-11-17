import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Election(Base):
    __tablename__ = "elections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, default="draft")  # "draft", "scheduled", "active", "closed", "published"
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="created_elections")
    candidates = relationship("Candidate", back_populates="election", cascade="all, delete-orphan")
    eligibilities = relationship("VoterEligibility", back_populates="election", cascade="all, delete-orphan")
    ballots = relationship("Ballot", back_populates="election", cascade="all, delete-orphan")
    authorizations = relationship("VoteAuthorization", back_populates="election", cascade="all, delete-orphan")
    receipts = relationship("VoteReceipt", back_populates="election", cascade="all, delete-orphan")
