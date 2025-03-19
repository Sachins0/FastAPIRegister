from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost/jobseeker"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)
    

class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp = Column(String)
    expires_at = Column(DateTime)