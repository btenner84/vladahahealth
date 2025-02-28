import admin from 'firebase-admin';
import logger from '../../utils/logger';
import { getBestAvailableKey } from '../../utils/firebase-key-helper';

export default async function handler(req, res) {
  try {
    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      logger.info('recent-uploads', 'Initializing Firebase Admin');
      
      try {
        // Get the best available private key using our helper
        const privateKey = getBestAvailableKey();
        
        if (!privateKey) {
          logger.error('recent-uploads', 'No valid private key found in environment variables');
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
        
        logger.firebaseInit('recent-uploads', 'Firebase Admin initialized successfully', {
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKeyLength: config.privateKey ? config.privateKey.length : 0,
          storageBucket: config.storageBucket
        });
      } catch (error) {
        logger.error('recent-uploads', 'Firebase initialization error', error);
        return res.status(500).json({ 
          error: 'Firebase initialization failed', 
          message: error.message 
        });
      }
    } else {
      logger.info('recent-uploads', 'Firebase Admin already initialized');
    }
    
    // Get Firestore instance
    const db = admin.firestore();
    
    // Get recent uploads from users collection
    const uploads = [];
    
    // Query all users
    const usersSnapshot = await db.collection('users').get();
    
    // Iterate through users and collect their bills
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      if (userData.bills && Array.isArray(userData.bills)) {
        // Add user ID to each bill and add to uploads array
        const userBills = userData.bills.map(bill => ({
          ...bill,
          userId: userDoc.id
        }));
        
        uploads.push(...userBills);
      }
    }
    
    // Sort uploads by timestamp (most recent first)
    uploads.sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampB - timestampA;
    });
    
    // Limit to 20 most recent uploads
    const recentUploads = uploads.slice(0, 20);
    
    logger.info('recent-uploads', `Retrieved ${recentUploads.length} recent uploads`);
    
    return res.status(200).json({ 
      success: true,
      uploads: recentUploads
    });
  } catch (error) {
    logger.error('recent-uploads', 'Error in recent-uploads API', error);
    return res.status(500).json({ error: 'Failed to retrieve recent uploads', message: error.message });
  }
} 