import logger from '../../utils/logger';
import { getFirebaseAdmin, getStorage } from '../../utils/firebase-admin';

export default async function handler(req, res) {
  try {
    logger.info('debug-upload', 'Starting upload diagnostic check');
    
    // Collect environment variable information (without exposing sensitive data)
    const envCheck = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 
        `Set (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : 'Not set',
      FIREBASE_PRIVATE_KEY_BASE64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? 
        `Set (${process.env.FIREBASE_PRIVATE_KEY_BASE64.length} chars)` : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };
    
    // Initialize Firebase components
    let firebaseStatus = 'Not initialized';
    let bucketStatus = 'Not initialized';
    let bucketAccessResult = 'Not tested';
    let admin = null;
    let bucket = null;
    
    try {
      // Try to initialize Firebase Admin
      admin = getFirebaseAdmin();
      firebaseStatus = 'Initialized successfully';
      logger.info('debug-upload', 'Firebase Admin initialized successfully');
      
      // Try to get storage bucket
      try {
        bucket = getStorage();
        bucketStatus = 'Initialized successfully';
        logger.info('debug-upload', 'Storage bucket initialized successfully');
        
        // Test bucket access by listing files (limited to 1)
        try {
          const [files] = await bucket.getFiles({ maxResults: 1 });
          bucketAccessResult = `Success - found ${files.length} files`;
          logger.info('debug-upload', `Bucket access test successful, found ${files.length} files`);
          
          // Try to create a test file
          if (req.query.testUpload === 'true') {
            try {
              const testContent = Buffer.from('Test file content');
              const testFileName = `test-${Date.now()}.txt`;
              
              await bucket.file(testFileName).save(testContent, {
                metadata: {
                  contentType: 'text/plain'
                }
              });
              
              logger.info('debug-upload', `Test file uploaded successfully: ${testFileName}`);
              
              // Get a signed URL
              const [url] = await bucket.file(testFileName).getSignedUrl({
                action: 'read',
                expires: '03-01-2500'
              });
              
              bucketAccessResult += `, Test upload successful: ${testFileName}, URL: ${url}`;
            } catch (testUploadError) {
              bucketAccessResult += `, Test upload failed: ${testUploadError.message}`;
              logger.error('debug-upload', 'Test upload failed', testUploadError);
            }
          }
        } catch (bucketAccessError) {
          bucketAccessResult = `Error: ${bucketAccessError.message}`;
          logger.error('debug-upload', 'Bucket access test failed', bucketAccessError);
        }
      } catch (bucketError) {
        bucketStatus = `Error: ${bucketError.message}`;
        logger.error('debug-upload', 'Storage bucket initialization failed', bucketError);
      }
    } catch (firebaseError) {
      firebaseStatus = `Error: ${firebaseError.message}`;
      logger.error('debug-upload', 'Firebase Admin initialization failed', firebaseError);
    }
    
    // Return diagnostic information
    return res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      firebase: {
        status: firebaseStatus,
        bucket: bucketStatus,
        bucketAccess: bucketAccessResult
      },
      multerInfo: {
        note: "This endpoint doesn't use multer. The main upload.js endpoint uses multer for file uploads."
      }
    });
  } catch (error) {
    logger.error('debug-upload', 'Unexpected error in diagnostic endpoint', error);
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    });
  }
} 