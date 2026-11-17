import pytest
from fastapi import HTTPException
from app.schemas.auth import UserRegister, UserLogin, AdminCreate
from app.api.v1.auth import register_voter, register_admin, login
from app.api.deps import get_current_admin
from app.models.user import User

def test_voter_registration_and_login(db_session):
    # Register new voter
    reg_data = UserRegister(
        name="Sarah Connor",
        email="sarah@college.edu",
        password="Password123!",
        student_id="CS2026-999",
        department="CSE",
        academic_year="3rd Year"
    )
    token = register_voter(reg_data, db_session)
    assert token.role == "voter"
    assert token.email == "sarah@college.edu"
    assert len(token.access_token) > 20

    # TC-01: Valid voter login
    login_data = UserLogin(email="sarah@college.edu", password="Password123!")
    login_res = login(login_data, db_session)
    assert login_res.access_token is not None
    assert login_res.user_id == token.user_id

    # TC-02: Invalid password rejected
    with pytest.raises(HTTPException) as exc_info:
        login(UserLogin(email="sarah@college.edu", password="WrongPassword!"), db_session)
    assert exc_info.value.status_code == 401

def test_role_enforcement(db_session):
    # TC-03: Voter calling admin-only check must raise 403 Forbidden
    reg_data = UserRegister(
        name="John Doe",
        email="john@college.edu",
        password="Password123!",
        student_id="CS2026-888",
        department="CSE",
        academic_year="2nd Year"
    )
    token = register_voter(reg_data, db_session)
    voter_user = db_session.query(User).filter(User.id == token.user_id).first()

    with pytest.raises(HTTPException) as exc_info:
        get_current_admin(current_user=voter_user)
    assert exc_info.value.status_code == 403
    assert "Administrative privileges required" in exc_info.value.detail

def test_admin_creation_and_login(db_session):
    admin_in = AdminCreate(
        name="Prof. Administrator",
        email="prof_admin@college.edu",
        password="AdminPassword123!"
    )
    token = register_admin(admin_in, db_session)
    assert token.role == "admin"
    admin_user = db_session.query(User).filter(User.id == token.user_id).first()
    verified_admin = get_current_admin(current_user=admin_user)
    assert verified_admin.role == "admin"
