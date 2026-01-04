# TrustLoop AI - Technical Documentation

## System Architecture

### Overview
TrustLoop AI is a full-stack web application built with:
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB + Motor (async)
- **AI**: Google Gemini via EmergentIntegrations
- **Storage**: Firebase Storage
- **Auth**: JWT-based authentication

---

## Core Components

### 1. Authentication System

**Flow:**
```
User → Register/Login → JWT Token → Protected Routes
```

**Implementation:**
- BCrypt password hashing
- JWT token with 7-day expiry
- Bearer token authentication
- Role-based access control

**Code Reference:**
- `/backend/server.py` - Auth endpoints
- `/frontend/src/context/AuthContext.jsx` - Auth state management

---

### 2. Anonymity System

**Mechanism:**
```python
anon_token = SHA256(uid + daily_salt)[:12]
```

**Why It Works:**
- One-way hash (non-reversible)
- Daily salt rotation
- No UID stored in issues
- Database admin cannot reverse

**Identity Firewall:**
- Users collection: Contains identity
- Issues collection: Contains anon_token only
- No cross-reference possible

**Code Reference:**
- `/backend/server.py` - `generate_anon_token()`

---

### 3. AI Moderation (Gemini)

**Purpose:**
- Content filtering (abuse/threats)
- Writing style neutralization
- Urgency scoring (0-100)
- Content summarization

**Implementation:**
```python
chat = LlmChat(
    api_key=EMERGENT_LLM_KEY,
    session_id=uuid,
    system_message="Moderation prompt"
).with_model("gemini", "gemini-3-flash-preview")

response = await chat.send_message(UserMessage(text=prompt))
```

**Output:**
```json
{
  "is_appropriate": true,
  "rewritten_text": "Neutral version",
  "urgency_score": 75,
  "summary": "Brief summary"
}
```

**Code Reference:**
- `/backend/server.py` - `moderate_with_gemini()`

---

### 4. Hierarchical Resolution

**Category-Based Hierarchy:**
```python
hierarchies = {
    "Academics": ["Staff", "HoD", "Admin", "Principal"],
    "Hostel": ["Warden", "Admin", "Principal"],
    "Infrastructure": ["Staff", "Admin", "Principal"],
    "Food": ["Staff", "Admin", "Principal"],
    "Transportation": ["Staff", "Admin", "Principal"],
    "Other": ["Staff", "Admin", "Principal"]
}
```

**Escalation Logic:**
```python
current_index = hierarchy.index(assigned_role)
next_role = hierarchy[current_index + 1]
```

**Code Reference:**
- `/backend/server.py` - `get_role_hierarchy()`
- `/backend/server.py` - `escalate_issue()`

---

### 5. Auto-Escalation

**Mechanism:**
- 2-day SLA for each issue
- Cron job checks SLA breach
- Automatic escalation to next role
- System update logged

**Implementation:**
```python
if issue.sla_deadline < now and issue.status != "Resolved":
    next_role = get_next_in_hierarchy(issue.assigned_role)
    issue.assigned_role = next_role
    issue.status = "Escalated"
```

**API Endpoint:**
- `POST /api/cron/check-escalation`

**Code Reference:**
- `/backend/server.py` - `check_escalation()`

---

### 6. Firebase Storage Integration

**Purpose:**
- Evidence images from students
- Voice updates from staff

**Implementation:**
```javascript
// File Upload
const downloadURL = await uploadFileToFirebase(file, "evidence");

// Audio Upload
const downloadURL = await uploadAudioToFirebase(audioBlob);
```

**Storage Structure:**
```
/evidence/{timestamp}_{filename}
/audio/{timestamp}_recording.webm
```

**Code Reference:**
- `/frontend/src/services/firebaseStorage.js`
- `/frontend/src/config/firebase.js`

---

## API Documentation

### Authentication Endpoints

