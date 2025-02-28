import nextConnect from 'next-connect';
import logger from '../../utils/logger';
import { getFirebaseAdmin, getStorage, getFirestore } from '../../utils/firebase-admin';

// Initialize Firebase and get storage bucket
let admin;
let bucket;
let db;

try {
  admin = getFirebaseAdmin();
  bucket = getStorage();
  db = getFirestore();
  logger.info('delete-upload', 'Firebase, Firestore, and Storage bucket initialized successfully');
} catch (error) {
  logger.error('delete-upload', 'Error initializing Firebase components', error);
}

// Create API route handler
const apiRoute = nextConnect({
  onError(error, req, res) {
    logger.error('delete-upload', 'API route error', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  },
  onNoMatch(req, res) {
    logger.warn('delete-upload', 'Method not allowed', { method: req.method });
    res.status(405).json({ error: `Method '${req.method}' not allowed` });
  },
});

// Handle DELETE request
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
    
    // Ensure we have Firebase components initialized
    if (!admin || !bucket || !db) {
      try {
        admin = getFirebaseAdmin();
        bucket = getStorage();
        db = getFirestore();
        logger.info('delete-upload', 'Firebase components reinitialized successfully');
      } catch (initError) {
        logger.error('delete-upload', 'Failed to initialize Firebase components', initError);
        return res.status(500).json({ error: 'Firebase initialization failed', message: initError.message });
      }
    }
    
    // Extract the file path from the URL
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // Find the file in Firestore
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
    
    logger.info('delete-upload', 'Delete request received via POST', {
      userId,
      fileId,
      filePath
    });
    
    if (!userId || !fileId) {
      logger.warn('delete-upload', 'Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Ensure we have Firebase components initialized
    if (!admin || !bucket || !db) {
      try {
        admin = getFirebaseAdmin();
        bucket = getStorage();
        db = getFirestore();
        logger.info('delete-upload', 'Firebase components reinitialized successfully');
      } catch (initError) {
        logger.error('delete-upload', 'Failed to initialize Firebase components', initError);
        return res.status(500).json({ error: 'Firebase initialization failed', message: initError.message });
      }
    }

    // Verify user is authorized to delete this file
    const billDoc = await db.collection('bills').doc(fileId).get();
    
    if (!billDoc.exists) {
      logger.warn('delete-upload', 'File not found', { fileId });
      return res.status(404).json({ error: 'File not found' });
    }
    
    const billData = billDoc.data();
    
    if (billData.userId !== userId) {
      logger.warn('delete-upload', 'Unauthorized to delete file', { userId, fileId });
      return res.status(403).json({ error: 'Unauthorized to delete this file' });
    }
    
    // Delete from Firestore
    await db.collection('bills').doc(fileId).delete();
    logger.info('delete-upload', 'Deleted document from Firestore', { fileId });
    
    // Delete from Storage if filePath is provided
    if (filePath && bucket) {
      try {
        await bucket.file(filePath).delete();
        logger.info('delete-upload', 'Deleted file from Storage', { filePath });
      } catch (storageError) {
        logger.error('delete-upload', 'Error deleting from Storage', storageError);
        // Continue even if Storage delete fails
      }
    }
    
    // Update user profile to remove the bill reference
    try {
      const userProfileRef = db.collection('userProfiles').doc(userId);
      const userProfile = await userProfileRef.get();
      
      if (userProfile.exists) {
        const userData = userProfile.data();
        if (userData.bills && Array.isArray(userData.bills)) {
          const updatedBills = userData.bills.filter(bill => bill.billId !== fileId);
          await userProfileRef.update({ bills: updatedBills });
          logger.info('delete-upload', 'Updated user profile to remove bill', { userId, fileId });
        }
      }
    } catch (profileError) {
      logger.error('delete-upload', 'Error updating user profile', profileError);
      // Continue even if profile update fails
    }
    
    res.status(200).json({ success: true, message: 'File deleted successfully' });
    
  } catch (error) {
    logger.error('delete-upload', 'Delete error details', error);
    res.status(500).json({ error: error.message });
  }
});

export default apiRoute; 