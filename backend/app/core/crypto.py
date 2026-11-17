import hashlib
import json
import base64
import os
from typing import Any, Dict, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from app.config import settings

def sha256_hash(data: Union[str, bytes]) -> str:
    """Calculates SHA-256 digest in hex format."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def canonical_json(data: Any) -> str:
    """
    Produces deterministic canonical JSON serialization:
    Sorted keys, compact separators, no indentation.
    Prevents hash mismatches due to whitespace or key ordering differences.
    """
    return json.dumps(data, sort_keys=True, separators=(",", ":"))

def canonical_hash(data: Any) -> str:
    """Calculates SHA-256 hash of canonically serialized JSON."""
    return sha256_hash(canonical_json(data))

def derive_election_key(election_id: str) -> bytes:
    """
    Derives an election-specific 256-bit (32-byte) key using HKDF-SHA256
    from the master encryption key and the election ID as info context.
    Ensures key isolation across different elections.
    """
    master_bytes = bytes.fromhex(settings.MASTER_ENCRYPTION_KEY) if len(settings.MASTER_ENCRYPTION_KEY) == 64 else settings.MASTER_ENCRYPTION_KEY.encode()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"votechain_election_salt_v1",
        info=f"election_{election_id}".encode("utf-8")
    )
    return hkdf.derive(master_bytes)

def encrypt_ballot_payload(payload: Union[Dict, str], key: bytes) -> str:
    """
    Encrypts a ballot payload using AES-256-GCM.
    Generates a unique 96-bit (12-byte) nonce per encryption.
    Produces authenticated ciphertext containing nonce + ciphertext + tag.
    Returns base64 encoded string.
    """
    if isinstance(payload, dict):
        plaintext = canonical_json(payload).encode("utf-8")
    else:
        plaintext = payload.encode("utf-8")

    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # Standard 96-bit IV for AES-GCM
    # In AESGCM.encrypt(nonce, data, associated_data), tag is appended to ciphertext
    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, None)
    
    # Combined payload: 12-byte nonce + (ciphertext + 16-byte tag)
    combined = nonce + ciphertext_and_tag
    return base64.b64encode(combined).decode("utf-8")

def decrypt_ballot_payload(encrypted_b64: str, key: bytes) -> Dict[str, Any]:
    """
    Decrypts an AES-256-GCM encrypted ballot payload.
    Validates authenticity via GCM tag and returns decrypted JSON dictionary.
    Raises ValueError if decryption or authentication fails.
    """
    try:
        raw_combined = base64.b64decode(encrypted_b64.encode("utf-8"))
        if len(raw_combined) < 12 + 16:  # Nonce (12) + Tag (16)
            raise ValueError("Encrypted ballot payload is too short.")
        
        nonce = raw_combined[:12]
        ciphertext_and_tag = raw_combined[12:]
        
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext_and_tag, None)
        return json.loads(decrypted_bytes.decode("utf-8"))
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")
