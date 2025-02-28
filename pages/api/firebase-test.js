import logger from '../../utils/logger';
import { getFirebaseAdmin, getStorage } from '../../utils/firebase-admin';

export default async function handler(req, res) {
  try {
    logger.info('firebase-test', 'Testing Firebase initialization');
    
    // Initialize Firebase Admin
    try {
      const admin = getFirebaseAdmin();
      logger.info('firebase-test', 'Firebase Admin initialized successfully');
      
      // Test Firebase Storage
      try {
        const bucket = getStorage();
        logger.info('firebase-test', 'Storage bucket initialized successfully', { bucketName: bucket.name });
        
        // Return success
        return res.status(200).json({ 
          success: true, 
          message: 'Firebase Admin initialized successfully',
          bucket: bucket.name,
          env: {
            projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'Not set',
            privateKeyBase64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY_BASE64.length + ')' : 'Not set'
          }
        });
      } catch (storageError) {
        logger.error('firebase-test', 'Error initializing storage bucket', storageError);
        return res.status(500).json({ 
          error: 'Failed to initialize storage bucket', 
          message: storageError.message,
          stack: storageError.stack
        });
      }
    } catch (initError) {
      logger.error('firebase-test', 'Firebase initialization error', initError);
      return res.status(500).json({ 
        error: 'Firebase initialization failed', 
        message: initError.message,
        stack: initError.stack
      });
    }
  } catch (error) {
    logger.error('firebase-test', 'Test endpoint error', error);
    return res.status(500).json({ 
      error: 'Firebase test failed', 
      message: error.message,
      stack: error.stack
    });
  }
} 