from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    tier = Column(String, default="free") # free or pro
    pro_since = Column(DateTime, nullable=True)
    pro_expires_at = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    tier = Column(String, default="pro")
    duration_days = Column(Integer, nullable=True)
    status = Column(String, default="active") # active, revoked, expired
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Usage(Base):
    __tablename__ = "usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    date = Column(String, index=True, nullable=False) # YYYY-MM-DD
    feature = Column(String, nullable=False)
    count = Column(Integer, default=1)
