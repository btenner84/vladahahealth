import logger from '../../utils/logger';

export default async function handler(req, res) {
  try {
    logger.info('debug-firebase-key', 'Debug endpoint called');
    
    // Get environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    
    // Check for private keys
    const hasRegularKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasBase64Key = !!process.env.FIREBASE_PRIVATE_KEY_BASE64;
    
    // Process regular key if available
    let regularKeyInfo = { available: hasRegularKey };
    if (hasRegularKey) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      regularKeyInfo = {
        ...regularKeyInfo,
        length: privateKey.length,
        startsWithQuotes: privateKey.startsWith('"'),
        endsWithQuotes: privateKey.endsWith('"'),
        containsLiteralNewlines: privateKey.includes('\\n'),
        containsActualNewlines: privateKey.includes('\n'),
        containsBeginMarker: privateKey.includes('BEGIN PRIVATE KEY'),
        containsEndMarker: privateKey.includes('END PRIVATE KEY'),
      };
      
      // Try to format the key
      try {
        // Remove quotes if present
        let formattedKey = privateKey;
        if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
          formattedKey = formattedKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines
        if (formattedKey.includes('\\n')) {
          formattedKey = formattedKey.replace(/\\n/g, '\n');
        }
        
        // Strip headers and footers if present
        let keyContent = formattedKey;
        keyContent = keyContent.replace(/-----BEGIN PRIVATE KEY-----/g, '');
        keyContent = keyContent.replace(/-----END PRIVATE KEY-----/g, '');
        
        // Remove all whitespace, newlines, etc.
        keyContent = keyContent.replace(/\s/g, '');
        
        // Create a properly formatted private key with explicit structure
        const finalKey = `-----BEGIN PRIVATE KEY-----\n${
          keyContent.match(/.{1,64}/g).join('\n')
        }\n-----END PRIVATE KEY-----\n`;
        
        regularKeyInfo.formattedKeyLength = finalKey.length;
        regularKeyInfo.formattedKeyStartsWithHeader = finalKey.startsWith('-----BEGIN PRIVATE KEY-----');
        regularKeyInfo.formattedKeyEndsWithFooter = finalKey.endsWith('-----END PRIVATE KEY-----\n');
        regularKeyInfo.formattedKeyNewlineCount = (finalKey.match(/\n/g) || []).length;
        regularKeyInfo.formattingSuccess = true;
      } catch (error) {
        regularKeyInfo.formattingSuccess = false;
        regularKeyInfo.formattingError = error.message;
      }
    }
    
    // Process base64 key if available
    let base64KeyInfo = { available: hasBase64Key };
    if (hasBase64Key) {
      const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
      
      base64KeyInfo = {
        ...base64KeyInfo,
        length: base64Key.length,
      };
      
      // Try to decode and format the key
      try {
        const buffer = Buffer.from(base64Key, 'base64');
        const decodedKey = buffer.toString('utf8');
        
        base64KeyInfo.decodedKeyLength = decodedKey.length;
        base64KeyInfo.decodedKeyContainsBeginMarker = decodedKey.includes('BEGIN PRIVATE KEY');
        base64KeyInfo.decodedKeyContainsEndMarker = decodedKey.includes('END PRIVATE KEY');
        base64KeyInfo.decodedKeyContainsNewlines = decodedKey.includes('\n');
        
        // Try to format the decoded key
        try {
          // Strip headers and footers if present
          let keyContent = decodedKey;
          keyContent = keyContent.replace(/-----BEGIN PRIVATE KEY-----/g, '');
          keyContent = keyContent.replace(/-----END PRIVATE KEY-----/g, '');
          
          // Remove all whitespace, newlines, etc.
          keyContent = keyContent.replace(/\s/g, '');
          
          // Create a properly formatted private key with explicit structure
          const finalKey = `-----BEGIN PRIVATE KEY-----\n${
            keyContent.match(/.{1,64}/g).join('\n')
          }\n-----END PRIVATE KEY-----\n`;
          
          base64KeyInfo.formattedKeyLength = finalKey.length;
          base64KeyInfo.formattedKeyStartsWithHeader = finalKey.startsWith('-----BEGIN PRIVATE KEY-----');
          base64KeyInfo.formattedKeyEndsWithFooter = finalKey.endsWith('-----END PRIVATE KEY-----\n');
          base64KeyInfo.formattedKeyNewlineCount = (finalKey.match(/\n/g) || []).length;
          base64KeyInfo.formattingSuccess = true;
        } catch (error) {
          base64KeyInfo.formattingSuccess = false;
          base64KeyInfo.formattingError = error.message;
        }
      } catch (error) {
        base64KeyInfo.decodingSuccess = false;
        base64KeyInfo.decodingError = error.message;
      }
    }
    
    // Return diagnostic information
    res.status(200).json({
      environment: process.env.NODE_ENV,
      projectId,
      clientEmail,
      storageBucket,
      regularKey: regularKeyInfo,
      base64Key: base64KeyInfo,
      message: 'Firebase key diagnostic information',
    });
  } catch (error) {
    logger.error('debug-firebase-key', 'Error in debug endpoint', error);
    res.status(500).json({ error: error.message });
  }
} 