from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TransactionOut(BaseModel):
    id: str
    block_id: str
    ballot_id: str
    transaction_hash: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BlockOut(BaseModel):
    id: str
    block_index: int
    timestamp: datetime
    previous_hash: str
    data_hash: str
    block_hash: str
    transaction_count: int

    model_config = ConfigDict(from_attributes=True)

class BlockDetailOut(BaseModel):
    id: str
    block_index: int
    timestamp: datetime
    previous_hash: str
    data_hash: str
    block_hash: str
    transactions: List[TransactionOut] = []

    model_config = ConfigDict(from_attributes=True)

class ChainValidationOut(BaseModel):
    is_valid: bool
    total_blocks: int
    errors: List[str] = []
    details: List[Dict[str, Any]] = []

class BlockchainStatsOut(BaseModel):
    total_blocks: int
    total_transactions: int
    latest_block_hash: Optional[str] = None
    is_chain_valid: bool
