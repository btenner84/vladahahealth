import logger from '../../utils/logger';
import { getFirebaseAdmin, getStorage } from '../../utils/firebase-admin';

export default async function handler(req, res) {
  logger.info('debug-firebase', 'Starting Firebase diagnostic check');
  
  // Collect environment variable information (without exposing sensitive data)
  const envCheck = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 
      `Set (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : 'Not set',
    FIREBASE_PRIVATE_KEY_BASE64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? 
      `Set (${process.env.FIREBASE_PRIVATE_KEY_BASE64.length} chars)` : 'Not set'
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
    logger.info('debug-firebase', 'Firebase Admin initialized successfully');
    
    // Try to get storage bucket
    try {
      bucket = getStorage();
      bucketStatus = 'Initialized successfully';
      logger.info('debug-firebase', 'Storage bucket initialized successfully');
      
      // Test bucket access by listing files (limited to 1)
      try {
        const [files] = await bucket.getFiles({ maxResults: 1 });
        bucketAccessResult = `Success - found ${files.length} files`;
        logger.info('debug-firebase', `Bucket access test successful, found ${files.length} files`);
      } catch (bucketAccessError) {
        bucketAccessResult = `Error: ${bucketAccessError.message}`;
        logger.error('debug-firebase', 'Bucket access test failed', bucketAccessError);
      }
    } catch (bucketError) {
      bucketStatus = `Error: ${bucketError.message}`;
      logger.error('debug-firebase', 'Storage bucket initialization failed', bucketError);
    }
  } catch (firebaseError) {
    firebaseStatus = `Error: ${firebaseError.message}`;
    logger.error('debug-firebase', 'Firebase Admin initialization failed', firebaseError);
  }
  
  // Return diagnostic information
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    firebase: {
      status: firebaseStatus,
      bucket: bucketStatus,
      bucketAccess: bucketAccessResult
    }
  });
} 