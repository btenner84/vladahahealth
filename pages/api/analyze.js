import { adminDb } from '../../firebase/admin';
import {
  detectFileType,
  fetchFileBuffer,
  extractTextFromPDF,
  extractTextFromImage,
  processWithLLM
} from '../../utils/documentProcessing';
import { admin } from '../../firebase/admin';
import { db } from '../../firebase/admin';
import { fetch } from 'node-fetch';

// Add better error handling and logging for image processing
const analyzeDocument = async (fileUrl, userId, billId) => {
  console.log('Starting document analysis...', { fileUrl, billId });
  
  try {
    // Fetch the image
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Add detailed logging
    console.log('Image fetched successfully, size:', buffer.byteLength);
    
    // Convert ArrayBuffer to Buffer
    const imageBuffer = Buffer.from(buffer);
    
    // Try to get image metadata first
    try {
      const sharp = require('sharp');
      const metadata = await sharp(imageBuffer).metadata();
      console.log('Image metadata:', metadata);
    } catch (metadataError) {
      console.error('Metadata extraction failed:', metadataError);
      // Continue anyway - this is just for debugging
    }

    // Extract text with more detailed error handling
    const extractedText = await extractTextFromImage(imageBuffer);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text was extracted from the image');
    }

    console.log('Text extracted successfully, length:', extractedText.length);

    // Update document status in Firestore
    const docRef = db.collection('bills').doc(billId);
    await docRef.update({
      extractedData: extractedText,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'analyzed'
    });

    return {
      success: true,
      extractedText,
      message: 'Document analyzed successfully'
    };

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Update document status to failed
    const docRef = db.collection('bills').doc(billId);
    await docRef.update({
      status: 'failed',
      error: error.message
    });

    throw new Error(`Analysis failed: ${error.message}`);
  }
};

export default async function handler(req, res) {
  // Increase timeout for Vercel
  res.setTimeout(60000); // 60 seconds timeout

  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethod: 'POST',
      receivedMethod: req.method
    });
  }

  try {
    const { fileUrl, userId, billId } = req.body;

    if (!fileUrl || !userId || !billId) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: { fileUrl: !!fileUrl, userId: !!userId, billId: !!billId }
      });
    }

    // Verify ownership
    const billDoc = await db.collection('bills').doc(billId).get();
    if (!billDoc.exists || billDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this document' });
    }

    const result = await analyzeDocument(fileUrl, userId, billId);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: error.message || 'Analysis failed',
      details: error.toString(),
      step: 'bill_verification'
    });
  }
} 