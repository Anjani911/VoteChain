import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class VoteAuthorization(Base):
    __tablename__ = "vote_authorizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    election_id = Column(String(36), ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    jti_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    issued_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    status = Column(String(50), nullable=False, default="issued")  # "issued", "consumed", "expired"

    # Relationships
    election = relationship("Election", back_populates="authorizations")

class SpentAuthorization(Base):
    __tablename__ = "spent_authorizations"

    jti_hash = Column(String(64), primary_key=True, nullable=False)
    election_id = Column(String(36), ForeignKey("elections.id", ondelete="CASCADE"), nullable=False)
    spent_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
