from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from database import get_db
from models.db_models import User, License, Usage

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    name: str

class LicenseGenerateRequest(BaseModel):
    admin_password: str
    email: str
    duration_days: Optional[int] = None

class LicenseRevokeRequest(BaseModel):
    admin_password: str
    key: str

class TrackUsageRequest(BaseModel):
    email: str
    feature: str
    count: int = 1

ADMIN_PASSWORD = "ekam2024" # Hardcoded for simple admin auth

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalars().first()
    
    if not user:
        user = User(email=req.email.lower(), name=req.name)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Check expiration
    if user.tier == "pro" and user.pro_expires_at:
        if user.pro_expires_at.tzinfo is None:
            now = datetime.now()
        else:
            now = datetime.now(timezone.utc)
        if user.pro_expires_at < now:
            user.tier = "free"
            user.pro_expires_at = None
            user.pro_since = None
            await db.commit()

    return {
        "email": user.email,
        "name": user.name,
        "tier": user.tier,
        "proSince": user.pro_since.isoformat() if user.pro_since else None,
        "proExpiresAt": user.pro_expires_at.isoformat() if user.pro_expires_at else None,
        "isAdmin": user.is_admin
    }

@router.post("/admin/login")
async def admin_login(password: str):
    if password == ADMIN_PASSWORD:
        return {"status": "ok"}
    raise HTTPException(status_code=401, detail="Invalid admin password")

@router.get("/admin/licenses")
async def get_licenses(password: str, db: AsyncSession = Depends(get_db)):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    result = await db.execute(select(License).order_by(License.created_at.desc()))
    licenses = result.scalars().all()
    return [{
        "key": l.key,
        "email": l.email,
        "status": l.status,
        "createdAt": l.created_at.isoformat(),
        "durationDays": l.duration_days
    } for l in licenses]

def generate_key(email: str) -> str:
    salt = 'ekam_secret_salt_2026'
    string = email.strip().lower() + salt
    h = 0
    for char in string:
        h = (h << 5) - h + ord(char)
        h = h & h
    code = str(abs(h).to_bytes(4, 'big').hex()).upper().zfill(8)
    return f"EKAM-{code[:4]}-{code[4:8]}"

@router.post("/admin/license/generate")
async def generate_license(req: LicenseGenerateRequest, db: AsyncSession = Depends(get_db)):
    if req.admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    key = generate_key(req.email)
    
    # Check if exists
    result = await db.execute(select(License).where(License.key == key))
    existing = result.scalars().first()
    if existing:
        existing.status = "active"
        existing.duration_days = req.duration_days
    else:
        new_lic = License(key=key, email=req.email.lower(), duration_days=req.duration_days)
        db.add(new_lic)
        
    await db.commit()
    return {"key": key, "email": req.email}

@router.post("/admin/license/revoke")
async def revoke_license(req: LicenseRevokeRequest, db: AsyncSession = Depends(get_db)):
    if req.admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    result = await db.execute(select(License).where(License.key == req.key))
    lic = result.scalars().first()
    if lic:
        lic.status = "revoked"
        
        # Also downgrade user if they used this key
        u_result = await db.execute(select(User).where(User.email == lic.email))
        user = u_result.scalars().first()
        if user and user.tier == "pro":
            user.tier = "free"
            user.pro_expires_at = None
            
        await db.commit()
    return {"status": "ok"}

@router.post("/license/activate")
async def activate_license(email: str, key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(License).where(License.key == key, License.status == "active"))
    lic = result.scalars().first()
    if not lic or lic.email != email.lower():
        raise HTTPException(status_code=400, detail="Invalid or revoked license key")
        
    u_result = await db.execute(select(User).where(User.email == email.lower()))
    user = u_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please login first.")
        
    user.tier = "pro"
    user.pro_since = datetime.now(timezone.utc)
    if lic.duration_days:
        user.pro_expires_at = datetime.now(timezone.utc) + timedelta(days=lic.duration_days)
    else:
        user.pro_expires_at = None
        
    await db.commit()
    return {"status": "ok", "tier": "pro"}

@router.post("/usage/track")
async def track_usage(req: TrackUsageRequest, db: AsyncSession = Depends(get_db)):
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = await db.execute(
        select(Usage).where(Usage.user_email == req.email.lower(), Usage.date == date_str, Usage.feature == req.feature)
    )
    usage = result.scalars().first()
    
    if usage:
        usage.count += req.count
    else:
        usage = Usage(user_email=req.email.lower(), date=date_str, feature=req.feature, count=req.count)
        db.add(usage)
        
    await db.commit()
    return {"status": "ok", "count": usage.count}

@router.get("/usage")
async def get_usage(email: str, db: AsyncSession = Depends(get_db)):
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    result = await db.execute(select(Usage).where(Usage.user_email == email.lower(), Usage.date == date_str))
    usages = result.scalars().all()
    
    usage_dict = {
        "bulkWhatsApp": 0, "tts": 0, "stt": 0, "translate": 0, "pdfTools": 0, "qrCodes": 0
    }
    for u in usages:
        if u.feature in usage_dict:
            usage_dict[u.feature] = u.count
            
    return usage_dict
