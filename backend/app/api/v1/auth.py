from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.voter import Voter
from app.schemas.auth import UserRegister, UserLogin, Token, UserProfile, AdminCreate
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_voter(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new college voter and creates their voter profile."""
    # Check if email already registered
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Check if student ID already registered
    existing_voter = db.query(Voter).filter(Voter.student_id == user_in.student_id).first()
    if existing_voter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A voter with this student ID already exists."
        )

    # Create User with Argon2id password hash
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role="voter",
        is_active=True
    )
    db.add(new_user)
    db.flush()

    # Create Voter profile
    voter_profile = Voter(
        user_id=new_user.id,
        student_id=user_in.student_id,
        department=user_in.department,
        academic_year=user_in.academic_year
    )
    db.add(voter_profile)
    db.commit()
    db.refresh(new_user)

    # Generate access token
    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=new_user.role,
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email
    )

@router.post("/register-admin", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_admin(admin_in: AdminCreate, db: Session = Depends(get_db)):
    """Creates an administrator account."""
    existing_user = db.query(User).filter(User.email == admin_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    admin_user = User(
        name=admin_in.name,
        email=admin_in.email,
        password_hash=hash_password(admin_in.password),
        role="admin",
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    access_token = create_access_token(subject=admin_user.id, role=admin_user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=admin_user.role,
        user_id=admin_user.id,
        name=admin_user.name,
        email=admin_user.email
    )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates voter or administrator using Argon2id."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        name=user.name,
        email=user.email
    )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return current_user
