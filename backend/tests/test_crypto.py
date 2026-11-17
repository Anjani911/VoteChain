import pytest
from app.core.security import hash_password, verify_password
from app.core.crypto import (
    sha256_hash,
    canonical_json,
    canonical_hash,
    derive_election_key,
    encrypt_ballot_payload,
    decrypt_ballot_payload
)

def test_argon2id_password_hashing():
    password = "SecureCollegePassword#2026"
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("$argon2id$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_canonical_json_and_sha256():
    # Test key ordering independence
    dict1 = {"b": 2, "a": 1, "c": [3, 4]}
    dict2 = {"a": 1, "c": [3, 4], "b": 2}
    assert canonical_json(dict1) == canonical_json(dict2)
    assert canonical_hash(dict1) == canonical_hash(dict2)

def test_aes_256_gcm_ballot_encryption():
    election_id = "test-election-uuid-1234"
    key = derive_election_key(election_id)
    assert len(key) == 32  # 256 bits

    payload = {
        "candidate_id": "candidate-aarav-sharma-uuid",
        "election_id": election_id,
        "nonce": "unique-random-nonce-123"
    }

    encrypted_b64 = encrypt_ballot_payload(payload, key)
    assert isinstance(encrypted_b64, str)
    assert encrypted_b64 != str(payload)

    # Decrypt and verify
    decrypted = decrypt_ballot_payload(encrypted_b64, key)
    assert decrypted["candidate_id"] == payload["candidate_id"]
    assert decrypted["election_id"] == payload["election_id"]

def test_aes_gcm_tamper_detection():
    # If encrypted data is modified, AES-GCM authentication tag verification must fail
    election_id = "election-tamper-check"
    key = derive_election_key(election_id)
    payload = {"candidate_id": "cand-1"}
    encrypted_b64 = encrypt_ballot_payload(payload, key)

    # Modify one byte in the base64 ciphertext
    tampered_bytes = bytearray(encrypted_b64.encode("utf-8"))
    tampered_bytes[15] = (tampered_bytes[15] + 1) % 256
    tampered_b64 = tampered_bytes.decode("utf-8", errors="ignore")

    with pytest.raises(ValueError):
        decrypt_ballot_payload(tampered_b64, key)
