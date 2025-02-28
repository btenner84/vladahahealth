import logger from '../../utils/logger';
import { getFirebaseAdmin, getStorage } from '../../utils/firebase-admin';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    logger.info('upload-simple', 'Upload request received');
    
    // Initialize Firebase and get storage bucket
    let admin;
    let bucket;
    
    try {
      admin = getFirebaseAdmin();
      bucket = getStorage();
      logger.info('upload-simple', 'Firebase and Storage bucket initialized successfully');
    } catch (error) {
      logger.error('upload-simple', 'Error initializing Firebase or Storage bucket', error);
      return res.status(500).json({ 
        error: 'Firebase initialization failed', 
        message: error.message 
      });
    }
    
    // This is a simplified endpoint that doesn't actually upload a file
    // It just tests if we can return a proper JSON response
    
    return res.status(200).json({ 
      success: true, 
      message: 'Upload endpoint is working correctly',
      timestamp: new Date().toISOString(),
      bucketName: bucket.name
    });
    
  } catch (error) {
    logger.error('upload-simple', 'Upload error details', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
} 