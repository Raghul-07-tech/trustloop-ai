from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment variables
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
FILE_UPLOAD_PATH = os.environ.get('FILE_UPLOAD_PATH', '/app/backend/uploads')

# Ensure upload directory exists
Path(FILE_UPLOAD_PATH).mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============= MODELS =============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "Student"
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    uid: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str
    department: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FeedbackSubmit(BaseModel):
    category: str
    text: str
    evidence_urls: Optional[List[str]] = []

class Issue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    issue_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    summary: str
    original_text: str
    status: str = "Open"
    urgency_score: int = 0
    assigned_role: str
    frequency_count: int = 1
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    sla_deadline: str
    anon_token: str
    evidence_urls: Optional[List[str]] = []

class IssueUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    update_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_id: str
    role: str
    content_type: str
    content_text: Optional[str] = None
    content_url: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UpdateCreate(BaseModel):
    content_type: str
    content_text: Optional[str] = None

class EscalateRequest(BaseModel):
    reason: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

# ============= HELPER FUNCTIONS =============

def generate_anon_token(uid: str) -> str:
    """Generate anonymous token from user ID"""
    salt = datetime.now(timezone.utc).strftime("%Y%m%d")
    return hashlib.sha256(f"{uid}{salt}".encode()).hexdigest()[:12]

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(uid: str) -> str:
    """Create JWT token for user"""
    payload = {
        "uid": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    """Decode JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    payload = decode_jwt_token(credentials.credentials)
    user = await db.users.find_one({"uid": payload["uid"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def get_role_hierarchy(category: str) -> List[str]:
    """Get role hierarchy for a category"""
    hierarchies = {
        "Academics": ["Staff", "HoD", "Admin", "Principal"],
        "Hostel": ["Warden", "Admin", "Principal"],
        "Infrastructure": ["Staff", "Admin", "Principal"],
        "Food": ["Staff", "Admin", "Principal"],
        "Transportation": ["Staff", "Admin", "Principal"],
        "Other": ["Staff", "Admin", "Principal"]
    }
    return hierarchies.get(category, ["Staff", "Admin", "Principal"])

async def moderate_with_gemini(text: str) -> dict:
    """Moderate text using Gemini API"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message="You are a moderation assistant. Check feedback for abuse, threats, or inappropriate content. Rewrite in neutral professional tone. Provide urgency score 0-100."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Analyze this student feedback:

Text: "{text}"

Provide JSON response with:
1. is_appropriate: boolean (false if contains abuse/threats)
2. rewritten_text: neutral professional version
3. urgency_score: 0-100 (based on severity)
4. summary: brief 10-word summary

Respond ONLY with valid JSON."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        result = json.loads(response)
        return result
    except Exception as e:
        logging.error(f"Gemini moderation error: {e}")
        return {
            "is_appropriate": True,
            "rewritten_text": text,
            "urgency_score": 50,
            "summary": text[:100]
        }

# ============= ROUTES =============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register new user"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        department=user_data.department
    )
    
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    token = create_jwt_token(user.uid)
    
    return {
        "token": token,
        "user": {
            "uid": user.uid,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "department": user.department
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["uid"])
    
    return {
        "token": token,
        "user": {
            "uid": user["uid"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "department": user.get("department")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "name": current_user["name"],
        "role": current_user["role"],
        "department": current_user.get("department")
    }

@api_router.post("/feedback/submit")
async def submit_feedback(feedback: FeedbackSubmit, current_user: dict = Depends(get_current_user)):
    """Submit feedback (anonymous)"""
    if current_user["role"] != "Student":
        raise HTTPException(status_code=403, detail="Only students can submit feedback")
    
    # Moderate with Gemini
    moderation = await moderate_with_gemini(feedback.text)
    
    if not moderation["is_appropriate"]:
        raise HTTPException(status_code=400, detail="Feedback contains inappropriate content")
    
    # Check for similar issues
    existing_issues = await db.issues.find(
        {"category": feedback.category, "status": {"$ne": "Resolved"}},
        {"_id": 0}
    ).to_list(100)
    
    for existing in existing_issues:
        if moderation["summary"].lower() in existing["summary"].lower():
            await db.issues.update_one(
                {"issue_id": existing["issue_id"]},
                {"$inc": {"frequency_count": 1}}
            )
            return {"message": "Similar issue already reported", "issue_id": existing["issue_id"]}
    
    # Create new issue
    hierarchy = get_role_hierarchy(feedback.category)
    assigned_role = hierarchy[0] if hierarchy else "Staff"
    anon_token = generate_anon_token(current_user["uid"])
    sla_deadline = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    
    issue = Issue(
        category=feedback.category,
        summary=moderation["summary"],
        original_text=feedback.text,
        urgency_score=moderation["urgency_score"],
        assigned_role=assigned_role,
        sla_deadline=sla_deadline,
        anon_token=anon_token,
        evidence_urls=feedback.evidence_urls or []
    )
    
    issue_dict = issue.model_dump()
    await db.issues.insert_one(issue_dict)
    
    return {"message": "Feedback submitted successfully", "issue_id": issue.issue_id}

@api_router.get("/issues/my")
async def get_my_issues(current_user: dict = Depends(get_current_user)):
    """Get issues for current user role"""
    if current_user["role"] == "Student":
        anon_token = generate_anon_token(current_user["uid"])
        issues = await db.issues.find(
            {"anon_token": anon_token},
            {"_id": 0, "anon_token": 0}
        ).to_list(1000)
    else:
        query = {"assigned_role": current_user["role"]}
        if current_user["role"] == "Principal":
            query = {"status": "Escalated"}
        issues = await db.issues.find(query, {"_id": 0, "anon_token": 0}).to_list(1000)
    
    return {"issues": issues}

@api_router.get("/issues/all")
async def get_all_issues(current_user: dict = Depends(get_current_user)):
    """Get all issues (Admin/Principal only)"""
    if current_user["role"] not in ["Admin", "Principal"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    issues = await db.issues.find({}, {"_id": 0, "anon_token": 0}).to_list(1000)
    return {"issues": issues}

@api_router.get("/issues/{issue_id}")
async def get_issue(issue_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific issue details"""
    issue = await db.issues.find_one({"issue_id": issue_id}, {"_id": 0, "anon_token": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    updates = await db.issue_updates.find(
        {"issue_id": issue_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    return {"issue": issue, "updates": updates}

@api_router.post("/issues/{issue_id}/update")
async def add_update(issue_id: str, update: UpdateCreate, current_user: dict = Depends(get_current_user)):
    """Add update to issue"""
    if current_user["role"] == "Student":
        raise HTTPException(status_code=403, detail="Students cannot update issues")
    
    issue = await db.issues.find_one({"issue_id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue_update = IssueUpdate(
        issue_id=issue_id,
        role=current_user["role"],
        content_type=update.content_type,
        content_text=update.content_text
    )
    
    await db.issue_updates.insert_one(issue_update.model_dump())
    await db.issues.update_one(
        {"issue_id": issue_id},
        {"$set": {"status": "In Progress"}}
    )
    
    return {"message": "Update added successfully"}

@api_router.post("/issues/{issue_id}/escalate")
async def escalate_issue(issue_id: str, escalate_req: EscalateRequest, current_user: dict = Depends(get_current_user)):
    """Escalate issue to next level"""
    if current_user["role"] == "Student":
        raise HTTPException(status_code=403, detail="Students cannot escalate issues")
    
    issue = await db.issues.find_one({"issue_id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    hierarchy = get_role_hierarchy(issue["category"])
    current_index = hierarchy.index(issue["assigned_role"]) if issue["assigned_role"] in hierarchy else -1
    
    if current_index >= len(hierarchy) - 1:
        raise HTTPException(status_code=400, detail="Already at highest level")
    
    next_role = hierarchy[current_index + 1]
    
    await db.issues.update_one(
        {"issue_id": issue_id},
        {"$set": {"assigned_role": next_role, "status": "Escalated"}}
    )
    
    issue_update = IssueUpdate(
        issue_id=issue_id,
        role=current_user["role"],
        content_type="text",
        content_text=f"Escalated to {next_role}. Reason: {escalate_req.reason or 'Manual escalation'}"
    )
    await db.issue_updates.insert_one(issue_update.model_dump())
    
    return {"message": f"Issue escalated to {next_role}"}

@api_router.post("/issues/{issue_id}/status")
async def update_status(issue_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update issue status"""
    if current_user["role"] not in ["Admin", "Principal", "HoD", "Warden", "Staff"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.issues.update_one(
        {"issue_id": issue_id},
        {"$set": {"status": status_update.status}}
    )
    
    return {"message": "Status updated successfully"}

@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    total_issues = await db.issues.count_documents({})
    open_issues = await db.issues.count_documents({"status": "Open"})
    in_progress = await db.issues.count_documents({"status": "In Progress"})
    resolved = await db.issues.count_documents({"status": "Resolved"})
    escalated = await db.issues.count_documents({"status": "Escalated"})
    
    categories = await db.issues.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    return {
        "total_issues": total_issues,
        "open_issues": open_issues,
        "in_progress": in_progress,
        "resolved": resolved,
        "escalated": escalated,
        "categories": categories
    }

@api_router.post("/cron/check-escalation")
async def check_escalation():
    """Check and auto-escalate issues past SLA"""
    now = datetime.now(timezone.utc).isoformat()
    
    issues = await db.issues.find(
        {
            "status": {"$in": ["Open", "In Progress"]},
            "sla_deadline": {"$lt": now}
        },
        {"_id": 0}
    ).to_list(1000)
    
    escalated_count = 0
    for issue in issues:
        hierarchy = get_role_hierarchy(issue["category"])
        current_index = hierarchy.index(issue["assigned_role"]) if issue["assigned_role"] in hierarchy else -1
        
        if current_index < len(hierarchy) - 1:
            next_role = hierarchy[current_index + 1]
            
            await db.issues.update_one(
                {"issue_id": issue["issue_id"]},
                {"$set": {"assigned_role": next_role, "status": "Escalated"}}
            )
            
            issue_update = IssueUpdate(
                issue_id=issue["issue_id"],
                role="System",
                content_type="text",
                content_text=f"Auto-escalated to {next_role} due to SLA breach"
            )
            await db.issue_updates.insert_one(issue_update.model_dump())
            escalated_count += 1
    
    return {"escalated_count": escalated_count}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()