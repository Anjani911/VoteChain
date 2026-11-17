from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AuthorizeResponse(BaseModel):
    authorization_token: str
    election_id: str
    expires_at: datetime
    message: str = "One-time authorization granted. Must be consumed before expiration."

class VoteSubmitRequest(BaseModel):
    election_id: str
    authorization_token: str
    encrypted_vote: str = Field(..., description="Base64 encoded AES-256-GCM ciphertext payload")

class VoteSubmitResponse(BaseModel):
    status: str
    receipt_code: str
    ballot_hash: str
    election_id: str
    timestamp: datetime
    message: str = "Ballot successfully encrypted, verified, and committed to the blockchain."

class ReceiptVerificationResponse(BaseModel):
    receipt_code: str
    status: str  # e.g., "CONFIRMED_IN_LEDGER"
    election_id: str
    election_title: str
    ballot_hash: str
    block_index: Optional[int] = None
    block_hash: Optional[str] = None
    timestamp: datetime
    # Intentionally excludes candidate choice and voter identity
