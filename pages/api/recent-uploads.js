import logger from '../../utils/logger';
import { getFirebaseAdmin, getFirestore } from '../../utils/firebase-admin';

export default async function handler(req, res) {
  try {
    logger.info('recent-uploads', 'Retrieving recent uploads');
    
    // Initialize Firebase and get Firestore
    let admin;
    let db;
    
    try {
      admin = getFirebaseAdmin();
      db = getFirestore();
      logger.info('recent-uploads', 'Firebase and Firestore initialized successfully');
    } catch (error) {
      logger.error('recent-uploads', 'Error initializing Firebase components', error);
      return res.status(500).json({ 
        error: 'Firebase initialization failed', 
        message: error.message 
      });
    }
    
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