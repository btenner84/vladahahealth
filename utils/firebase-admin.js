const admin = require('firebase-admin');
const logger = require('./logger');

let firebaseAdmin = null;
let firestoreDb = null;
let storageBucket = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {Object} Firebase Admin instance
 */
function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    if (firebaseAdmin) {
      logger.info('firebase-admin', 'Firebase Admin already initialized');
      return firebaseAdmin;
    }

    logger.info('firebase-admin', 'Initializing Firebase Admin');

    // Try different initialization strategies
    
    // Strategy 1: Use service account JSON if available
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        logger.info('firebase-admin', 'Using service account JSON');
        
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with service account JSON', {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKeyLength: serviceAccount.private_key ? serviceAccount.private_key.length : 0,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        return firebaseAdmin;
      } catch (error) {
        logger.error('firebase-admin', 'Failed to initialize with service account JSON', error);
        // Continue to next strategy
      }
    }
    
    // Strategy 2: Use base64 encoded key if available
    const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
    if (base64Key) {
      try {
        // Decode base64 key
        let privateKey;
        try {
          privateKey = Buffer.from(base64Key, 'base64').toString('utf8');
          logger.info('firebase-admin', 'Successfully decoded base64 private key');
        } catch (error) {
          logger.error('firebase-admin', 'Failed to decode base64 private key', error);
          throw new Error('Invalid base64 private key');
        }
        
        // Create a temporary file with the private key for Node.js versions that have OpenSSL issues
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const crypto = require('crypto');
        
        const tempDir = os.tmpdir();
        const keyFileName = `firebase-key-${crypto.randomBytes(8).toString('hex')}.pem`;
        const keyFilePath = path.join(tempDir, keyFileName);
        
        // Write the key to a temporary file
        fs.writeFileSync(keyFilePath, privateKey, { mode: 0o600 });
        
        logger.info('firebase-admin', 'Using temporary key file for authentication');
        
        // Initialize with the key file
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKeyPath: keyFilePath
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        // Clean up the temporary file after a delay
        setTimeout(() => {
          try {
            fs.unlinkSync(keyFilePath);
            logger.info('firebase-admin', 'Temporary key file removed');
          } catch (error) {
            logger.error('firebase-admin', 'Failed to remove temporary key file', error);
          }
        }, 5000);
        
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with base64 key', {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKeyLength: privateKey.length,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        return firebaseAdmin;
      } catch (error) {
        logger.error('firebase-admin', 'Failed to initialize with base64 key', error);
        // Continue to next strategy
      }
    }
    
    // Strategy 3: Use regular private key
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      try {
        // Format the private key properly
        let formattedKey = privateKey;
        
        // Remove surrounding quotes if present
        if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
          formattedKey = formattedKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines
        formattedKey = formattedKey.replace(/\\n/g, '\n');
        
        logger.info('firebase-admin', 'Using regular private key');
        
        // For Node.js 18+ and OpenSSL 3.0+, we need to use a different approach
        // Create a temporary file with the private key
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const crypto = require('crypto');
        
        const tempDir = os.tmpdir();
        const keyFileName = `firebase-key-${crypto.randomBytes(8).toString('hex')}.pem`;
        const keyFilePath = path.join(tempDir, keyFileName);
        
        // Write the key to a temporary file
        fs.writeFileSync(keyFilePath, formattedKey, { mode: 0o600 });
        
        logger.info('firebase-admin', 'Using temporary key file for authentication');
        
        // Initialize with the key file path instead of the key content
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKeyPath: keyFilePath
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        // Clean up the temporary file after a delay
        setTimeout(() => {
          try {
            fs.unlinkSync(keyFilePath);
            logger.info('firebase-admin', 'Temporary key file removed');
          } catch (error) {
            logger.error('firebase-admin', 'Failed to remove temporary key file', error);
          }
        }, 5000);
        
        logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with regular key', {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKeyLength: formattedKey.length,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        
        return firebaseAdmin;
      } catch (error) {
        logger.error('firebase-admin', 'Failed to initialize with regular private key', error);
        // Continue to next strategy
      }
    }
    
    // Strategy 4: Use application default credentials
    try {
      logger.info('firebase-admin', 'Attempting to use application default credentials');
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully with application default credentials', {
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      return firebaseAdmin;
    } catch (error) {
      logger.error('firebase-admin', 'Failed to initialize with application default credentials', error);
      throw new Error('All Firebase initialization strategies failed');
    }
  } catch (error) {
    logger.error('firebase-admin', 'Firebase Admin initialization failed', error);
    throw error;
  }
}

/**
 * Get Firebase Admin instance
 * @returns {Object} Firebase Admin instance
 */
function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    firebaseAdmin = initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

/**
 * Get Firestore DB instance
 * @returns {Object} Firestore DB instance
 */
function getFirestore() {
  if (!firestoreDb) {
    const admin = getFirebaseAdmin();
    firestoreDb = admin.firestore();
  }
  return firestoreDb;
}

/**
 * Get Storage bucket instance
 * @returns {Object} Storage bucket instance
 */
function getStorage() {
  if (!storageBucket) {
    const admin = getFirebaseAdmin();
    storageBucket = admin.storage().bucket();
  }
  return storageBucket;
}

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  getFirestore,
  getStorage
}; 