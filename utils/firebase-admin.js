import admin from 'firebase-admin';
import logger from './logger';

// Track initialization status
let isInitialized = false;

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    logger.info('firebase-admin', 'Firebase Admin already initialized');
    return admin;
  }

  try {
    logger.info('firebase-admin', 'Initializing Firebase Admin');
    
    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    
    // Validate required config
    if (!projectId || !clientEmail) {
      throw new Error('Missing required Firebase configuration. Check environment variables.');
    }
    
    // APPROACH 1: Try to initialize with JSON credentials directly
    try {
      // Check if we have a service account JSON
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        logger.info('firebase-admin', 'Using service account JSON');
        
        // Parse the JSON string to an object
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        
        // Initialize with the service account
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket
        });
        
        isInitialized = true;
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with service account JSON', {
          projectId,
          clientEmail,
          storageBucket
        });
        
        return admin;
      }
    } catch (jsonError) {
      logger.error('firebase-admin', 'Error initializing with service account JSON', jsonError);
      // Continue to next approach
    }
    
    // APPROACH 2: Try to initialize with environment variables directly
    try {
      if (!isInitialized && process.env.FIREBASE_PRIVATE_KEY) {
        logger.info('firebase-admin', 'Using environment variables directly');
        
        // Get the private key
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Remove quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        
        // Initialize the app
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
          }),
          storageBucket
        });
        
        isInitialized = true;
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with environment variables', {
          projectId,
          clientEmail,
          privateKeyLength: privateKey.length,
          storageBucket
        });
        
        return admin;
      }
    } catch (envError) {
      logger.error('firebase-admin', 'Error initializing with environment variables', envError);
      // Continue to next approach
    }
    
    // APPROACH 3: Try to initialize with base64 encoded key
    try {
      if (!isInitialized && process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        logger.info('firebase-admin', 'Using base64 decoded private key');
        
        // Decode the base64 key
        const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
        const privateKey = buffer.toString('utf8');
        
        // Initialize the app
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
          }),
          storageBucket
        });
        
        isInitialized = true;
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with base64 key', {
          projectId,
          clientEmail,
          privateKeyLength: privateKey.length,
          storageBucket
        });
        
        return admin;
      }
    } catch (base64Error) {
      logger.error('firebase-admin', 'Error initializing with base64 key', base64Error);
      // Continue to next approach
    }
    
    // APPROACH 4: Try to initialize with application default credentials
    try {
      if (!isInitialized) {
        logger.info('firebase-admin', 'Attempting to use application default credentials');
        
        // Initialize with application default credentials
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
          storageBucket
        });
        
        isInitialized = true;
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with application default credentials', {
          projectId,
          storageBucket
        });
        
        return admin;
      }
    } catch (defaultError) {
      logger.error('firebase-admin', 'Error initializing with application default credentials', defaultError);
      // This is our last attempt, so we'll throw an error
      throw new Error('All Firebase initialization methods failed. Check logs for details.');
    }
    
    // If we get here, no initialization method worked
    throw new Error('No valid Firebase initialization method available. Check environment variables.');
  } catch (error) {
    logger.error('firebase-admin', 'Firebase initialization error', error);
    throw error;
  }
}

// Get Firebase Admin instance (initializes if needed)
export function getFirebaseAdmin() {
  return initializeFirebaseAdmin();
}

// Get Firestore instance
export function getFirestore() {
  const adminInstance = initializeFirebaseAdmin();
  return adminInstance.firestore();
}

// Get Storage bucket
export function getStorage() {
  const adminInstance = initializeFirebaseAdmin();
  return adminInstance.storage().bucket();
}

// Default export
export default {
  getFirebaseAdmin,
  getFirestore,
  getStorage
}; 