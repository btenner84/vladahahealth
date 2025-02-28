import admin from 'firebase-admin';
import logger from './logger';

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
    
    // Get private key - try different formats
    let privateKey;
    
    // Try base64 first
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
        privateKey = buffer.toString('utf8');
        logger.info('firebase-admin', 'Using base64 decoded private key');
      } catch (error) {
        logger.error('firebase-admin', 'Error decoding base64 key', error);
      }
    }
    
    // Fall back to regular key if base64 failed
    if (!privateKey && process.env.FIREBASE_PRIVATE_KEY) {
      privateKey = process.env.FIREBASE_PRIVATE_KEY;
      logger.info('firebase-admin', 'Using regular private key');
      
      // Remove quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
        logger.info('firebase-admin', 'Removed surrounding quotes from private key');
      }
      
      // Replace literal \n with actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
        logger.info('firebase-admin', 'Replaced \\n with actual newlines in private key');
      }
    }
    
    if (!privateKey) {
      throw new Error('No valid private key found. Check environment variables.');
    }
    
    // Initialize with a credential object directly
    const credential = {
      projectId,
      clientEmail,
      privateKey
    };
    
    logger.info('firebase-admin', 'Initializing Firebase Admin with credential object', {
      projectId,
      clientEmail,
      privateKeyLength: privateKey.length
    });
    
    // Initialize the app
    admin.initializeApp({
      credential: admin.credential.cert(credential),
      storageBucket
    });
    
    logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully', {
      projectId,
      clientEmail,
      privateKeyLength: privateKey.length,
      storageBucket
    });
    
    return admin;
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