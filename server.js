// NOTE: Ensure a Business Associate Agreement (BAA) is in place with Google Cloud
// before storing Protected Health Information (PHI)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Parse URL-encoded requests
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage()
});

// Initialize Firebase Admin
let serviceAccount;
if (process.env.NODE_ENV === 'production') {
  // In production, use environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // In development, use local file
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'vladahealth-b2a00.firebasestorage.app'
});

const bucket = admin.storage().bucket();

// Add this before the deleteExpiredFiles function
const auditLog = async (req, action, userId, resourceId, status, details) => {
  try {
    await admin.firestore().collection('auditLogs').add({
      action,
      userId,
      resourceId,
      status,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: req ? req.ip : 'system',
      userAgent: req ? req.headers['user-agent'] : 'system'
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

// Simple file upload endpoint
app.all('/upload', (req, res, next) => {
  console.log('Received request to /upload with method:', req.method);
  if (req.method === 'POST') {
    next(); // Continue to the actual handler
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

// Add API upload endpoint
app.all('/api/upload', (req, res, next) => {
  console.log('Received request to /api/upload with method:', req.method);
  if (req.method === 'POST') {
    next(); // Continue to the actual handler
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      userId: req.body.userId,
      fileName: req.body.fileName
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    console.log(`Uploading file to ${destination}`);
    
    // Upload file to Firebase Storage using buffer
    await bucket.file(destination).save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          userId,
          fileName,
          timestamp: timestamp.toString()
        }
      }
    });
    
    // Get download URL
    const [url] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future expiration
    });
    
    res.json({ 
      success: true, 
      downloadURL: url,
      fileName,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      timestamp
    });
    
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: error.message });
  }
});

// Add API upload endpoint handler
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('API Upload request received:', {
      hasFile: !!req.file,
      userId: req.body.userId,
      fileName: req.body.fileName
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    console.log(`Uploading file to ${destination}`);
    
    // Upload file to Firebase Storage using buffer
    await bucket.file(destination).save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          userId,
          fileName,
          timestamp: timestamp.toString()
        }
      }
    });
    
    // Get download URL
    const [url] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future expiration
    });
    
    res.json({ 
      success: true, 
      downloadURL: url,
      fileName,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      timestamp
    });
    
  } catch (error) {
    console.error('API Upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Catch-all route for debugging
app.all('*', (req, res) => {
  console.log(`Received request to ${req.path} with method: ${req.method}`);
  res.status(200).json({ message: `Received ${req.method} request to ${req.path}` });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 