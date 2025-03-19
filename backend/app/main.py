from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

from .models import User, OTP, Base, engine, SessionLocal
from .schemas import UserCreate, UserOut, Token, OTPVerify, OTPRequest

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Seeker Registration API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))


def send_otp_email(email, otp):
    message = MIMEMultipart()
    message["From"] = EMAIL_FROM
    message["To"] = email
    message["Subject"] = "Your OTP for Job Portal Registration"
    
    body = f"""
    <html>
      <body>
        <p>Hello,</p>
        <p>Your OTP for registration is: <strong>{otp}</strong></p>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </body>
    </html>
    """
    
    message.attach(MIMEText(body, "html"))
    
    try:
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, email, message.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

@app.post("/request-otp", response_model=dict)
async def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = get_user_by_email(db, request.email)
    if existing_user and existing_user.is_active is True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_otp = generate_otp()
    
    otp_record = OTP(
        email=request.email,
        otp=new_otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    
    db.query(OTP).filter(OTP.email == request.email).delete()
    
    db.add(otp_record)
    db.commit()
    
    if not send_otp_email(request.email, new_otp):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email"
        )
    
    return {"message": "OTP sent successfully to your email"}

@app.post("/verify-otp", response_model=dict)
async def verify_otp(verify_data: OTPVerify, db: Session = Depends(get_db)):
    otp_record = db.query(OTP).filter(OTP.email == verify_data.email, OTP.otp == verify_data.otp).first()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired"
        )
    
    db.delete(otp_record)
    db.commit()
    
    return {"message": "OTP verified successfully"}

@app.post("/register", response_model=UserOut)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user and existing_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_data.password)
    
    if existing_user:
        existing_user.full_name = user_data.full_name
        existing_user.hashed_password = hashed_password
        existing_user.is_active = True
        db.commit()
        db.refresh(existing_user)
        user = existing_user
    else:
        new_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user = new_user
    
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active
    )

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

@app.get("/users/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)