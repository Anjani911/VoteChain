from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.voter import Voter, VoterEligibility
from app.models.election import Election
from app.models.candidate import Candidate
from app.core.security import hash_password
from app.blockchain.chain import blockchain_manager

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Initialize Genesis block
        blockchain_manager.ensure_genesis_block(db)

        # 2. Create Admin user if not exists
        admin = db.query(User).filter(User.email == "admin@college.edu").first()
        if not admin:
            admin = User(
                name="College Election Administrator",
                email="admin@college.edu",
                password_hash=hash_password("Admin@123456"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("Created Admin: admin@college.edu / Admin@123456")
        else:
            print("Admin already exists.")

        # 3. Create synthetic college voters
        synthetic_voters = [
            ("Alice Johnson", "alice@college.edu", "CS2026-001", "Computer Science & Engineering", "3rd Year"),
            ("Bob Smith", "bob@college.edu", "CS2026-002", "Computer Science & Engineering", "3rd Year"),
            ("Charlie Brown", "charlie@college.edu", "IT2026-003", "Information Technology", "3rd Year"),
            ("Daisy Miller", "daisy@college.edu", "EC2026-004", "Electronics & Communication", "3rd Year"),
            ("Ethan Davis", "ethan@college.edu", "ME2026-005", "Mechanical Engineering", "3rd Year"),
        ]

        created_voters = []
        for name, email, student_id, dept, year in synthetic_voters:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    name=name,
                    email=email,
                    password_hash=hash_password("Voter@123456"),
                    role="voter",
                    is_active=True
                )
                db.add(user)
                db.flush()

                voter_profile = Voter(
                    user_id=user.id,
                    student_id=student_id,
                    department=dept,
                    academic_year=year
                )
                db.add(voter_profile)
                db.commit()
                db.refresh(voter_profile)
                created_voters.append(voter_profile)
                print(f"Created Voter: {email} / Voter@123456 (Student ID: {student_id})")
            else:
                voter_profile = db.query(Voter).filter(Voter.user_id == user.id).first()
                created_voters.append(voter_profile)

        # 4. Create Active Election: Student Council President 2026
        active_election = db.query(Election).filter(Election.title == "Student Council President Election 2026").first()
        now = datetime.now(timezone.utc)
        if not active_election:
            active_election = Election(
                title="Student Council President Election 2026",
                description="Annual election for the college-wide Student Council President. Every registered voter can cast one anonymous encrypted ballot.",
                start_time=now - timedelta(hours=2),
                end_time=now + timedelta(days=2),
                status="active",
                created_by=admin.id
            )
            db.add(active_election)
            db.commit()
            db.refresh(active_election)

            # Candidates
            c1 = Candidate(election_id=active_election.id, name="Aarav Sharma", manifesto="Upgraded computer labs, 24/7 library study hours & seamless campus Wi-Fi.", symbol="Torch")
            c2 = Candidate(election_id=active_election.id, name="Priya Patel", manifesto="Expanded tech fests, inter-college hackathons & student mental wellness center.", symbol="Book")
            c3 = Candidate(election_id=active_election.id, name="Rohan Gupta", manifesto="Alumni mentorship network, enhanced sports facilities & placement prep bootcamp.", symbol="Rocket")
            db.add_all([c1, c2, c3])
            db.commit()

            # Assign all synthetic voters as eligible
            for v in created_voters:
                elig = VoterEligibility(
                    election_id=active_election.id,
                    voter_id=v.id,
                    status="eligible"
                )
                db.add(elig)
            db.commit()
            print("Created Active Election with candidates and eligible voters.")
        else:
            print("Active election already exists.")

        print("\n=== SEED DATA INITIALIZATION COMPLETED ===")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