**POST /api/auth/register**
```json
Request:
{
  "email": "student@college.edu",
  "password": "password123",
  "name": "John Doe",
  "role": "Student",
  "department": "Computer Science"
}

Response:
{
  "token": "jwt_token",
  "user": {
    "uid": "uuid",
    "email": "student@college.edu",
    "name": "John Doe",
    "role": "Student"
  }
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "student@college.edu",
  "password": "password123"
}

Response:
{
  "token": "jwt_token",
  "user": {...}
}
```

**GET /api/auth/me**
```
Headers: Authorization: Bearer {token}

Response:
{
  "uid": "uuid",
  "email": "student@college.edu",
  "name": "John Doe",
  "role": "Student"
}
```

---

### Feedback Endpoints

**POST /api/feedback/submit**
```json
Headers: Authorization: Bearer {token}

Request:
{
  "category": "Academics",
  "text": "Feedback text",
  "evidence_urls": ["firebase_url"]
}

Response:
{
  "message": "Feedback submitted successfully",
  "issue_id": "uuid"
}
```

---

### Issues Endpoints

**GET /api/issues/my**
```
Headers: Authorization: Bearer {token}

Response:
{
  "issues": [
    {
      "issue_id": "uuid",
      "category": "Academics",
      "summary": "Brief summary",
      "status": "Open",
      "urgency_score": 75,
      "assigned_role": "Staff",
      "frequency_count": 1,
      "created_at": "ISO_date",
      "sla_deadline": "ISO_date"
    }
  ]
}
```

**GET /api/issues/{issue_id}**
```
Headers: Authorization: Bearer {token}

Response:
{
  "issue": {...},
  "updates": [
    {
      "update_id": "uuid",
      "role": "Staff",
      "content_type": "text",
      "content_text": "Update text",
      "timestamp": "ISO_date"
    }
  ]
}
```

**POST /api/issues/{issue_id}/update**
```json
Headers: Authorization: Bearer {token}

Request:
{
  "content_type": "text",
  "content_text": "Progress update"
}

Response:
{
  "message": "Update added successfully"
}
```

**POST /api/issues/{issue_id}/escalate**
```json
Headers: Authorization: Bearer {token}

Request:
{
  "reason": "Manual escalation reason"
}

Response:
{
  "message": "Issue escalated to HoD"
}
```

**POST /api/issues/{issue_id}/status**
```json
Headers: Authorization: Bearer {token}

Request:
{
  "status": "Resolved"
}

Response:
{
  "message": "Status updated successfully"
}
```

---

### Dashboard Endpoints

**GET /api/stats/dashboard**
```
Headers: Authorization: Bearer {token}

Response:
{
  "total_issues": 100,
  "open_issues": 25,
  "in_progress": 30,
  "resolved": 40,
  "escalated": 5,
  "categories": [
    {"_id": "Academics", "count": 50},
    {"_id": "Hostel", "count": 30}
  ]
}
```

---

## Frontend Components

### Pages
- `/pages/Login.jsx` - Authentication UI
- `/pages/StudentDashboard.jsx` - Student feedback submission
- `/pages/StaffDashboard.jsx` - Staff issue management
- `/pages/AdminDashboard.jsx` - Admin overview
- `/pages/IssueDetails.jsx` - Issue detail view

### Context
- `/context/AuthContext.jsx` - Auth state management

### Services
- `/services/api.js` - API calls
- `/services/firebaseStorage.js` - Firebase uploads
- `/config/firebase.js` - Firebase config

---

## Database Schema

### MongoDB Collections

**users**
```javascript
{
  _id: ObjectId,
  uid: "uuid",
  email: "string",
  name: "string",
  role: "Student|Staff|HoD|Warden|Admin|Principal",
  department: "string",
  password: "hashed",
  created_at: "ISO_date"
}
```

