import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Block(Base):
    __tablename__ = "blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_index = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    data_hash = Column(String(64), nullable=False)
    block_hash = Column(String(64), unique=True, index=True, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="block", cascade="all, delete-orphan", order_by="Transaction.created_at")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id = Column(String(36), ForeignKey("blocks.id", ondelete="CASCADE"), nullable=False)
    ballot_id = Column(String(36), ForeignKey("ballots.id", ondelete="CASCADE"), unique=True, nullable=False)
    transaction_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    block = relationship("Block", back_populates="transactions")
    ballot = relationship("Ballot", back_populates="transaction")
