import admin from 'firebase-admin';
import logger from '../../utils/logger';

export default async function handler(req, res) {
  try {
    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      logger.info('firebase-test', 'Initializing Firebase Admin in test endpoint');
      
      try {
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
        
        logger.firebaseInit('firebase-test', 'Firebase Admin initialized successfully with environment variables', config);
      } catch (error) {
        logger.error('firebase-test', 'Firebase initialization error', error);
        return res.status(500).json({ 
          error: 'Firebase initialization failed', 
          message: error.message,
          stack: error.stack
        });
      }
    } else {
      logger.info('firebase-test', 'Firebase Admin already initialized');
    }
    
    // Test Firebase Storage
    try {
      const bucket = admin.storage().bucket();
      logger.info('firebase-test', 'Storage bucket initialized', { bucketName: bucket.name });
      
      // Return success
      return res.status(200).json({ 
        success: true, 
        message: 'Firebase Admin initialized successfully',
        bucket: bucket.name,
        env: {
          projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
          privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'Not set'
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
  } catch (error) {
    logger.error('firebase-test', 'Test endpoint error', error);
    return res.status(500).json({ 
      error: 'Firebase test failed', 
      message: error.message,
      stack: error.stack
    });
  }
} 