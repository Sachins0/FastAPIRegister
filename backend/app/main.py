# Backend (FastAPI) - main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import BaseModel, EmailStr, SecretStr
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import secrets
import os

# Database setup
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:pass@localhost/jobseeker")
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)

class OTPStorage(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp = Column(String)
    expires_at = Column(DateTime)

Base.metadata.create_all(bind=engine)

# Security setup
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Email config
# Updated email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=SecretStr(os.getenv("MAIL_PASSWORD"," ")),
    MAIL_FROM=os.getenv("MAIL_FROM","tony.stankexpo@gmail.com"),
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,    # Enable STARTTLS
    MAIL_SSL_TLS=False,    # Disable SSL/TLS
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

# Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str

app = FastAPI()


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_otp():
    return str(secrets.randbelow(10**6)).zfill(6)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Routes

@app.get("/")
def abc():
    return "hey"

@app.post("/signup")
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        is_active=False,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    
    # Generate and store OTP
    otp_code = create_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    new_otp = OTPStorage(
        email=user.email,
        otp=otp_code,
        expires_at=otp_expiry
    )
    db.add(new_otp)
    db.commit()
    
    # Send OTP via email
    message = MessageSchema(
    subject="Your Verification OTP",
    recipients=[user.email],
    body=f"Your OTP is: {otp_code}",
    subtype=MessageType.html  # or MessageType.plain for plain text
)
    fm = FastMail(conf)
    await fm.send_message(message)
    
    return {"message": "OTP sent to email"}

@app.post("/verify-otp")
async def verify_otp(otp_data: OTPVerify, db: Session = Depends(get_db)):
    db_otp = db.query(OTPStorage).filter(
        OTPStorage.email == otp_data.email,
        OTPStorage.otp == otp_data.otp,
        OTPStorage.expires_at >= datetime.utcnow()
    ).first()
    
    if not db_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Activate user
    user = db.query(User).filter(User.email == otp_data.email).first()
    if user:
        user.is_verified = True
        user.is_active = True
        db.delete(db_otp)
        db.commit()
    
    return {"message": "Account verified successfully"}

@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Account not verified"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}