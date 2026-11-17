from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Union
from app.core.crypto import sha256_hash, canonical_json

GENESIS_PREVIOUS_HASH = "0" * 64

def format_canonical_timestamp(dt: Union[datetime, str]) -> str:
    """
    Produces deterministic canonical ISO-8601 timestamp string in UTC (ending with 'Z').
    Guarantees consistent hashing across SQLite, PostgreSQL, and Python versions.
    """
    if isinstance(dt, str):
        # If already formatted string
        if dt.endswith("Z"):
            return dt
        # Try parse
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

def calculate_transaction_hash(ballot_id: str, ballot_hash: str, timestamp_str: str) -> str:
    """Calculates canonical SHA-256 hash for a transaction."""
    tx_dict = {
        "ballot_id": ballot_id,
        "ballot_hash": ballot_hash,
        "timestamp": format_canonical_timestamp(timestamp_str)
    }
    return sha256_hash(canonical_json(tx_dict))

def calculate_data_hash(transactions: List[Dict[str, Any]]) -> str:
    """
    Calculates the data root hash for a block from its ordered transactions.
    If no transactions exist (e.g. Genesis), returns hash of empty list.
    """
    canonical_txs = []
    for tx in transactions:
        canonical_txs.append({
            "ballot_id": tx.get("ballot_id", ""),
            "ballot_hash": tx.get("ballot_hash", ""),
            "timestamp": format_canonical_timestamp(tx.get("timestamp", "")),
            "transaction_hash": tx.get("transaction_hash", "")
        })
    sorted_txs = sorted(canonical_txs, key=lambda t: t.get("transaction_hash", ""))
    return sha256_hash(canonical_json(sorted_txs))

def calculate_block_hash(block_index: int, timestamp_str: Union[str, datetime], data_hash: str, previous_hash: str) -> str:
    """
    Calculates canonical block hash according to the specification:
    block_hash = SHA256(canonical_json({index, timestamp, data_hash, previous_hash}))
    """
    block_payload = {
        "data_hash": data_hash,
        "index": block_index,
        "previous_hash": previous_hash,
        "timestamp": format_canonical_timestamp(timestamp_str)
    }
    return sha256_hash(canonical_json(block_payload))
