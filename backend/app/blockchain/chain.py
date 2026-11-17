from datetime import datetime, timezone
from typing import Tuple, Optional, List
from sqlalchemy.orm import Session
from app.models.blockchain import Block, Transaction
from app.blockchain.block import (
    GENESIS_PREVIOUS_HASH,
    calculate_transaction_hash,
    calculate_data_hash,
    calculate_block_hash
)

class BlockchainManager:
    """Manages the private custom Python blockchain."""

    @staticmethod
    def ensure_genesis_block(db: Session) -> Block:
        """
        Checks for the genesis block (index 0).
        If missing, creates and persists it to the database.
        """
        genesis = db.query(Block).filter(Block.block_index == 0).first()
        if not genesis:
            # Fixed epoch timestamp for deterministic genesis or UTC now
            now_dt = datetime.now(timezone.utc)
            data_hash = calculate_data_hash([])
            block_hash = calculate_block_hash(
                block_index=0,
                timestamp_str=now_dt,
                data_hash=data_hash,
                previous_hash=GENESIS_PREVIOUS_HASH
            )
            genesis = Block(
                block_index=0,
                timestamp=now_dt,
                previous_hash=GENESIS_PREVIOUS_HASH,
                data_hash=data_hash,
                block_hash=block_hash
            )
            db.add(genesis)
            db.commit()
            db.refresh(genesis)
        return genesis

    @staticmethod
    def get_latest_block(db: Session) -> Block:
        """Returns the highest-index block in the chain."""
        BlockchainManager.ensure_genesis_block(db)
        latest = db.query(Block).order_by(Block.block_index.desc()).first()
        return latest

    @staticmethod
    def commit_ballot_to_block(db: Session, ballot_id: str, ballot_hash: str) -> Tuple[Block, Transaction]:
        """
        Atomically commits an accepted encrypted ballot to the blockchain ledger.
        Creates a new block linked to the latest block hash,
        persisting both the block and the transaction record.
        """
        # Ensure genesis block exists
        latest = BlockchainManager.get_latest_block(db)
        
        new_index = latest.block_index + 1
        now_dt = datetime.now(timezone.utc)
        
        # Calculate transaction hash
        tx_hash = calculate_transaction_hash(ballot_id, ballot_hash, now_dt)
        
        # Calculate data hash from this transaction
        tx_dict = {
            "ballot_id": ballot_id,
            "ballot_hash": ballot_hash,
            "timestamp": now_dt,
            "transaction_hash": tx_hash
        }
        data_hash = calculate_data_hash([tx_dict])
        
        # Calculate block hash
        block_hash = calculate_block_hash(
            block_index=new_index,
            timestamp_str=now_dt,
            data_hash=data_hash,
            previous_hash=latest.block_hash
        )
        
        # Create block entity
        new_block = Block(
            block_index=new_index,
            timestamp=now_dt,
            previous_hash=latest.block_hash,
            data_hash=data_hash,
            block_hash=block_hash
        )
        db.add(new_block)
        db.flush()  # Generate new_block.id
        
        # Create transaction entity
        tx = Transaction(
            block_id=new_block.id,
            ballot_id=ballot_id,
            transaction_hash=tx_hash,
            created_at=now_dt
        )
        db.add(tx)
        db.flush()
        
        return new_block, tx

blockchain_manager = BlockchainManager()
