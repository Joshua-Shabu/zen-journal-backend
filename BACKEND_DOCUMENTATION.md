# Mini Couple Journal - Backend Documentation

## 📋 Overview

The backend is a Node.js Express API server that provides RESTful endpoints for user authentication, journal entry management, and file uploads. It uses SQLite for data storage and includes email-based OTP authentication.

## 🏗️ Technical Architecture

### **Technology Stack**
- **Node.js** - JavaScript runtime environment
- **Express 4.22.1** - Web framework for Node.js
- **SQLite3 5.1.7** - Lightweight database
- **JWT 9.0.3** - Authentication tokens
- **Multer 2.0.2** - File upload handling
- **Nodemailer 7.0.12** - Email sending
- **Bcrypt 3.0.3** - Password hashing
- **Google Auth Library 10.5.0** - OAuth integration
- **Railway** - Deployment platform

### **Project Structure**
```
├── server.js           # Main application server
├── package.json        # Dependencies and scripts
├── .env                # Environment variables
├── .gitignore          # Git ignore rules
├── uploads/            # User uploaded images (git ignored)
└── database.db         # SQLite database (git ignored)
```

## 🔧 How the Backend Works

### **Server Configuration**
- **Port**: 5000 (configurable via PORT env var)
- **CORS**: Enabled for frontend communication
- **File Uploads**: Handled via Multer with local storage
- **Static Files**: Served from `/uploads` directory

### **Database Schema**

#### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **OTP Codes Table**
```sql
CREATE TABLE otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **Entries Table**
```sql
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  font_family TEXT DEFAULT 'sans-serif',
  font_size TEXT DEFAULT '16px',
  font_style TEXT DEFAULT 'normal',
  font_weight TEXT DEFAULT 'normal',
  color TEXT DEFAULT '#000000',
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **Entry Images Table**
```sql
CREATE TABLE entry_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 150,
  height INTEGER DEFAULT 150,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);
```

## 🛡️ Authentication System

### **JWT Authentication**
- **Token Generation**: Created on successful login/registration
- **Token Validation**: Middleware for protected routes
- **Token Expiration**: Configurable (default: 24 hours)
- **Secret Key**: Stored in JWT_SECRET environment variable

### **OTP-Based Registration**
1. **Request OTP**: User provides email, system generates 6-digit code
2. **Send Email**: OTP sent via Nodemailer using Gmail SMTP
3. **Verify OTP**: User enters OTP, system validates and creates account
4. **Complete Registration**: User sets password and receives JWT token

### **Google OAuth Integration**
- **Client ID**: Configured via GOOGLE_CLIENT_ID environment variable
- **Redirect Flow**: Handles OAuth callback and token exchange
- **User Creation**: Auto-creates user account if not exists

## 📡 API Endpoints

### **Authentication Endpoints**

#### `POST /auth/request-otp`
Request OTP for email registration
```json
Request: { "email": "user@example.com" }
Response: { "message": "OTP sent to your email" }
```

#### `POST /auth/verify-register`
Verify OTP and complete registration
```json
Request: { "email": "user@example.com", "otp": "123456", "password": "password" }
Response: { "token": "jwt_token_here" }
```

#### `POST /auth/login`
User login with email and password
```json
Request: { "email": "user@example.com", "password": "password" }
Response: { "token": "jwt_token_here" }
```

#### `GET /auth/google`
Initiate Google OAuth flow
```
Response: Redirect to Google OAuth
```

#### `POST /auth/google-signin`
Handle Google OAuth callback
```json
Request: { "token": "google_oauth_token" }
Response: { "token": "jwt_token_here" }
```

### **Journal Entry Endpoints**

#### `GET /entries`
Get all entries for authenticated user
```json
Headers: { "Authorization": "Bearer jwt_token" }
Response: [{ "id": 1, "title": "Entry Title", "text": "Content", ... }]
```

