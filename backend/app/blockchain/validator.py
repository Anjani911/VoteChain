from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.blockchain import Block, Transaction
from app.blockchain.block import (
    GENESIS_PREVIOUS_HASH,
    calculate_data_hash,
    calculate_block_hash
)

class ChainValidator:
    """Verifies cryptographic integrity of the private blockchain ledger."""

    @staticmethod
    def validate_chain(db: Session) -> Dict[str, Any]:
        """
        Validates:
        1. Genesis block integrity and zero-hash previous link.
        2. Sequential block indices (0, 1, 2, ...).
        3. Cryptographic link integrity: block[i].previous_hash == block[i-1].block_hash.
        4. Block hash integrity: recalculates SHA-256 canonical hash of block metadata.
        5. Data integrity: verifies data_hash against committed transactions.
        """
        blocks = db.query(Block).order_by(Block.block_index.asc()).all()
        errors: List[str] = []
        details: List[Dict[str, Any]] = []

        if not blocks:
            return {
                "is_valid": False,
                "total_blocks": 0,
                "errors": ["Blockchain is empty. No genesis block found."],
                "details": []
            }

        prev_block_hash = GENESIS_PREVIOUS_HASH

        for i, block in enumerate(blocks):
            block_errors: List[str] = []
            
            # 1. Check sequential index
            if block.block_index != i:
                err = f"Block index sequence mismatch: Expected {i}, found {block.block_index}."
                errors.append(err)
                block_errors.append(err)

            # 2. Check previous_hash link
            if block.block_index == 0:
                if block.previous_hash != GENESIS_PREVIOUS_HASH:
                    err = f"Genesis block previous_hash must be {GENESIS_PREVIOUS_HASH}, found {block.previous_hash}."
                    errors.append(err)
                    block_errors.append(err)
            else:
                if block.previous_hash != prev_block_hash:
                    err = (
                        f"Broken hash link at block {block.block_index}: "
                        f"previous_hash '{block.previous_hash}' does not match prior block hash '{prev_block_hash}'."
                    )
                    errors.append(err)
                    block_errors.append(err)

            # 3. Verify block_hash calculation
            recalculated_block_hash = calculate_block_hash(
                block_index=block.block_index,
                timestamp_str=block.timestamp,
                data_hash=block.data_hash,
                previous_hash=block.previous_hash
            )
            if recalculated_block_hash != block.block_hash:
                err = (
                    f"Block hash integrity violation at block {block.block_index}: "
                    f"Stored '{block.block_hash}', calculated '{recalculated_block_hash}'."
                )
                errors.append(err)
                block_errors.append(err)

            # 4. Verify transaction data commitment
            tx_dicts = []
            for tx in block.transactions:
                tx_dicts.append({
                    "ballot_id": tx.ballot_id,
                    "ballot_hash": tx.ballot.ballot_hash if tx.ballot else "",
                    "timestamp": tx.created_at,
                    "transaction_hash": tx.transaction_hash
                })
            
            recalculated_data_hash = calculate_data_hash(tx_dicts)
            if recalculated_data_hash != block.data_hash:
                err = (
                    f"Data commitment mismatch at block {block.block_index}: "
                    f"Stored data_hash '{block.data_hash}', calculated '{recalculated_data_hash}'."
                )
                errors.append(err)
                block_errors.append(err)

            details.append({
                "block_index": block.block_index,
                "block_hash": block.block_hash,
                "previous_hash": block.previous_hash,
                "data_hash": block.data_hash,
                "transaction_count": len(block.transactions),
                "is_valid": len(block_errors) == 0,
                "errors": block_errors
            })

            prev_block_hash = block.block_hash

        is_valid = len(errors) == 0
        return {
            "is_valid": is_valid,
            "total_blocks": len(blocks),
            "errors": errors,
            "details": details
        }

chain_validator = ChainValidator()
