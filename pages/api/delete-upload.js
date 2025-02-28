import admin from 'firebase-admin';
import { createRouter } from 'next-connect';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Try to use the service account from environment variable first
    let serviceAccount;
    let storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'vladahealth-b2a00.firebasestorage.app';
    
    console.log('Using storage bucket:', storageBucket);
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Using Firebase service account from environment variable');
      } catch (e) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', e);
      }
    }
    
    // If not available or invalid, try to use the local file
    if (!serviceAccount) {
      try {
        // Use a direct require instead of dynamic require
        if (fs.existsSync(path.join(process.cwd(), 'serviceAccountKey.json'))) {
          serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8'));
          console.log('Using Firebase service account from local file');
        }
      } catch (e) {
        console.error('Error loading local service account file:', e);
      }
    }
    
    // If still not available, use a direct configuration
    if (!serviceAccount) {
      console.log('Using direct Firebase configuration from environment variables');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        storageBucket: storageBucket
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: storageBucket
      });
    }
    
    console.log('Firebase Admin initialized in delete API route');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.log('Using existing Firebase Admin app');
}

// Get storage bucket
let bucket;
try {
  bucket = admin.storage().bucket();
  console.log('Storage bucket initialized:', bucket.name);
} catch (error) {
  console.error('Error getting storage bucket:', error);
}

// Create API route handler
const apiRoute = createRouter({
  onError(error, req, res) {
    console.error('Delete API route error:', error);
    res.status(501).json({ error: `Sorry something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Handle DELETE requests
apiRoute.delete(async (req, res) => {
  try {
    const { userId, fileId, filePath } = req.query;
    
    console.log('Delete request received:', {
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