import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from app.models.election import Election
from app.models.candidate import Candidate
from app.models.voter import Voter, VoterEligibility
from app.models.user import User
from app.core.security import hash_password
from app.core.crypto import derive_election_key, encrypt_ballot_payload
from app.api.v1.voting import get_voting_authorization, cast_ballot
from app.api.v1.admin import close_election
from app.api.v1.results import get_election_results, trigger_publish_results
from app.schemas.voting import VoteSubmitRequest

def test_tc19_and_tc20_election_closure_and_tally(db_session):
    now = datetime.now(timezone.utc)
    
    # Create Admin
    admin = User(name="Tally Admin", email=f"tally_admin_{now.timestamp()}@college.edu", password_hash=hash_password("pass"), role="admin")
    db_session.add(admin)
    db_session.flush()

    # Create Election
    election = Election(
        title="Tally Test Election",
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(hours=1),
        status="active",
        created_by=admin.id
    )
    db_session.add(election)
    db_session.flush()

    c1 = Candidate(election_id=election.id, name="Candidate Alpha", symbol="Star")
    c2 = Candidate(election_id=election.id, name="Candidate Beta", symbol="Sun")
    db_session.add_all([c1, c2])
    db_session.flush()

    # Create 3 voters
    voters = []
    for i in range(3):
        u = User(name=f"V{i}", email=f"v_{i}_{now.timestamp()}@college.edu", password_hash=hash_password("pass"), role="voter")
        db_session.add(u)
        db_session.flush()
        v = Voter(user_id=u.id, student_id=f"S-{i}-{now.timestamp()}", department="CSE", academic_year="3")
        db_session.add(v)
        db_session.flush()
        elig = VoterEligibility(election_id=election.id, voter_id=v.id, status="eligible")
        db_session.add(elig)
        voters.append(v)
    
    db_session.commit()

    election_key = derive_election_key(election.id)

    # Cast 2 votes for Candidate Alpha, 1 vote for Candidate Beta
    # Vote 1 (Alpha)
    r1 = get_voting_authorization(election.id, db_session, voters[0])
    enc_vote1 = encrypt_ballot_payload({"candidate_id": c1.id, "nonce": "n1"}, election_key)
    s1 = cast_ballot(VoteSubmitRequest(election_id=election.id, authorization_token=r1.authorization_token, encrypted_vote=enc_vote1), db_session)
    assert s1.status == "SUCCESS"

    # Vote 2 (Alpha)
    r2 = get_voting_authorization(election.id, db_session, voters[1])
    enc_vote2 = encrypt_ballot_payload({"candidate_id": c1.id, "nonce": "n2"}, election_key)
    s2 = cast_ballot(VoteSubmitRequest(election_id=election.id, authorization_token=r2.authorization_token, encrypted_vote=enc_vote2), db_session)
    assert s2.status == "SUCCESS"

    # Vote 3 (Beta)
    r3 = get_voting_authorization(election.id, db_session, voters[2])
    enc_vote3 = encrypt_ballot_payload({"candidate_id": c2.id, "nonce": "n3"}, election_key)
    s3 = cast_ballot(VoteSubmitRequest(election_id=election.id, authorization_token=r3.authorization_token, encrypted_vote=enc_vote3), db_session)
    assert s3.status == "SUCCESS"

    # TC-19: Request results before closure must be withheld
    with pytest.raises(HTTPException) as exc_info:
        get_election_results(election.id, db_session)
    assert exc_info.value.status_code == 400
    assert "withheld until election is officially closed" in exc_info.value.detail

    # Close election as admin
    close_res = close_election(election.id, db_session, admin)
    assert "successfully closed" in close_res["message"]

    # Publish results as admin
    tally_data = trigger_publish_results(election.id, db_session, admin)

    # TC-20: Correct tally verification
    assert tally_data.total_eligible == 3
    assert tally_data.total_votes_cast == 3
    assert tally_data.turnout_percentage == 100.0

    # Verify candidate vote counts: c1 got 2, c2 got 1
    c_results = {r.candidate_id: r.vote_count for r in tally_data.candidate_results}
    assert c_results[c1.id] == 2
    assert c_results[c2.id] == 1
