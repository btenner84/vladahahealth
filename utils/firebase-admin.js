const admin = require('firebase-admin');
const logger = require('./logger');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

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

    // Create a service account object from environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET;
    
    // Validate required config
    if (!projectId || !clientEmail || !storageBucketName) {
      throw new Error('Missing required Firebase configuration. Check environment variables.');
    }
    
    // Get private key from environment variables
    let privateKey = null;
    
    // Try to get private key from base64 encoded version first
    const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
    if (base64Key) {
      try {
        privateKey = Buffer.from(base64Key, 'base64').toString('utf8');
        logger.info('firebase-admin', 'Using base64 decoded private key');
      } catch (error) {
        logger.error('firebase-admin', 'Failed to decode base64 private key', error);
      }
    }
    
    // If base64 key failed, try regular private key
    if (!privateKey) {
      privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey) {
        // Remove surrounding quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        logger.info('firebase-admin', 'Using regular private key');
      }
    }
    
    if (!privateKey) {
      throw new Error('No private key available. Check environment variables.');
    }
    
    // Create a temporary file with the private key
    const tempDir = os.tmpdir();
    const keyFileName = `firebase-key-${crypto.randomBytes(8).toString('hex')}.json`;
    const keyFilePath = path.join(tempDir, keyFileName);
    
    // Create a service account JSON file
    const serviceAccount = {
      type: 'service_account',
      project_id: projectId,
      private_key_id: crypto.randomBytes(16).toString('hex'),
      private_key: privateKey,
      client_email: clientEmail,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
    };
    
    // Write the service account to a temporary file
    fs.writeFileSync(keyFilePath, JSON.stringify(serviceAccount, null, 2), { mode: 0o600 });
    
    logger.info('firebase-admin', 'Created temporary service account file');
    
    // Initialize with the service account file
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(keyFilePath),
      storageBucket: storageBucketName
    });
    
    // Clean up the temporary file after a delay
    setTimeout(() => {
      try {
        fs.unlinkSync(keyFilePath);
        logger.info('firebase-admin', 'Temporary service account file removed');
      } catch (error) {
        logger.error('firebase-admin', 'Failed to remove temporary service account file', error);
      }
    }, 5000);
    
    logger.firebaseInit('firebase-admin', 'Firebase Admin initialized successfully', {
      projectId,
      clientEmail,
      privateKeyLength: privateKey.length,
      storageBucket: storageBucketName
    });
    
    return firebaseAdmin;
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