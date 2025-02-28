import admin from 'firebase-admin';

export default async function handler(req, res) {
  try {
    // Check environment variables
    const envCheck = {
      projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'Not set',
      privateKeyBase64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? 'Set (length: ' + process.env.FIREBASE_PRIVATE_KEY_BASE64.length + ')' : 'Not set'
    };
    
    // Check if we have a base64 encoded key
    let decodedKeyInfo = null;
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        // Decode the base64 string
        const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
        const decodedKey = buffer.toString('utf8');
        
        decodedKeyInfo = {
          length: decodedKey.length,
          startsWithCorrectHeader: decodedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
          endsWithCorrectFooter: decodedKey.endsWith('-----END PRIVATE KEY-----\n') || decodedKey.endsWith('-----END PRIVATE KEY-----'),
          containsNewlines: decodedKey.includes('\n'),
          firstFewChars: decodedKey.substring(0, 30) + '...',
          lastFewChars: '...' + decodedKey.substring(decodedKey.length - 30)
        };
      } catch (decodeError) {
        decodedKeyInfo = {
          error: 'Error decoding base64 key',
          message: decodeError.message
        };
      }
    }
    
    // Check Firebase initialization status
    const firebaseStatus = {
      isInitialized: admin.apps.length > 0,
      appCount: admin.apps.length
    };
    
    // Try to initialize Firebase if not already initialized
    let initResult = null;
    if (!admin.apps.length) {
      try {
        // Get private key - try base64 first, then fall back to regular env var
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
          try {
            const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
            privateKey = buffer.toString('utf8');
          } catch (decodeError) {
            initResult = {
              success: false,
              stage: 'base64-decode',
              error: decodeError.message
            };
            return res.status(200).json({
              envCheck,
              decodedKeyInfo,
              firebaseStatus,
              initResult
            });
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
        
        initResult = {
          success: true,
          message: 'Firebase initialized successfully'
        };
      } catch (error) {
        initResult = {
          success: false,
          stage: 'firebase-init',
          error: error.message,
          stack: error.stack
        };
      }
    } else {
      initResult = {
        success: true,
        message: 'Firebase already initialized'
      };
    }
    
    // Try to access storage bucket
    let bucketResult = null;
    try {
      const bucket = admin.storage().bucket();
      bucketResult = {
        success: true,
        bucketName: bucket.name
      };
    } catch (error) {
      bucketResult = {
        success: false,
        error: error.message
      };
    }
    
    // Return all diagnostic information
    return res.status(200).json({
      envCheck,
      decodedKeyInfo,
      firebaseStatus,
      initResult,
      bucketResult
    });
  } catch (error) {
    return res.status(500).json({ 
      error: 'Unexpected error', 
      message: error.message,
      stack: error.stack
    });
  }
} 