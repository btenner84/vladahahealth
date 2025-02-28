import multer from 'multer';
import nextConnect from 'next-connect';
import admin from 'firebase-admin';
import logger from '../../utils/logger';

// Check if Firebase is already initialized
if (!admin.apps.length) {
  logger.info('upload', 'Initializing Firebase Admin in upload API');
  
  try {
    // Get private key - try base64 first, then fall back to regular env var
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Check if we have a base64 encoded key
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        // Decode the base64 string
        const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
        privateKey = buffer.toString('utf8');
        logger.info('upload', 'Using base64 decoded private key');
      } catch (decodeError) {
        logger.error('upload', 'Error decoding base64 private key', decodeError);
        // Continue with regular private key
      }
    }
    
    // Initialize Firebase with environment variables
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
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
    logger.error('upload', 'Firebase initialization error in upload API', error);
  }
}

// Get the storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
  logger.info('upload', 'Storage bucket initialized in upload API', { bucketName: bucket.name });
} catch (error) {
  logger.error('upload', 'Error initializing storage bucket in upload API', error);
}

// Function to ensure bucket is initialized
async function ensureBucket(req, res, next) {
  try {
    if (!bucket) {
      logger.info('upload', 'Reinitializing storage bucket');
      bucket = admin.storage().bucket();
      
      if (!bucket) {
        logger.error('upload', 'Failed to initialize storage bucket');
        return res.status(500).json({ error: 'Failed to initialize storage bucket' });
      }
      
      logger.info('upload', 'Storage bucket reinitialized', { bucketName: bucket.name });
    }
    
    next();
  } catch (error) {
    logger.error('upload', 'Error in ensureBucket middleware', error);
    return res.status(500).json({ error: 'Storage bucket initialization failed', message: error.message });
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Create API route handler
const apiRoute = nextConnect({
  onError(error, req, res) {
    logger.error('upload', 'API route error', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  },
  onNoMatch(req, res) {
    logger.warn('upload', 'Method not allowed', { method: req.method });
    res.status(405).json({ error: `Method '${req.method}' not allowed` });
  },
});

// Add middleware
apiRoute.use(upload.single('file'));
apiRoute.use(ensureBucket);

// Handle POST request
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

export default apiRoute;

export const config = {
  api: {
    bodyParser: false,
  },
}; 