**issues**
```javascript
{
  _id: ObjectId,
  issue_id: "uuid",
  category: "string",
  summary: "string",
  original_text: "string",
  status: "Open|In Progress|Escalated|Resolved",
  urgency_score: 0-100,
  assigned_role: "string",
  frequency_count: number,
  sla_deadline: "ISO_date",
  anon_token: "hashed",
  evidence_urls: ["string"],
  created_at: "ISO_date"
}
```

**issue_updates**
```javascript
{
  _id: ObjectId,
  update_id: "uuid",
  issue_id: "uuid",
  role: "string",
  content_type: "text|audio",
  content_text: "string",
  timestamp: "ISO_date"
}
```

---

## Security Considerations

### 1. Authentication
- JWT tokens with expiry
- BCrypt password hashing (10 rounds)
- Bearer token validation on all protected routes

### 2. Anonymity
- Cryptographic hash for anonymous tokens
- No UID in issues collection
- Daily salt rotation
- No IP/device logging

### 3. Authorization
- Role-based access control
- Students can only submit feedback
- Staff/Admin can update issues
- Principal sees escalated issues only

### 4. Data Protection
- MongoDB ObjectId excluded from responses
- Passwords never exposed in API
- Firebase Storage with auth rules
- CORS configuration for production

---

## Deployment Checklist

### Backend
- [ ] Set MONGO_URL in production
- [ ] Set JWT_SECRET (strong random string)
- [ ] Set EMERGENT_LLM_KEY
- [ ] Configure CORS_ORIGINS
- [ ] Set FILE_UPLOAD_PATH
- [ ] Enable HTTPS

### Frontend
- [ ] Set REACT_APP_BACKEND_URL (production API)
- [ ] Configure Firebase project
- [ ] Enable Firebase Storage rules
- [ ] Build production bundle
- [ ] Deploy to hosting

### Database
- [ ] Create MongoDB indexes
- [ ] Set up backup strategy
- [ ] Configure replica set
- [ ] Enable authentication

### Monitoring
- [ ] Set up logging (backend errors)
- [ ] Monitor API latency
- [ ] Track AI API usage
- [ ] Set up alerts for SLA breaches

---

## Performance Optimization

### Backend
- MongoDB connection pooling
- Async/await for all DB operations
- JWT validation caching
- API response compression

### Frontend
- React lazy loading
- Code splitting
- Image optimization
- Firebase CDN for storage

### Database
- Indexes on frequently queried fields
- Projection to exclude unnecessary fields
- Aggregation pipelines for statistics

---

## Testing Strategy

### Unit Tests
- Auth flow (register, login, JWT)
- Anonymous token generation
- Role hierarchy logic
- Escalation mechanism

### Integration Tests
- API endpoint testing
- Database operations
- Firebase Storage uploads
- Gemini API integration

### E2E Tests
- Student feedback submission
- Staff issue management
- Admin dashboard
- Escalation flow

---

## Known Limitations

### Current Version
- No email notifications
- No SMS alerts
- Single institution support
- No mobile app
- Manual cron for auto-escalation

### Planned Improvements
- Real-time notifications
- Multi-institution platform
- Mobile apps (iOS/Android)
- Advanced analytics
- ML-based prioritization

---

## Support & Maintenance

### Logs
- Backend: `/var/log/supervisor/backend.*.log`
- Frontend: Browser console
- MongoDB: Connection logs

### Common Issues

**Issue**: Backend not starting
**Solution**: Check MongoDB connection, verify .env file

**Issue**: Firebase upload failing
**Solution**: Verify Firebase config, check Storage rules

**Issue**: AI moderation errors
**Solution**: Check EMERGENT_LLM_KEY, verify API limits

---

## Contact

For technical support or questions:
- Email: tech@trustloop.ai
- GitHub: [trustloop-ai](https://github.com/trustloop-ai)
- Documentation: [docs.trustloop.ai](https://docs.trustloop.ai)

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Built for**: Google Hackathon 2025