#### `POST /entries`
Create new journal entry with images
```json
Headers: { "Authorization": "Bearer jwt_token", "Content-Type": "multipart/form-data" }
Body: FormData with title, name, text, font properties, and images
Response: { "message": "Entry created successfully", "entry": {...} }
```

#### `DELETE /entries/:id`
Delete specific journal entry
```json
Headers: { "Authorization": "Bearer jwt_token" }
Response: { "message": "Entry deleted successfully" }
```

### **Utility Endpoints**

#### `GET /`
Health check endpoint
```json
Response: { "message": "Mini Couple Journal API is running 🚀" }
```

## 📧 Email Configuration

### **SMTP Settings**
- **Provider**: Gmail
- **Service**: Gmail SMTP
- **Authentication**: OAuth2 or App Password
- **Environment Variables**:
  - `EMAIL_USER`: Gmail address
  - `EMAIL_PASS`: Gmail app password

### **OTP Generation**
- **Length**: 6 digits
- **Expiration**: 10 minutes
- **Characters**: Numeric only
- **Storage**: SQLite database with expiration check

## 🚀 Deployment Setup

### **Railway Configuration**
1. **Connect GitHub Repository**
   - Sign in to Railway with GitHub
   - Import `zen-journal-backend` repository
   - Railway auto-detects Node.js app

2. **Environment Variables**
   ```
   PORT=5000
   JWT_SECRET=supersecretkey-change-this-in-production
   EMAIL_USER=joshuashabu59@gmail.com
   EMAIL_PASS=lyws fonp gwmw pzes
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

3. **Build Settings**
   - **Build Command**: Not required (Node.js)
   - **Start Command**: `npm start`
   - **Node Version**: 18.x (recommended)

### **Automatic Deployment**
- **Trigger**: Every push to `master` branch
- **Process**: Install dependencies → Start server
- **Duration**: ~30-60 seconds
- **URL**: Automatically generated (e.g., `https://your-app.up.railway.app`)

### **Database Persistence**
- **SQLite Database**: Stored in Railway's persistent volume
- **File Uploads**: Stored in `/uploads` directory
- **Backups**: Manual database exports recommended

## 📁 Git Workflow

### **Repository Setup**
```bash
# Clone the repository
git clone https://github.com/Joshua-Shabu/zen-journal-backend.git
cd zen-journal-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Start development server
npm start
```

