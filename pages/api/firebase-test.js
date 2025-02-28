import admin from 'firebase-admin';
import logger from '../../utils/logger';
import { getBestAvailableKey } from '../../utils/firebase-key-helper';

export default async function handler(req, res) {
  try {
    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      logger.info('firebase-test', 'Initializing Firebase Admin in test endpoint');
      
      try {
        // Get the best available private key using our helper
        const privateKey = getBestAvailableKey();
        
        if (!privateKey) {
          logger.error('firebase-test', 'No valid private key found in environment variables');
          return res.status(500).json({ 
            error: 'Firebase initialization failed', 
            message: 'No valid private key found in environment variables'
          });
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
        
        logger.firebaseInit('firebase-test', 'Firebase Admin initialized successfully with environment variables', {
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKeyLength: config.privateKey ? config.privateKey.length : 0,
          storageBucket: config.storageBucket
        });
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
  } catch (error) {
    logger.error('firebase-test', 'Test endpoint error', error);
    return res.status(500).json({ 
      error: 'Firebase test failed', 
      message: error.message,
      stack: error.stack
    });
  }
} 