# 🔐 TrustLoop AI

**Verified Anonymous Feedback & Hierarchical Resolution System**

A production-ready platform for college grievance management that ensures **verified identity** while maintaining **complete anonymity** in feedback submission.

---

## 🎯 Problem Statement

Educational institutions struggle with honest feedback due to:
- Student fear of retaliation
- Lack of accountability in grievance handling
- No structured escalation mechanism
- Anonymous systems losing credibility
- Manual tracking of complaints

## 💡 Solution

TrustLoop AI provides:
- ✅ **Verified Identity** - College email authentication
- ✅ **Operational Anonymity** - Anonymous token system
- ✅ **AI Moderation** - Gemini API for content filtering
- ✅ **Hierarchical Resolution** - Staff → HoD → Admin → Principal
- ✅ **Auto-Escalation** - 2-day SLA with automatic escalation
- ✅ **Voice Updates** - Audio progress reports from authorities
- ✅ **Evidence Support** - Image upload via Firebase Storage
- ✅ **Similar Issue Clustering** - AI-powered complaint grouping

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - Beautiful component library
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide Icons** - Modern icon set

### Backend
- **FastAPI** - High-performance Python API
- **MongoDB** - NoSQL database
- **Motor** - Async MongoDB driver
- **JWT** - Secure authentication
- **BCrypt** - Password hashing

### AI & Cloud
- **Google Gemini API** - AI moderation & text processing
- **Firebase Storage** - File & audio storage
- **EmergentIntegrations** - Universal LLM key support

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- Python 3.11+
- MongoDB
- Firebase Project

### Installation

```bash
# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
yarn install

# Start backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Start frontend
cd frontend
yarn start
```

---

## 🔑 Firebase Configuration

Firebase is configured in `/frontend/src/config/firebase.js` with your project credentials.

### Features Using Firebase
- **File Storage** - Evidence images uploaded by students
- **Audio Storage** - Voice updates from staff/authorities

---

## 🤖 AI Integration

### Gemini API for:
- Text moderation (abuse/threat detection)
- Feedback rewriting (neutral tone for anonymity)
- Urgency scoring (0-100 scale)
- Content summarization

---

## 📊 Key Features

### 1. Anonymous Feedback System
- Students submit feedback via college email
- Identity verified but feedback remains anonymous
- Cryptographic anonymous tokens

### 2. Hierarchical Resolution
- **Academics**: Staff → HoD → Admin → Principal
- **Hostel**: Warden → Admin → Principal
- **Other**: Staff → Admin → Principal

### 3. Auto-Escalation
- 2-day SLA for each role
- Automatic escalation if unresolved
- Manual escalation option for urgent cases

### 4. Voice Updates
- Staff can record audio progress updates
- Stored in Firebase Storage
- Accessible in issue timeline

### 5. Evidence Support
- Image upload for complaints
- Firebase Storage integration
- Secure access control

---

## 🏆 Built For

**Google Hackathon 2025**

Using:
- Google Gemini AI
- Firebase Storage
- MongoDB
- FastAPI + React

---

**Built with ❤️ for safer, more accountable educational institutions**