### **Branch Strategy**
- **master**: Main production branch
- **develop**: Development branch
- **feature/***: Feature development branches
- **hotfix/***: Emergency fixes

### **Common Git Commands**
```bash
# Check status
git status

# Add changes
git add .
git add specific-file.js

# Commit changes
git commit -m "Descriptive commit message"

# Push to remote
git push origin master

# Pull latest changes
git pull origin master

# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout master

# Merge branches
git merge feature/new-feature
```

### **Commit Message Convention**
```
feat: Add new API endpoint
fix: Fix authentication bug
docs: Update API documentation
style: Improve code formatting
refactor: Refactor database queries
test: Add unit tests
chore: Update dependencies
```

## 🔧 Development Setup

### **Local Development**
1. **Prerequisites**
   - Node.js 18+ installed
   - Git installed
   - SQLite3 installed
   - Gmail account for email testing

2. **Setup Steps**
   ```bash
   # Clone repository
   git clone https://github.com/Joshua-Shabu/zen-journal-backend.git
   cd zen-journal-backend

   # Install dependencies
   npm install

   # Create environment file
   cp .env.example .env
   # Edit .env with your configuration

   # Start development server
   npm start
   ```

3. **Database Setup**
   - SQLite database created automatically on first run
   - Tables created automatically if they don't exist
   - No migrations needed for current schema

### **Environment Variables**
```bash
# Development (.env)
PORT=5000
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GOOGLE_CLIENT_ID=your-google-client-id

# Production (Railway)
PORT=5000
JWT_SECRET=supersecretkey-change-this-in-production
EMAIL_USER=joshuashabu59@gmail.com
EMAIL_PASS=lyws fonp gwmw pzes
GOOGLE_CLIENT_ID=your-google-client-id
```

## 🐛 Debugging & Troubleshooting

### **Common Issues**
1. **Database Connection Errors**
   - Check SQLite file permissions
   - Verify database file exists
   - Check disk space

2. **Email Sending Failures**
   - Verify Gmail app password
   - Check SMTP configuration
   - Verify email address format

3. **JWT Authentication Issues**
   - Check JWT_SECRET environment variable
   - Verify token format
   - Check token expiration

4. **File Upload Issues**
   - Check uploads directory permissions
   - Verify file size limits
   - Check disk space

### **Debugging Tools**
- **Railway Logs**: Real-time server logs
- **SQLite Browser**: Database inspection
- **Postman/Insomnia**: API testing
- **Node.js Debugger**: Server-side debugging

### **Logging Strategy**
- **Console Logging**: Development debugging
- **Error Handling**: Comprehensive error responses
- **Request Logging**: API request tracking
- **Performance Monitoring**: Response time tracking

## 📱 Performance Optimization

### **Database Optimization**
- **Indexing**: Primary keys automatically indexed
- **Query Optimization**: Efficient SQL queries
- **Connection Pooling**: SQLite handles automatically
- **Caching**: In-memory caching for frequent queries

### **API Performance**
- **Response Compression**: Gzip compression
- **Rate Limiting**: Prevent abuse (future enhancement)
- **Caching Headers**: Proper cache control
- **File Upload Optimization**: Image compression

### **Memory Management**
- **File Upload Limits**: Prevent memory exhaustion
- **Database Connection Management**: Proper cleanup
- **Error Handling**: Prevent memory leaks
- **Process Monitoring**: Health checks

## 🔒 Security Considerations

### **Authentication Security**
- **Password Hashing**: Bcrypt with salt rounds
- **JWT Security**: Strong secret keys
- **Token Expiration**: Reasonable timeout periods
- **Rate Limiting**: Prevent brute force attacks

### **Data Security**
- **Input Validation**: Sanitize all inputs
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: File type validation
- **Environment Variables**: Secure secret management

### **Network Security**
- **HTTPS Only**: Production uses HTTPS
- **CORS Configuration**: Proper cross-origin settings
- **Security Headers**: HSTS, CSP, etc.
- **API Rate Limiting**: Prevent abuse

## 🚀 Future Enhancements

### **Planned Features**
- **Database Migration**: PostgreSQL migration
- **File Storage**: Cloud storage integration
- **Email Templates**: Professional email design
- **API Versioning**: Versioned API endpoints
- **WebSockets**: Real-time features

### **Technical Improvements**
- **Testing Suite**: Unit and integration tests
- **API Documentation**: OpenAPI/Swagger
- **Monitoring**: Application performance monitoring
- **Scaling**: Horizontal scaling support
- **Caching**: Redis integration

## 📊 Monitoring & Analytics

### **Application Monitoring**
- **Health Checks**: `/` endpoint
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time tracking
- **User Analytics**: API usage statistics

### **Database Monitoring**
- **Query Performance**: Slow query identification
- **Connection Monitoring**: Database health
- **Storage Monitoring**: Disk space usage
- **Backup Monitoring**: Regular backup verification

## 📞 Support & Maintenance

### **Maintenance Tasks**
- **Dependency Updates**: Regular npm updates
- **Security Patches**: Apply security fixes
- **Database Backups**: Regular database exports
- **Log Rotation**: Prevent log file bloat

### **Scaling Considerations**
- **Database Scaling**: Migration to PostgreSQL
- **File Storage**: Cloud storage migration
- **Load Balancing**: Multiple server instances
- **CDN Integration**: Static file delivery

---

**Last Updated**: January 2026
**Version**: 1.0.0
**Maintainer**: Joshua Shabu
