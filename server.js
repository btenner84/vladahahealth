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
if (!admin.apps.length) {
  try {
    // Try to use the service account from environment variable first
    let serviceAccount;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'vladahealth-b2a00.firebasestorage.app';
    
    console.log('Using storage bucket in server.js:', storageBucket);
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Using Firebase service account from environment variable in server.js');
      } catch (e) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT in server.js:', e);
      }
    }
    
    // If not available or invalid, try to use the local file
    if (!serviceAccount) {
      try {
        // Use a direct require instead of dynamic require
        if (fs.existsSync(path.join(process.cwd(), 'serviceAccountKey.json'))) {
          serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
          console.log('Using Firebase service account from local file in server.js');
        }
      } catch (e) {
        console.error('Error loading local service account file in server.js:', e);
      }
    }
    
    // If still not available, use a direct configuration
    if (!serviceAccount) {
      console.log('Using direct Firebase configuration from environment variables in server.js');
      
      // Make sure we have the required environment variables
      if (!process.env.FIREBASE_PROJECT_ID) {
        console.error('Missing FIREBASE_PROJECT_ID environment variable');
      }
      
      if (!process.env.FIREBASE_CLIENT_EMAIL) {
        console.error('Missing FIREBASE_CLIENT_EMAIL environment variable');
      }
      
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Missing FIREBASE_PRIVATE_KEY environment variable');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        storageBucket: storageBucket
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: storageBucket
      });
    }
    
    console.log('Firebase Admin initialized in server.js');
  } catch (error) {
    console.error('Firebase Admin initialization error in server.js:', error);
    // Don't throw the error, just log it
  }
} else {
  console.log('Using existing Firebase Admin app in server.js');
}

// Get storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
  console.log('Storage bucket initialized in server.js:', bucket.name);
} catch (error) {
  console.error('Error getting storage bucket in server.js:', error);
}

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

    if (!bucket) {
      return res.status(500).json({ error: 'Storage bucket not initialized' });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    console.log(`Uploading file to ${destination}`);
    
    try {
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
    } catch (uploadError) {
      console.error('Firebase Storage upload error:', uploadError);
      
      // Check if it's a bucket not found error
      if (uploadError.message && uploadError.message.includes('specified bucket does not exist')) {
        console.error('Bucket does not exist. Please check your Firebase Storage configuration.');
        return res.status(500).json({ 
          error: 'Storage bucket not found. Please check your Firebase configuration.',
          details: 'The specified storage bucket does not exist or the service account does not have access to it.'
        });
      }
      
      throw uploadError;
    }
    
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

    if (!bucket) {
      return res.status(500).json({ error: 'Storage bucket not initialized' });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    console.log(`Uploading file to ${destination}`);
    
    try {
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
    } catch (uploadError) {
      console.error('Firebase Storage upload error:', uploadError);
      
      // Check if it's a bucket not found error
      if (uploadError.message && uploadError.message.includes('specified bucket does not exist')) {
        console.error('Bucket does not exist. Please check your Firebase Storage configuration.');
        return res.status(500).json({ 
          error: 'Storage bucket not found. Please check your Firebase configuration.',
          details: 'The specified storage bucket does not exist or the service account does not have access to it.'
        });
      }
      
      throw uploadError;
    }
    
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