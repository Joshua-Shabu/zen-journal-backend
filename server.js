require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "supersecretkey";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body); // Debug log
  next();
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Database setup
const db = new sqlite3.Database('./journal.db', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Create tables if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT,
  googleId TEXT UNIQUE,
  isEmailVerified BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  code TEXT,
  expiresAt DATETIME,
  isUsed BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.run(`CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  name TEXT,
  text TEXT,
  fontFamily TEXT DEFAULT 'sans-serif',
  fontSize TEXT DEFAULT '16px',
  fontStyle TEXT DEFAULT 'normal',
  fontWeight TEXT DEFAULT 'normal',
  color TEXT DEFAULT '#000000',
  date TEXT,
  userId INTEGER,
  FOREIGN KEY(userId) REFERENCES users(id)
)`);

db.run(`CREATE TABLE IF NOT EXISTS entry_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entryId INTEGER,
  imageUrl TEXT,
  x INTEGER,
  y INTEGER,
  width INTEGER,
  height INTEGER,
  FOREIGN KEY(entryId) REFERENCES entries(id)
)`);

// --- AUTH ROUTES ---

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Mini Couple Journal',
    html: `
      <h2>Welcome to Mini Couple Journal!</h2>
      <p>Your OTP code is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP:', error);
    return false;
  }
}

// Request OTP for email registration
app.post('/auth/request-otp', async (req, res) => {
  console.log('Received request-otp request:', req.body);
  const { email } = req.body;
  
  if (!email) {
    console.log('Email is required');
    return res.status(400).json({ error: "Email is required" });
  }

  // Check if email already exists
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.log('Database error:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('User found:', user);
    
    if (user && user.isEmailVerified) {
      console.log('Email already registered');
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    console.log('Generated OTP:', otp);
    
    // Clean up old OTPs for this email
    db.run('DELETE FROM otp_codes WHERE email = ? OR expiresAt < ?', [email, new Date()], (err) => {
      if (err) {
        console.log('Error cleaning up old OTPs:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Store new OTP
      db.run('INSERT INTO otp_codes (email, code, expiresAt) VALUES (?, ?, ?)', 
        [email, otp, expiresAt], async (err) => {
          if (err) {
            console.log('Error storing OTP:', err);
            return res.status(500).json({ error: err.message });
          }
          
          console.log('OTP stored successfully');
          
          // Send OTP email
          const emailSent = await sendOTPEmail(email, otp);
          console.log(`OTP for ${email}: ${otp}`); // Log OTP for testing
          if (emailSent) {
            console.log('OTP email sent successfully');
            res.json({ message: "OTP sent to your email" });
          } else {
            console.log('Failed to send OTP email');
            res.status(500).json({ error: "Failed to send OTP" });
          }
        });
    });
  });
});

// Verify OTP and register
app.post('/auth/verify-register', async (req, res) => {
  const { email, otp, password } = req.body;
  
  if (!email || !otp || !password) {
    return res.status(400).json({ error: "Email, OTP, and password are required" });
  }

  // Verify OTP
  db.get('SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expiresAt > ? AND isUsed = 0', 
    [email, otp, new Date()], async (err, otpRecord) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!otpRecord) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Mark OTP as used
      db.run('UPDATE otp_codes SET isUsed = 1 WHERE id = ?', [otpRecord.id]);

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      
      db.run('INSERT INTO users (email, password, isEmailVerified) VALUES (?, ?, 1)', 
        [email, hashedPassword], function(err) {
          if (err) return res.status(400).json({ error: "Failed to create user" });
          
          const token = jwt.sign({ id: this.lastID, email }, SECRET, { expiresIn: '7d' });
          res.json({ id: this.lastID, email, token });
        });
    });
});

// Email login
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password: '***' }); // Debug log
  
  if (!email || !password) {
    console.log('Missing email or password'); // Debug log
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  db.get('SELECT * FROM users WHERE email = ? AND isEmailVerified = 1', [email], async (err, user) => {
    console.log('Database query result:', { err, user: user ? { id: user.id, email: user.email } : null }); // Debug log
    if (err) return res.status(500).json({ error: err.message });
    
    if (!user || !user.password) {
      console.log('User not found or no password'); // Debug log
      return res.status(400).json({ error: "Invalid credentials" });
    }
    
    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match); // Debug log
    if (!match) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '7d' });
    console.log('Login successful, token generated'); // Debug log
    res.json({ token });
  });
});

// Google OAuth redirect endpoint
app.get('/auth/google', (req, res) => {
  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
  const scope = 'email profile';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.redirect(authUrl);
});

// Google OAuth callback endpoint
app.post('/auth/google-callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    // Exchange code for tokens
    const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description });
    }

    // Get user info with access token
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    const { email, id: googleId } = userData;

    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ? OR googleId = ?', [email, googleId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (user) {
        // Update Google ID if missing
        if (!user.googleId) {
          db.run('UPDATE users SET googleId = ?, isEmailVerified = 1 WHERE id = ?', [googleId, user.id]);
        }
        const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '7d' });
        res.json({ token });
      } else {
        // Create new user
        db.run('INSERT INTO users (email, googleId, isEmailVerified) VALUES (?, ?, 1)', 
          [email, googleId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const token = jwt.sign({ id: this.lastID, email }, SECRET, { expiresIn: '7d' });
            res.json({ token });
          });
      }
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

// Google Sign-In (for direct token method)
app.post('/auth/google-signin', async (req, res) => {
  const { tokenId } = req.body;
  
  if (!tokenId) {
    return res.status(400).json({ error: "Google token is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload;
    
    // Check if user exists
    db.get('SELECT * FROM users WHERE email = ? OR googleId = ?', [email, googleId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (user) {
        // Update Google ID if missing
        if (!user.googleId) {
          db.run('UPDATE users SET googleId = ?, isEmailVerified = 1 WHERE id = ?', [googleId, user.id]);
        }
        const token = jwt.sign({ id: user.id, email }, SECRET, { expiresIn: '1h' });
        res.json({ token });
      } else {
        // Create new user
        db.run('INSERT INTO users (email, googleId, isEmailVerified) VALUES (?, ?, 1)', 
          [email, googleId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const token = jwt.sign({ id: this.lastID, email }, SECRET, { expiresIn: '1h' });
            res.json({ token });
          });
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ error: "Invalid Google token" });
  }
});

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  console.log('Auth header:', header); // Debug log
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  console.log('Extracted token:', token); // Debug log
  try {
    const decoded = jwt.verify(token, SECRET);
    console.log('Decoded token:', decoded); // Debug log
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token verification error:', error.message); // Debug log
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- ENTRY ROUTES ---
app.get('/entries', authMiddleware, (req, res) => {
  db.all('SELECT * FROM entries WHERE userId = ? ORDER BY id DESC', [req.user.id], (err, entries) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get images for each entry
    const entriesWithImages = entries.map(entry => {
      return new Promise((resolve) => {
        db.all('SELECT * FROM entry_images WHERE entryId = ?', [entry.id], (err, images) => {
          resolve({
            ...entry,
            images: images || []
          });
        });
      });
    });
    
    Promise.all(entriesWithImages)
      .then(results => {
        res.json(results);
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });
});

app.post('/entries', authMiddleware, upload.array('images', 10), (req, res) => {
  const { title, name, text, fontFamily, fontSize, fontStyle, fontWeight, color } = req.body;
  const date = new Date().toLocaleDateString();
  
  // First, create the entry
  db.run('INSERT INTO entries (title, name, text, fontFamily, fontSize, fontStyle, fontWeight, color, date, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, name, text, fontFamily || 'sans-serif', fontSize || '16px', fontStyle || 'normal', fontWeight || 'normal', color || '#000000', date, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const entryId = this.lastID;
      
      // Handle images if any were uploaded
      if (req.files && req.files.length > 0) {
        const imagePromises = req.files.map((file, index) => {
          return new Promise((resolve, reject) => {
            // Get image data from request body
            const imageDataKey = `imageData${index}`;
            const imageData = req.body[imageDataKey] ? JSON.parse(req.body[imageDataKey]) : { x: 50, y: 50, width: 200, height: 150 };
            
            db.run('INSERT INTO entry_images (entryId, imageUrl, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)',
              [entryId, `/uploads/${file.filename}`, imageData.x, imageData.y, imageData.width, imageData.height],
              (err) => {
                if (err) reject(err);
                else resolve();
              });
          });
        });
        
        Promise.all(imagePromises)
          .then(() => {
            res.json({ 
              id: entryId, 
              title, 
              name, 
              text, 
              fontFamily: fontFamily || 'sans-serif',
              fontSize: fontSize || '16px',
              fontStyle: fontStyle || 'normal',
              fontWeight: fontWeight || 'normal',
              color: color || '#000000',
              date 
            });
          })
          .catch((err) => {
            res.status(500).json({ error: err.message });
          });
      } else {
        // No images, just return the entry
        res.json({ 
          id: entryId, 
          title, 
          name, 
          text, 
          fontFamily: fontFamily || 'sans-serif',
          fontSize: fontSize || '16px',
          fontStyle: fontStyle || 'normal',
          fontWeight: fontWeight || 'normal',
          color: color || '#000000',
          date 
        });
      }
    });
});

app.delete('/entries/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM entries WHERE id = ? AND userId = ?', [id, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedID: id });
  });
});

// Root route
app.get('/', (req, res) => { res.send('Mini Couple Journal API is running 🚀'); });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
