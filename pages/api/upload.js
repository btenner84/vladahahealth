import multer from 'multer';
import nextConnect from 'next-connect';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
let firebaseAdmin;
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'vladahealth-b2a00.appspot.com'
    });
    console.log('Firebase Admin initialized in API route');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
} else {
  firebaseAdmin = admin.app();
  console.log('Using existing Firebase Admin app');
}

// Get storage bucket
const bucket = admin.storage().bucket();
const db = admin.firestore();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage()
});

// Create API route handler
const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error('API route error:', error);
    res.status(501).json({ error: `Sorry something went wrong! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

// Use multer middleware
apiRoute.use(upload.single('file'));

// Handle POST requests
apiRoute.post(async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      userId: req.body.userId,
      fileName: req.body.fileName
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId;
    const fileName = req.body.fileName;
    const timestamp = Date.now();
    const destination = `bills/${userId}/${timestamp}_${fileName}`;
    
    console.log(`Uploading file to ${destination}`);
    
    // Upload file to Firebase Storage using buffer
    await bucket.file(destination).save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          userId,
          fileName,
          timestamp: timestamp.toString()
        }
      }
    });
    
    // Get download URL
    const [url] = await bucket.file(destination).getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future expiration
    });
    
    res.status(200).json({ 
      success: true, 
      downloadURL: url,
      fileName,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      timestamp
    });
    
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: error.message });
  }
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
}; 