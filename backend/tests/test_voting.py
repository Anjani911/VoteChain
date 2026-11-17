import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.models.ballot import Ballot
from app.models.election import Election
from app.models.candidate import Candidate
from app.models.voter import Voter, VoterEligibility
from app.models.user import User
from app.core.security import hash_password
from app.core.crypto import derive_election_key, encrypt_ballot_payload
from app.api.v1.voting import get_voting_authorization, cast_ballot, lookup_receipt
from app.schemas.voting import VoteSubmitRequest

def setup_election_and_voter(db_session, election_status="active", make_eligible=True):
    now = datetime.now(timezone.utc)
    
    # Admin
    admin = User(name="Admin", email=f"adm_{now.timestamp()}@college.edu", password_hash=hash_password("pass"), role="admin")
    db_session.add(admin)
    db_session.flush()

    # Election
    election = Election(
        title=f"Election {now.timestamp()}",
        description="Voting test election",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=2),
        status=election_status,
        created_by=admin.id
    )
    db_session.add(election)
    db_session.flush()

    # Candidates
    c1 = Candidate(election_id=election.id, name="Candidate Alpha", symbol="Star")
    c2 = Candidate(election_id=election.id, name="Candidate Beta", symbol="Sun")
    db_session.add_all([c1, c2])
    db_session.flush()

    # Voter
    v_user = User(name="Voter Test", email=f"voter_{now.timestamp()}@college.edu", password_hash=hash_password("pass"), role="voter")
    db_session.add(v_user)
    db_session.flush()

    voter = Voter(user_id=v_user.id, student_id=f"STU-{now.timestamp()}", department="CSE", academic_year="3rd")
    db_session.add(voter)
    db_session.flush()

    if make_eligible:
        elig = VoterEligibility(election_id=election.id, voter_id=voter.id, status="eligible")
        db_session.add(elig)

    db_session.commit()
    return election, [c1, c2], voter

def test_tc12_ballot_identity_separation(db_session):
    # TC-12: Inspect ballot schema: strictly NO voter_id or student_id stored
    from sqlalchemy import inspect
    mapper = inspect(Ballot)
    column_names = [col.name for col in mapper.columns]
    assert "voter_id" not in column_names
    assert "student_id" not in column_names
    assert "user_id" not in column_names

def test_tc04_ineligible_voter(db_session):
    # TC-04: User not on election eligibility list
    election, candidates, voter = setup_election_and_voter(db_session, make_eligible=False)

    with pytest.raises(HTTPException) as exc_info:
        get_voting_authorization(election_id=election.id, db=db_session, current_voter=voter)
    assert exc_info.value.status_code == 403
    assert "not registered as eligible" in exc_info.value.detail

def test_tc05_election_not_active(db_session):
    # TC-05: Election before start time / in draft state
    election, candidates, voter = setup_election_and_voter(db_session, election_status="draft")

    with pytest.raises(HTTPException) as exc_info:
        get_voting_authorization(election_id=election.id, db=db_session, current_voter=voter)
    assert exc_info.value.status_code == 400
    assert "not active" in exc_info.value.detail

def test_tc07_first_valid_vote_and_tc08_replay_rejection(db_session):
    # TC-07: First valid vote -> exactly one ballot accepted, receipt returned
    election, candidates, voter = setup_election_and_voter(db_session, election_status="active")

    # 1. Authorize
    auth_resp = get_voting_authorization(election_id=election.id, db=db_session, current_voter=voter)
    auth_token = auth_resp.authorization_token
    assert len(auth_token) > 20

    # 2. Encrypt ballot using election key
    election_key = derive_election_key(election.id)
    ballot_payload = {
        "candidate_id": candidates[0].id,
        "election_id": election.id,
        "nonce": "test_nonce_123"
    }
    encrypted_vote = encrypt_ballot_payload(ballot_payload, election_key)

    # 3. Submit ballot (Notice: no voter identity, bearer token not needed)
    submit_req = VoteSubmitRequest(
        election_id=election.id,
        authorization_token=auth_token,
        encrypted_vote=encrypted_vote
    )
    submit_data = cast_ballot(submit_req, db_session)
    assert submit_data.status == "SUCCESS"
    receipt_code = submit_data.receipt_code
    assert receipt_code.startswith("VC-REC-")

    # TC-08: Replay same token must be rejected
    with pytest.raises(HTTPException) as exc_info:
        cast_ballot(submit_req, db_session)
    assert exc_info.value.status_code == 400
    assert "already been consumed" in exc_info.value.detail

    # TC-17: Receipt lookup
    rec_data = lookup_receipt(receipt_code=receipt_code, db=db_session)
    assert rec_data.status == "CONFIRMED_IN_LEDGER"
    assert rec_data.election_id == election.id
    assert rec_data.ballot_hash == submit_data.ballot_hash
    # Crucial security assertion: receipt must NOT contain candidate or vote choice
    assert not hasattr(rec_data, "candidate_id")

    # TC-18: Unknown receipt lookup
    with pytest.raises(HTTPException) as exc_not_found:
        lookup_receipt("VC-REC-NONEXISTENT", db_session)
    assert exc_not_found.value.status_code == 404

def test_tc11_wrong_election_token(db_session):
    # TC-11: Token issued for election A submitted to election B
    e1, c1, v1 = setup_election_and_voter(db_session)
    e2, c2, v2 = setup_election_and_voter(db_session)

    # Authorize for e1
    auth_resp = get_voting_authorization(election_id=e1.id, db=db_session, current_voter=v1)
    auth_token = auth_resp.authorization_token

    # Submit to e2
    submit_req = VoteSubmitRequest(
        election_id=e2.id,
        authorization_token=auth_token,
        encrypted_vote="dummy_vote"
    )
    with pytest.raises(HTTPException) as exc_info:
        cast_ballot(submit_req, db_session)
    assert exc_info.value.status_code == 400
    assert "not valid for this election" in exc_info.value.detail
