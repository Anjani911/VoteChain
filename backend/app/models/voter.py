import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Voter(Base):
    __tablename__ = "voters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False)
    academic_year = Column(String(20), nullable=False)

    # Relationships
    user = relationship("User", back_populates="voter_profile")
    eligibilities = relationship("VoterEligibility", back_populates="voter", cascade="all, delete-orphan")

class VoterEligibility(Base):
    __tablename__ = "voter_eligibility"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id = Column(String(36), ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    voter_id = Column(String(36), ForeignKey("voters.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False, default="eligible")  # "eligible", "authorized", "voted"
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    voter = relationship("Voter", back_populates="eligibilities")
    election = relationship("Election", back_populates="eligibilities")

    __table_args__ = (
        UniqueConstraint("election_id", "voter_id", name="uq_election_voter"),
    )
