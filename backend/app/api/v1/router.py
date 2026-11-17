from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.admin import router as admin_router
from app.api.v1.voters import router as voters_router
from app.api.v1.voting import router as voting_router
from app.api.v1.blockchain import router as blockchain_router
from app.api.v1.results import router as results_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(admin_router)
api_router.include_router(voters_router)
api_router.include_router(voting_router)
api_router.include_router(blockchain_router)
api_router.include_router(results_router)
