import { adminDb } from '../../firebase/admin';
import {
  detectFileType,
  fetchFileBuffer,
  extractTextFromPDF,
  extractTextFromImage,
  processWithLLM
} from '../../utils/documentProcessing';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { billId, fileUrl, userId } = req.body;
    console.log('Starting analysis for billId:', billId);
    console.log('File URL:', fileUrl);
    console.log('User ID:', userId);

    if (!billId || !fileUrl || !userId) {
      console.error('Missing parameters:', { billId, fileUrl, userId });
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: `Required: ${!billId ? 'billId, ' : ''}${!fileUrl ? 'fileUrl, ' : ''}${!userId ? 'userId' : ''}`.trim()
      });
    }

    // Verify user owns this bill
    try {
      const billRef = adminDb.doc(`bills/${billId}`);
      const bill = await billRef.get();
      
      if (!bill.exists) {
        return res.status(404).json({ error: 'Bill not found' });
      }
      
      if (bill.data().userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to bill' });
      }
    } catch (error) {
      console.error('Bill verification failed:', error);
      return res.status(500).json({
        error: 'Bill verification failed',
        details: error.message,
        step: 'bill_verification'
      });
    }

    // 1. Detect file type
    let fileType;
    try {
      console.log('Detecting file type...');
      fileType = await detectFileType(fileUrl);
      console.log('File type detected:', fileType);
    } catch (error) {
      console.error('File type detection failed:', error);
      return res.status(500).json({
        error: 'File type detection failed',
        details: error.message,
        step: 'file_type_detection'
      });
    }
    
    // 2. Fetch file buffer
    let fileBuffer;
    try {
      console.log('Fetching file buffer...');
      fileBuffer = await fetchFileBuffer(fileUrl);
      console.log('File buffer fetched, size:', fileBuffer.length);
    } catch (error) {
      console.error('File buffer fetch failed:', error);
      return res.status(500).json({
        error: 'File buffer fetch failed',
        details: error.message,
        step: 'file_buffer_fetch'
      });
    }
    
    // 3. Extract text
    let extractedText;
    try {
      console.log('Starting text extraction...');
      console.log('File type:', fileType);
      
      if (fileType === 'pdf') {
        console.log('Extracting text from PDF...');
        extractedText = await extractTextFromPDF(fileBuffer);
      } else {
        console.log('Extracting text from image using OCR...');
        extractedText = await extractTextFromImage(fileBuffer);
      }
      
      console.log('Text extraction successful!');
      console.log('Extracted text length:', extractedText.length);
      console.log('First 200 characters of extracted text:', extractedText.substring(0, 200));
      
      // Save the extracted text to Firestore for debugging
      try {
        const billRef = adminDb.doc(`bills/${billId}`);
        await billRef.update({
          extractedText: extractedText,
          extractedAt: new Date().toISOString()
        });
        console.log('Saved extracted text to Firestore');
      } catch (error) {
        console.error('Failed to save extracted text:', error);
      }

    } catch (error) {
      console.error('Text extraction failed:', error);
      return res.status(500).json({
        error: 'Text extraction failed',
        details: error.message,
        step: 'text_extraction'
      });
    }
    
    // 4. Process with LLM
    try {
      console.log('Starting LLM processing...');
      console.log('OpenAI API Key format check:', 
        process.env.OPENAI_API_KEY ? 
        `Key starts with: ${process.env.OPENAI_API_KEY.substring(0, 7)}...` : 
        'No API key found');
      
      const structuredData = await processWithLLM(extractedText);
      console.log('LLM processing complete');
      
      // 5. Update Firestore
      try {
        console.log('Updating Firestore...');
        const billRef = adminDb.doc(`bills/${billId}`);
        await billRef.update({
          extractedData: structuredData,
          analyzedAt: new Date().toISOString()
        });
        console.log('Firestore updated successfully');
      } catch (error) {
        console.error('Firestore update failed:', error);
        return res.status(500).json({
          error: 'Firestore update failed',
          details: error.message,
          step: 'firestore_update'
        });
      }

      return res.status(200).json(structuredData);
    } catch (error) {
      console.error('LLM processing failed:', error);
      return res.status(500).json({
        error: 'LLM processing failed',
        details: error.message,
        step: 'llm_processing'
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Unexpected error',
      details: error.message,
      step: 'unknown'
    });
  }
} 