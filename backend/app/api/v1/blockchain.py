from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.blockchain import Block, Transaction
from app.schemas.blockchain import (
    BlockOut,
    BlockDetailOut,
    TransactionOut,
    ChainValidationOut,
    BlockchainStatsOut
)
from app.blockchain.chain import blockchain_manager
from app.blockchain.validator import chain_validator

router = APIRouter(prefix="/blockchain", tags=["Blockchain Explorer & Integrity"])

@router.get("/chain", response_model=List[BlockOut])
def get_blockchain(db: Session = Depends(get_db)):
    """Returns the complete sequence of blocks with metadata."""
    blockchain_manager.ensure_genesis_block(db)
    blocks = db.query(Block).order_by(Block.block_index.asc()).all()
    out = []
    for b in blocks:
        out.append(BlockOut(
            id=b.id,
            block_index=b.block_index,
            timestamp=b.timestamp,
            previous_hash=b.previous_hash,
            data_hash=b.data_hash,
            block_hash=b.block_hash,
            transaction_count=len(b.transactions)
        ))
    return out

@router.get("/blocks/{block_index}", response_model=BlockDetailOut)
def get_block_by_index(block_index: int, db: Session = Depends(get_db)):
    """Returns details and committed transaction metadata for a block."""
    block = db.query(Block).filter(Block.block_index == block_index).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block with index {block_index} does not exist."
        )
    
    tx_out = [TransactionOut.model_validate(t) for t in block.transactions]
    return BlockDetailOut(
        id=block.id,
        block_index=block.block_index,
        timestamp=block.timestamp,
        previous_hash=block.previous_hash,
        data_hash=block.data_hash,
        block_hash=block.block_hash,
        transactions=tx_out
    )

@router.get("/validate", response_model=ChainValidationOut)
def validate_ledger_integrity(db: Session = Depends(get_db)):
    """
    Executes cryptographic verification across the entire blockchain ledger.
    Checks previous-hash links, block hashes, data hashes, and sequential indices.
    Detects any block tampering or data modifications.
    """
    blockchain_manager.ensure_genesis_block(db)
    validation_result = chain_validator.validate_chain(db)
    return ChainValidationOut(**validation_result)

@router.get("/stats", response_model=BlockchainStatsOut)
def get_blockchain_stats(db: Session = Depends(get_db)):
    """Returns aggregate statistics and health of the blockchain."""
    blockchain_manager.ensure_genesis_block(db)
    total_blocks = db.query(Block).count()
    total_txs = db.query(Transaction).count()
    latest_block = db.query(Block).order_by(Block.block_index.desc()).first()
    
    val = chain_validator.validate_chain(db)
    
    return BlockchainStatsOut(
        total_blocks=total_blocks,
        total_transactions=total_txs,
        latest_block_hash=latest_block.block_hash if latest_block else None,
        is_chain_valid=val["is_valid"]
    )

@router.get("/transactions/{transaction_hash}", response_model=TransactionOut)
def get_transaction_by_hash(transaction_hash: str, db: Session = Depends(get_db)):
    """Finds transaction metadata by its hash."""
    tx = db.query(Transaction).filter(Transaction.transaction_hash == transaction_hash).first()
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found in ledger."
        )
    return TransactionOut.model_validate(tx)
