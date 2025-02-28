import multer from 'multer';
import { createRouter } from 'next-connect';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use the service account from environment variable first
    let serviceAccount;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'vladahealth-b2a00.firebasestorage.app';
    
    console.log('Using storage bucket:', storageBucket);
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Using Firebase service account from environment variable');
      } catch (e) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', e);
      }
    }
    
    // If not available or invalid, try to use the local file
    if (!serviceAccount) {
      try {
        // Use a direct require instead of dynamic require
        if (fs.existsSync(path.join(process.cwd(), 'serviceAccountKey.json'))) {
          serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
          console.log('Using Firebase service account from local file');
        }
      } catch (e) {
        console.error('Error loading local service account file:', e);
      }
    }
    
    // If still not available, use a direct configuration
    if (!serviceAccount) {
      console.log('Using direct Firebase configuration from environment variables');
      
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
    
    console.log('Firebase Admin initialized in API route');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Don't throw the error, just log it
  }
} else {
  console.log('Using existing Firebase Admin app');
}

// Get storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
  console.log('Storage bucket initialized:', bucket.name);
} catch (error) {
  console.error('Error getting storage bucket:', error);
}

// Configure multer
const upload = multer({
  storage: multer.memoryStorage()
});

// Create API route handler
const apiRoute = createRouter({
  onError(error, req, res) {
    console.error('API route error:', error);
    res.status(501).json({ error: `Sorry something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Use multer middleware
apiRoute.use(upload.single('file'));

// Handle POST requests
apiRoute.post(async (req, res) => {
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
      
      res.status(200).json({ 
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

export default apiRoute.handler();

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
}; 