# VoteChain: Secure Blockchain-Based College Voting System

**Academic Session:** 2026–2027 | Department of Computer Science & Engineering  
**Project Guide:** Dr. Keshika Jangde  
**Technology Stack:** React + TypeScript + Vite + Tailwind CSS | Python + FastAPI + SQLAlchemy + Alembic + PostgreSQL | Custom Python Blockchain (SHA-256) | AES-256-GCM Encryption | Argon2id Hashing  

---

## 1. System Overview

VoteChain is an academic prototype for controlled college elections. It addresses vulnerabilities in traditional student voting (such as ballot tampering, replay attacks, duplicate votes, and lack of verifiability) through a **custom private hash-linked blockchain** and **cryptographic identity separation**.

### Key Modules & Capabilities
1. **Voter Registration & Authentication:** Argon2id password hashing, JWT Bearer tokens, student verification.
2. **Admin Portal & Election Lifecycle:** Draft → Scheduled → Active → Closed → Published.
3. **Candidate & Voter Eligibility Management:** Per-election eligibility assignment (SRS FR-04, FR-06).
4. **One-Person-One-Vote Enforcement:** Short-lived single-use authorization tokens (`jti_hash`), atomic consumption, durable replay prevention via `spent_authorizations`.
5. **Decoupled Encrypted Ballot:** Client-side AES-256-GCM encryption; strictly **no** `voter_id`, `student_id`, or `user_id` in the `ballots` record.
6. **Custom Python Blockchain:** Genesis block (Index #0), sequential indexing, SHA-256 previous-block linking, canonical JSON serialization.
7. **Real-time Ledger Integrity Verification:** Recalculates previous-hash links, block hashes, and transaction commitments; detects any data alteration or chain break.
8. **Anonymous Receipt Inclusion Verification:** Voter receives `VC-REC-...` code to verify ledger confirmation without revealing their candidate choice.
9. **Authorized Post-Closure Tally:** Ballot decryption occurs strictly after election closure by an authorized admin; results published with candidate totals and turnout percentages.

---

## 2. Project Folder Structure

```
votechain/
├── backend/
│   ├── alembic/                      # Alembic database migrations
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 7587940866bf_initial_schema.py
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py               # Authentication & authorization dependencies
│   │   │   └── v1/
│   │   │       ├── admin.py          # Admin management routes
│   │   │       ├── auth.py           # Registration & login routes
│   │   │       ├── blockchain.py     # Blockchain explorer & validation API
│   │   │       ├── results.py        # Tally & results endpoints
│   │   │       ├── router.py         # Consolidated API v1 router
│   │   │       ├── voters.py         # Voter eligible election services
│   │   │       └── voting.py         # One-time authorization & ballot submission
│   │   ├── blockchain/
│   │   │   ├── block.py              # Canonical block & transaction hashing
│   │   │   ├── chain.py              # Blockchain ledger manager & block creation
│   │   │   └── validator.py          # Cryptographic integrity validator & tamper detection
│   │   ├── core/
│   │   │   ├── crypto.py             # AES-256-GCM, SHA-256, HKDF key derivation
│   │   │   └── security.py           # Argon2id password hashing & JWT token handling
│   │   ├── models/                   # SQLAlchemy database models
│   │   │   ├── audit.py              # Sanitized administrative audit logs
│   │   │   ├── authorization.py      # One-time and spent voting authorizations
│   │   │   ├── ballot.py             # Encrypted ballots (strictly NO voter identity)
│   │   │   ├── blockchain.py         # Blocks and transactions tables
│   │   │   ├── candidate.py          # Nominees and manifestos
│   │   │   ├── election.py           # Election state machine & schedule
│   │   │   ├── receipt.py            # Anonymous voter receipt codes
│   │   │   ├── user.py               # User accounts (Admin / Voter)
│   │   │   └── voter.py              # Student voter profiles & eligibility mapping
│   │   ├── schemas/                  # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── audit_service.py      # Sanitized audit logging
│   │   │   ├── tally_service.py      # Post-closure ballot decryption & counting
│   │   │   └── voting_service.py     # Atomic authorization & ballot commitment
│   │   ├── config.py                 # Application configuration & environment settings
│   │   ├── database.py               # Database engine & session setup (PostgreSQL / SQLite)
│   │   ├── main.py                   # FastAPI entrypoint & CORS middleware
│   │   └── seed.py                   # College demonstration seed data
│   ├── tests/
│   │   ├── conftest.py               # Isolated in-memory test database fixture
│   │   ├── test_auth.py              # TC-01, TC-02, TC-03 (Argon2id & RBAC tests)
│   │   ├── test_blockchain.py        # Custom blockchain unit tests
│   │   ├── test_crypto.py            # AES-256-GCM & SHA-256 cryptographic tests
│   │   ├── test_results_tally.py     # TC-19, TC-20 (Tally correctness & closure tests)
│   │   ├── test_tamper_detection.py  # TC-13, TC-14, TC-15, TC-16 (Tamper detection tests)
│   │   └── test_voting.py            # TC-04, TC-05, TC-07, TC-08, TC-11, TC-12, TC-17, TC-18
│   ├── alembic.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts             # API client & Web Crypto AES-256-GCM encryptor
│   │   ├── components/
│   │   │   ├── Alert.tsx             # Responsive notifications & banners
│   │   │   ├── Navbar.tsx            # Navigation bar with role badges
│   │   │   └── ProtectedRoute.tsx    # Role-based route guard
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Authentication state context
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx    # Admin elections overview & quick creation
│   │   │   ├── BlockchainExplorer.tsx# Visual blocks timeline & cryptographic audit
│   │   │   ├── CastVote.tsx          # Candidate selection, encryption & receipt display
│   │   │   ├── ElectionDetailAdmin.tsx# Nominees, eligibility assignment & state control
│   │   │   ├── Login.tsx             # Sign in with 1-click demo fills
│   │   │   ├── ReceiptVerification.tsx# Anonymous ballot receipt verification
│   │   │   ├── Register.tsx          # Student voter profile registration
│   │   │   ├── ResultsView.tsx       # Live turnout & candidate vote percentages
│   │   │   └── VoterDashboard.tsx    # Eligible elections display
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript definitions
│   │   ├── App.tsx                   # App router configuration
│   │   ├── index.css                 # Tailwind CSS directives
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 3. Demonstration Credentials

Pre-seeded accounts are available immediately for demonstration:

| Role | Name | Email | Password | Details |
|------|------|-------|----------|---------|
| **Administrator** | College Election Administrator | `admin@college.edu` | `Admin@123456` | Full administrative access |
| **Voter #1** | Alice Johnson | `alice@college.edu` | `Voter@123456` | Student ID: `CS2026-001`, CSE, 3rd Year |
| **Voter #2** | Bob Smith | `bob@college.edu` | `Voter@123456` | Student ID: `CS2026-002`, CSE, 3rd Year |
| **Voter #3** | Charlie Brown | `charlie@college.edu` | `Voter@123456` | Student ID: `IT2026-003`, IT, 3rd Year |
| **Voter #4** | Daisy Miller | `daisy@college.edu` | `Voter@123456` | Student ID: `EC2026-004`, ECE, 3rd Year |
| **Voter #5** | Ethan Davis | `ethan@college.edu` | `Voter@123456` | Student ID: `ME2026-005`, ME, 3rd Year |

*Note: The login screen contains **One-Click Quick Fill** buttons for Alice and the Administrator for instant demonstration.*

---

## 4. Setup & Execution Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ (tested on Node v22)
- PostgreSQL (optional: uses default SQLite database out-of-the-box for instant zero-config evaluation)

### Step 1: Backend Setup
```bash
cd backend

# Create virtual environment (optional)
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and populate demo seed data
python -m app.seed

# Start the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The backend API documentation is available at `http://localhost:8000/docs`.*

### Step 2: Frontend Setup
In a new terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
*Open `http://localhost:5173` in your browser.*

### Configuring PostgreSQL (Optional)
To use a dedicated PostgreSQL database instead of the local SQLite database, set the environment variable:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/votechain"
# Windows PowerShell:
$env:DATABASE_URL="postgresql://username:password@localhost:5432/votechain"

# Apply migrations
alembic upgrade head
python -m app.seed
```

---

## 5. Automated Test Suite

Run the complete test suite verifying functional requirements, security boundaries, and blockchain tamper detection:
```bash
cd backend
python -m pytest -v
```

### Test Coverage Highlights:
- **TC-01 & TC-02:** Valid voter login and rejected invalid password (Argon2id verification).
- **TC-03:** Role-Based Access Control (voter calling admin endpoint raises `403 Forbidden`).
- **TC-04:** Ineligible voter authorization rejection.
- **TC-05 & TC-06:** Inactive and closed election ballot rejection.
- **TC-07:** Valid vote acceptance, AES-256-GCM encryption, and receipt issuance.
- **TC-08 & TC-09:** Token replay attack rejection (spent token cannot be reused).
- **TC-11:** Wrong-election token rejection.
- **TC-12:** Ballot identity separation (strict verification that `ballots` table has NO `voter_id` or `student_id`).
- **TC-13, TC-14, TC-15, TC-16:** Cryptographic chain validation and tamper detection (detects altered data commitments, modified previous-hash links, and invalid block hashes).
- **TC-17 & TC-18:** Anonymous receipt lookup (receipt does not disclose candidate choice).
- **TC-19 & TC-20:** Premature result withholding and authorized post-closure tally accuracy.

---

## 6. End-to-End Demonstration Walkthrough

1. **Login as Voter:**
   - Go to `http://localhost:5173/login`.
   - Click "Voter: Alice" quick-fill button and submit.
   - You are redirected to the **Voter Dashboard** displaying "Annual Student Council President Election 2026".
2. **Cast Encrypted Ballot:**
   - Click "Cast Anonymous Ballot".
   - Select a candidate (e.g. *Aarav Sharma* or *Priya Patel*).
   - Click "Review & Cast Vote" → Confirm.
   - The browser encrypts the choice using AES-256-GCM, requests a single-use token, and commits the ballot.
   - An anonymous **Receipt Reference Code** (e.g. `VC-REC-XXXX-XXXX`) is displayed. Copy it.
3. **Verify Receipt Inclusion:**
   - Go to "Check Receipt" in the navigation bar.
   - Paste the receipt code.
   - The system displays the confirmed block index, block hash, and SHA-256 ballot commitment, with zero voter or candidate details revealed.
4. **Inspect Blockchain Explorer:**
   - Open the "Blockchain Explorer".
   - View the newly created block linked to the previous block hash.
   - Click "Run Cryptographic Audit" to verify the entire ledger.
5. **Admin Closure & Tally:**
   - Log out and log in as Administrator (`admin@college.edu`).
   - Open the election in the Admin Portal.
   - Click "Close Election", then click "Decrypt, Tally & Publish".
   - View the published election results showing candidate vote totals, turnout percentage, and declared winner.
