import multer from 'multer';
import { createRouter } from 'next-connect';
import admin from 'firebase-admin';
import logger from '../../utils/logger';

// Initialize Firebase Admin if not already initialized
let bucket = null;
if (!admin.apps.length) {
  try {
    logger.info('upload', 'Initializing Firebase Admin in upload API');
    
    // Initialize Firebase with environment variables only
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    };
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey
      }),
      storageBucket: config.storageBucket
    });
    
    logger.firebaseInit('upload', 'Firebase Admin initialized successfully in upload API', config);
  } catch (error) {
    logger.error('upload', 'Firebase Admin initialization error in upload API', error);
    // Don't throw the error, just log it
  }
} else {
  logger.info('upload', 'Using existing Firebase Admin app in upload API');
}

// Get storage bucket
try {
  bucket = admin.storage().bucket();
  logger.info('upload', 'Storage bucket initialized in upload API', { bucketName: bucket.name });
} catch (error) {
  logger.error('upload', 'Error getting storage bucket in upload API', error);
}

// Helper function to ensure bucket is initialized
const ensureBucket = async () => {
  if (!bucket) {
    try {
      logger.info('upload', 'Attempting to reinitialize bucket in upload API');
      bucket = admin.storage().bucket();
      logger.info('upload', 'Bucket reinitialized in upload API', { bucketName: bucket.name });
      return true;
    } catch (error) {
      logger.error('upload', 'Failed to reinitialize bucket in upload API', error);
      return false;
    }
  }
  return true;
};

// Configure multer
const upload = multer({
  storage: multer.memoryStorage()
});

// Create API route handler
const apiRoute = createRouter({
  onError(error, req, res) {
    logger.error('upload', 'API route error', error);
    res.status(501).json({ error: `Sorry something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    logger.warn('upload', `Method '${req.method}' Not Allowed`);
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Use multer middleware
apiRoute.use(upload.single('file'));

// Handle POST requests
apiRoute.post(async (req, res) => {
  try {
    logger.info('upload', 'Upload request received', {
      hasFile: !!req.file,
      userId: req.body.userId,
      fileName: req.body.fileName
    });
    
    if (!req.file) {
      logger.warn('upload', 'No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Ensure bucket is initialized
    if (!await ensureBucket()) {
      logger.error('upload', 'Storage bucket not initialized', {
        env: {
          projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'Not set'
        }
      });
      return res.status(500).json({ 
        error: 'Storage bucket not initialized',
        env: {
          projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'Not set'
        }
      });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    logger.info('upload', `Uploading file to ${destination}`, {
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
    
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
      
      logger.info('upload', 'File uploaded successfully to Firebase Storage', { destination });
      
      // Get download URL
      const [url] = await bucket.file(destination).getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future expiration
      });
      
      logger.info('upload', 'Generated signed URL for file', { fileName });
      
      res.status(200).json({ 
        success: true, 
        downloadURL: url,
        fileName,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        timestamp
      });
    } catch (uploadError) {
      logger.error('upload', 'Firebase Storage upload error', uploadError);
      
      // Check if it's a bucket not found error
      if (uploadError.message && uploadError.message.includes('specified bucket does not exist')) {
        logger.error('upload', 'Bucket does not exist. Please check your Firebase Storage configuration.');
        return res.status(500).json({ 
          error: 'Storage bucket not found. Please check your Firebase configuration.',
          details: 'The specified storage bucket does not exist or the service account does not have access to it.'
        });
      }
      
      throw uploadError;
    }
    
  } catch (error) {
    logger.error('upload', 'Upload error details', error);
    res.status(500).json({ error: error.message });
  }
});

export default apiRoute.handler();

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
}; 