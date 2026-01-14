# Mini Couple Journal Backend - Email & Google Authentication

## Authentication System

This backend now supports two authentication methods:

### 1. Email Registration with OTP
- Users register with email and password
- A 6-digit OTP is sent to their email for verification
- Only after OTP verification can they log in

### 2. Google Sign-In
- Users can sign in directly with their Google account
- No password required for Google users

## API Endpoints

### Email Authentication
- `POST /auth/request-otp` - Request OTP for email registration
  ```json
  {
    "email": "user@example.com"
  }
  ```
- `POST /auth/verify-register` - Verify OTP and complete registration
  ```json
  {
    "email": "user@example.com",
    "otp": "123456",
    "password": "userpassword"
  }
  ```
- `POST /auth/login` - Login with email and password
  ```json
  {
    "email": "user@example.com",
    "password": "userpassword"
  }
  ```

### Google Authentication
- `POST /auth/google-signin` - Sign in with Google
  ```json
  {
    "tokenId": "google-id-token"
  }
  ```

## Setup Instructions

### 1. Email Configuration (for OTP)
1. Create a Gmail account for your app
2. Enable 2-factor authentication
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
4. Update `.env` file:
   ```
   EMAIL_USER=your-app-email@gmail.com
   EMAIL_PASS=your-16-digit-app-password
   ```

### 2. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Add your frontend URL to authorized origins
5. Copy the Client ID to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

### 3. Database Migration
The database schema has been updated to support:
- Email-based authentication
- OTP verification
- Google OAuth integration
- Email verification status

## Security Features
- OTP codes expire after 10 minutes
- Used OTPs are marked as consumed
- Passwords are hashed with bcrypt
- JWT tokens expire after 1 hour
- Email verification required for login

## Frontend Integration Notes
- Use Google Sign-In JavaScript library for Google authentication
- Implement OTP input UI for email verification
- Store JWT tokens securely on client side
- Include token in Authorization header: `Bearer <token>`
