import pytest
from datetime import datetime, timezone
from app.models.blockchain import Block, Transaction
from app.models.ballot import Ballot
from app.models.election import Election
from app.models.user import User
from app.blockchain.chain import blockchain_manager
from app.blockchain.validator import chain_validator
from app.core.security import hash_password

def test_chain_validation_on_valid_ledger(db_session):
    # TC-16: Normal append flow produces a valid chain
    blockchain_manager.ensure_genesis_block(db_session)
    
    # Create an election & ballot
    user = User(name="Test Admin", email="admin_chain@college.edu", password_hash=hash_password("pass"), role="admin")
    db_session.add(user)
    db_session.flush()

    election = Election(
        title="Chain Test",
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc),
        status="active",
        created_by=user.id
    )
    db_session.add(election)
    db_session.flush()

    ballot1 = Ballot(election_id=election.id, encrypted_vote="test_vote_1", ballot_hash="hash_1")
    db_session.add(ballot1)
    db_session.flush()

    block1, tx1 = blockchain_manager.commit_ballot_to_block(db_session, ballot1.id, ballot1.ballot_hash)
    db_session.commit()

    val = chain_validator.validate_chain(db_session)
    assert val["is_valid"] is True
    assert val["total_blocks"] >= 2
    assert len(val["errors"]) == 0

def test_tamper_previous_hash_link(db_session):
    # TC-14: Alter previous_hash -> Validator reports broken hash link
    blockchain_manager.ensure_genesis_block(db_session)
    blocks = db_session.query(Block).order_by(Block.block_index.asc()).all()
    if len(blocks) < 2:
        # Create a block
        ballot = Ballot(election_id="e1", encrypted_vote="vote", ballot_hash="h1")
        db_session.add(ballot)
        db_session.flush()
        blockchain_manager.commit_ballot_to_block(db_session, ballot.id, ballot.ballot_hash)
        db_session.commit()
        blocks = db_session.query(Block).order_by(Block.block_index.asc()).all()

    # Tamper with block 1's previous_hash
    target_block = blocks[1]
    target_block.previous_hash = "deadbeef" * 8
    db_session.commit()

    val = chain_validator.validate_chain(db_session)
    assert val["is_valid"] is False
    assert any("Broken hash link" in err or "does not match prior block hash" in err for err in val["errors"])

def test_tamper_block_hash(db_session):
    # TC-15: Stored block hash mismatch
    blockchain_manager.ensure_genesis_block(db_session)
    genesis = db_session.query(Block).filter(Block.block_index == 0).first()
    original_hash = genesis.block_hash
    genesis.block_hash = "badhash" * 9 + "1"
    db_session.commit()

    val = chain_validator.validate_chain(db_session)
    assert val["is_valid"] is False
    assert any("Block hash integrity violation" in err for err in val["errors"])

    # Restore
    genesis.block_hash = original_hash
    db_session.commit()

def test_tamper_transaction_data_commitment(db_session):
    # TC-13: Block data tampering -> Validator reports data commitment mismatch
    blockchain_manager.ensure_genesis_block(db_session)
    ballot = Ballot(election_id="e_tamper", encrypted_vote="vote", ballot_hash="h_tamper")
    db_session.add(ballot)
    db_session.flush()
    block, tx = blockchain_manager.commit_ballot_to_block(db_session, ballot.id, ballot.ballot_hash)
    db_session.commit()

    # Tamper with the transaction's hash directly
    tx.transaction_hash = "tampered_tx_hash_" + "0" * 47
    db_session.commit()

    val = chain_validator.validate_chain(db_session)
    assert val["is_valid"] is False
    assert any("Data commitment mismatch" in err for err in val["errors"])
