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
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage()
});

// Also make sure the directory exists
if (process.env.NODE_ENV === 'production') {
  try {
    fs.mkdirSync('/tmp/uploads/', { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

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

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
}); 