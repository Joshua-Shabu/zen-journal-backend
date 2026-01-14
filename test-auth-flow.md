# Test Authentication Flow

## Step 1: Request OTP for Registration
```bash
curl -X POST http://localhost:5000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Step 2: Verify OTP and Complete Registration
```bash
curl -X POST http://localhost:5000/auth/verify-register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "password": "mypassword"}'
```

## Step 3: Login with Email and Password (No OTP needed)
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "mypassword"}'
```

## Google Sign-In Alternative
```bash
curl -X POST http://localhost:5000/auth/google-signin \
  -H "Content-Type: application/json" \
  -d '{"tokenId": "google-id-token"}'
```

## Flow Summary:
1. **First-time users**: Email → OTP → Password → Registered
2. **Returning users**: Email + Password → Direct login
3. **Google users**: Direct sign-in with Google token

This matches exactly what you requested!
