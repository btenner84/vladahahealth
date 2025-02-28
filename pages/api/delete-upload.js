import admin from 'firebase-admin';
import { createRouter } from 'next-connect';
import logger from '../../utils/logger';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    logger.info('delete-upload', 'Initializing Firebase Admin in delete API');
    
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
    
    logger.firebaseInit('delete-upload', 'Firebase Admin initialized successfully in delete API', config);
  } catch (error) {
    logger.error('delete-upload', 'Firebase Admin initialization error in delete API', error);
  }
} else {
  logger.info('delete-upload', 'Using existing Firebase Admin app in delete API');
}

// Get storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
  logger.info('delete-upload', 'Storage bucket initialized in delete API', { bucketName: bucket.name });
} catch (error) {
  logger.error('delete-upload', 'Error getting storage bucket in delete API', error);
}

// Create API route handler
const apiRoute = createRouter({
  onError(error, req, res) {
    logger.error('delete-upload', 'Delete API route error', error);
    res.status(501).json({ error: `Sorry something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    logger.warn('delete-upload', `Method '${req.method}' Not Allowed`);
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Handle DELETE requests
apiRoute.delete(async (req, res) => {
  try {
    const { fileUrl, userId } = req.query;
    
    logger.info('delete-upload', 'Delete request received', { fileUrl, userId });
    
    if (!fileUrl) {
      logger.warn('delete-upload', 'No file URL provided');
      return res.status(400).json({ error: 'No file URL provided' });
    }
    
    if (!userId) {
      logger.warn('delete-upload', 'No user ID provided');
      return res.status(400).json({ error: 'No user ID provided' });
    }
    
    // Extract the file path from the URL
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // Find the file in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      logger.warn('delete-upload', 'User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const bills = userData.bills || [];
    
    // Find the bill with the matching URL
    const billIndex = bills.findIndex(bill => bill.fileUrl === fileUrl);
    
    if (billIndex === -1) {
      logger.warn('delete-upload', 'File not found in user records', { fileUrl });
      return res.status(404).json({ error: 'File not found in user records' });
    }
    
    // Get the file path from the bill
    const filePath = bills[billIndex].filePath || `bills/${userId}/${fileName}`;
    
    logger.info('delete-upload', 'Deleting file from storage', { filePath });
    
    try {
      // Delete from Storage
      await bucket.file(filePath).delete();
      logger.info('delete-upload', 'File deleted from storage successfully', { filePath });
      
      // Remove from user's bills array
      bills.splice(billIndex, 1);
      
      // Update user document
      await userRef.update({ bills });
      logger.info('delete-upload', 'User record updated', { userId });
      
      res.status(200).json({ success: true, message: 'File deleted successfully' });
    } catch (deleteError) {
      logger.error('delete-upload', 'Error deleting file from storage', deleteError);
      
      // If the file doesn't exist in storage, still update the user record
      if (deleteError.code === 404) {
        logger.warn('delete-upload', 'File not found in storage, updating user record anyway', { filePath });
        
        // Remove from user's bills array
        bills.splice(billIndex, 1);
        
        // Update user document
        await userRef.update({ bills });
        logger.info('delete-upload', 'User record updated despite storage error', { userId });
        
        return res.status(200).json({ 
          success: true, 
          message: 'File reference removed from user record, but file was not found in storage'
        });
      }
      
      throw deleteError;
    }
  } catch (error) {
    logger.error('delete-upload', 'Delete operation failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle POST requests (alternative to DELETE for clients that don't support DELETE)
apiRoute.post(async (req, res) => {
  try {
    const { userId, fileId, filePath } = req.body;
    
    console.log('Delete request received via POST:', {
      userId,
      fileId,
      filePath
    });
    
    if (!userId || !fileId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify user is authorized to delete this file
    const billDoc = await admin.firestore().collection('bills').doc(fileId).get();
    
    if (!billDoc.exists) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const billData = billDoc.data();
    
    if (billData.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this file' });
    }
    
    // Delete from Firestore
    await admin.firestore().collection('bills').doc(fileId).delete();
    console.log(`Deleted document ${fileId} from Firestore`);
    
    // Delete from Storage if filePath is provided
    if (filePath && bucket) {
      try {
        await bucket.file(filePath).delete();
        console.log(`Deleted file ${filePath} from Storage`);
      } catch (storageError) {
        console.error('Error deleting from Storage:', storageError);
        // Continue even if Storage delete fails
      }
    }
    
    // Update user profile to remove the bill reference
    try {
      const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
      const userProfile = await userProfileRef.get();
      
      if (userProfile.exists) {
        const userData = userProfile.data();
        if (userData.bills && Array.isArray(userData.bills)) {
          const updatedBills = userData.bills.filter(bill => bill.billId !== fileId);
          await userProfileRef.update({ bills: updatedBills });
          console.log(`Updated user profile to remove bill ${fileId}`);
        }
      }
    } catch (profileError) {
      console.error('Error updating user profile:', profileError);
      // Continue even if profile update fails
    }
    
    res.status(200).json({ success: true, message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('Delete error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: error.message });
  }
});

export default apiRoute.handler(); 