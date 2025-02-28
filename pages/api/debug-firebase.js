import admin from 'firebase-admin';
import { formatPrivateKey, decodeAndFormatBase64Key, getBestAvailableKey } from '../../utils/firebase-key-helper';

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
        const decodedKey = decodeAndFormatBase64Key(process.env.FIREBASE_PRIVATE_KEY_BASE64);
        
        decodedKeyInfo = {
          length: decodedKey ? decodedKey.length : 0,
          startsWithCorrectHeader: decodedKey ? decodedKey.startsWith('-----BEGIN PRIVATE KEY-----') : false,
          endsWithCorrectFooter: decodedKey ? (decodedKey.endsWith('-----END PRIVATE KEY-----\n') || decodedKey.endsWith('-----END PRIVATE KEY-----')) : false,
          containsNewlines: decodedKey ? decodedKey.includes('\n') : false,
          firstFewChars: decodedKey ? decodedKey.substring(0, 30) + '...' : 'N/A',
          lastFewChars: decodedKey ? '...' + decodedKey.substring(decodedKey.length - 30) : 'N/A'
        };
      } catch (decodeError) {
        decodedKeyInfo = {
          error: 'Error decoding base64 key',
          message: decodeError.message
        };
      }
    }
    
    // Check regular private key format
    let regularKeyInfo = null;
    if (process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const formattedKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
        
        regularKeyInfo = {
          length: formattedKey ? formattedKey.length : 0,
          startsWithCorrectHeader: formattedKey ? formattedKey.startsWith('-----BEGIN PRIVATE KEY-----') : false,
          endsWithCorrectFooter: formattedKey ? (formattedKey.endsWith('-----END PRIVATE KEY-----\n') || formattedKey.endsWith('-----END PRIVATE KEY-----')) : false,
          containsNewlines: formattedKey ? formattedKey.includes('\n') : false,
          containsLiteralNewlines: process.env.FIREBASE_PRIVATE_KEY.includes('\\n')
        };
      } catch (formatError) {
        regularKeyInfo = {
          error: 'Error formatting regular key',
          message: formatError.message
        };
      }
    }
    
    // Get best available key
    const bestKey = getBestAvailableKey();
    const bestKeyInfo = bestKey ? {
      source: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? 'base64' : 'regular',
      length: bestKey.length,
      isValid: bestKey.includes('-----BEGIN PRIVATE KEY-----') && bestKey.includes('-----END PRIVATE KEY-----') && bestKey.includes('\n')
    } : {
      error: 'No valid key available'
    };
    
    // Check Firebase initialization status
    const firebaseStatus = {
      isInitialized: admin.apps.length > 0,
      appCount: admin.apps.length
    };
    
    // Try to initialize Firebase if not already initialized
    let initResult = null;
    if (!admin.apps.length) {
      try {
        // Get the best available private key
        const privateKey = getBestAvailableKey();
        
        if (!privateKey) {
          initResult = {
            success: false,
            stage: 'key-validation',
            error: 'No valid private key found'
          };
          return res.status(200).json({
            envCheck,
            decodedKeyInfo,
            regularKeyInfo,
            bestKeyInfo,
            firebaseStatus,
            initResult
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
      regularKeyInfo,
      bestKeyInfo,
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