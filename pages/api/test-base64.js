export default function handler(req, res) {
  try {
    // Check if we have a base64 encoded key
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      try {
        // Decode the base64 string
        const buffer = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
        const decodedKey = buffer.toString('utf8');
        
        // Return success with partial key info for security
        return res.status(200).json({ 
          success: true, 
          message: 'Base64 key decoded successfully',
          keyInfo: {
            length: decodedKey.length,
            startsWithCorrectHeader: decodedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
            endsWithCorrectFooter: decodedKey.endsWith('-----END PRIVATE KEY-----\n') || decodedKey.endsWith('-----END PRIVATE KEY-----'),
            containsNewlines: decodedKey.includes('\n')
          }
        });
      } catch (decodeError) {
        return res.status(500).json({ 
          error: 'Error decoding base64 key', 
          message: decodeError.message
        });
      }
    } else {
      return res.status(404).json({ 
        error: 'Base64 key not found', 
        message: 'FIREBASE_PRIVATE_KEY_BASE64 environment variable is not set'
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      error: 'Unexpected error', 
      message: error.message
    });
  }
} 