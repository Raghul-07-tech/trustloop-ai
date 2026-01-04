# Firebase Authentication Setup Guide

## ✅ Your Firebase Project is Already Configured

**Project ID:** trustloop-76a09  
**Web Config:** Already in `/frontend/src/config/firebase.js`

---

## 🔧 What's Needed: Firebase Admin SDK

For backend authentication verification, you need to add Firebase Admin SDK credentials.

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/project/trustloop-76a09/settings/serviceaccounts/adminsdk
2. Click on **"Service accounts"** tab
3. Click **"Generate new private key"** button
4. Click **"Generate key"** (a JSON file will download)

### Step 2: Extract Values from JSON

Open the downloaded JSON file. You'll see something like:

```json
{
  "type": "service_account",
  "project_id": "trustloop-76a09",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@trustloop-76a09.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Step 3: Update Backend .env File

Open `/app/backend/.env` and replace these values:

```env
FIREBASE_PRIVATE_KEY_ID=<copy private_key_id from JSON>
FIREBASE_PRIVATE_KEY="<copy entire private_key from JSON including BEGIN/END lines>"
FIREBASE_CLIENT_EMAIL=<copy client_email from JSON>
FIREBASE_CLIENT_ID=<copy client_id from JSON>
FIREBASE_CERT_URL=<copy client_x509_cert_url from JSON>
```

**Important:** 
- Keep the quotes around FIREBASE_PRIVATE_KEY
- The private key should include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### Step 4: Restart Backend

```bash
sudo supervisorctl restart backend
```

---

## 🔐 Firebase Authentication Methods Enabled

Your TrustLoop AI now supports:

### ✅ Email/Password Authentication
- Users register with college email
- Password stored securely in Firebase
- Automatic email verification available

### ✅ Google Sign-In
- One-click Google OAuth
- No password needed
- Instant authentication

---

## 🎯 How It Works

### Frontend (React)
1. User clicks "Login with Email" or "Continue with Google"
2. Firebase SDK handles authentication
3. Firebase returns ID token
4. Token sent to backend API

### Backend (FastAPI)
1. Receives Firebase ID token
2. Verifies token with Firebase Admin SDK
3. Extracts user UID
4. Creates/fetches user from MongoDB
5. Returns user data

### Security
- Firebase tokens expire automatically
- Backend verifies every request
- Anonymous feedback uses separate token system
- User identity never exposed in issues

---

## 📱 User Flow

### First Time User
1. **Register** → Enter email, password, name
2. **Role Dialog** → Select role (Student/Staff/Admin)
3. **Dashboard** → Redirected to role-specific dashboard

### Returning User
1. **Login** → Email/password or Google
2. **Dashboard** → Auto-redirect to dashboard

### Google OAuth
1. **Click Google Button** → Google auth popup
2. **Select Account** → Choose Google account
3. **Role Dialog** → Select role (first time only)
4. **Dashboard** → Start using app

---

## 🚀 Testing Authentication

### Test Email/Password

```bash
# Register new user
curl -X POST "YOUR_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Test Google OAuth
1. Click "Continue with Google" button
2. Select your Google account
3. Check if redirected to role selection
4. Verify dashboard access

---

## 🛠️ Troubleshooting

### Issue: "Invalid authentication token"
**Solution:** Check if Firebase Admin SDK credentials are correct in `.env`

### Issue: "Firebase user not found"
**Solution:** Ensure Firebase Authentication is enabled in Firebase Console

### Issue: "Google sign-in failed"
**Solution:** 
1. Check if Google provider is enabled in Firebase Console
2. Verify authorized domains include your frontend URL

### Issue: Backend not starting
**Solution:**
1. Check backend logs: `tail -f /var/log/supervisor/backend.*.log`
2. Verify all environment variables are set
3. Ensure private key format is correct (with newlines)

---

## 📊 What Changed from Custom JWT

### Before (Custom JWT)
- Backend generated JWT tokens
- Passwords stored in MongoDB
- Manual token verification
- Custom password hashing

### After (Firebase Auth)
- Firebase handles authentication
- Passwords managed by Firebase
- Firebase Admin SDK verifies tokens
- Google OAuth built-in

### Benefits
- 🔐 More secure (Google's infrastructure)
- 🚀 Easier to scale
- 📱 Mobile app ready
- 🌐 Social login support
- 📧 Email verification built-in
- 🔄 Password reset built-in

---

## 🎉 Ready to Go!

Once you add the Firebase Admin SDK credentials:

1. Backend will verify Firebase tokens
2. Users can register with email/password
3. Users can sign in with Google
4. All existing features work as before
5. Anonymous feedback system intact

---

## 🤝 Need Help?

If you encounter any issues:

1. Check Firebase Console for authentication status
2. Verify service account has correct permissions
3. Check backend logs for detailed errors
4. Ensure frontend Firebase config matches project

---

**Built for Google Hackathon 2025 🏆**
