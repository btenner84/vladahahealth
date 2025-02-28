/**
 * Helper functions for handling Firebase private keys
 * Addresses common issues with private key formats in different environments
 */

/**
 * Formats a private key to ensure it has proper newlines and structure
 * This fixes the common "DECODER routines::unsupported" error
 * 
 * @param {string} privateKey - The private key to format
 * @returns {string} - Properly formatted private key
 */
function formatPrivateKey(privateKey) {
  if (!privateKey) return null;
  
  // Remove any surrounding quotes if present
  let formattedKey = privateKey;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  
  // Replace literal \n with actual newlines if needed
  if (formattedKey.includes('\\n')) {
    formattedKey = formattedKey.replace(/\\n/g, '\n');
  }
  
  // Ensure the key has the proper header and footer
  if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = '-----BEGIN PRIVATE KEY-----\n' + formattedKey;
  }
  
  if (!formattedKey.endsWith('-----END PRIVATE KEY-----')) {
    formattedKey = formattedKey + '\n-----END PRIVATE KEY-----';
  }
  
  // Ensure there's a newline after the header and before the footer
  formattedKey = formattedKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
  formattedKey = formattedKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  
  return formattedKey;
}

/**
 * Safely decodes a base64 private key and formats it properly
 * 
 * @param {string} base64Key - Base64 encoded private key
 * @returns {string|null} - Decoded and formatted private key, or null if error
 */
function decodeAndFormatBase64Key(base64Key) {
  if (!base64Key) return null;
  
  try {
    const buffer = Buffer.from(base64Key, 'base64');
    const decodedKey = buffer.toString('utf8');
    return formatPrivateKey(decodedKey);
  } catch (error) {
    console.error('Error decoding base64 key:', error);
    return null;
  }
}

/**
 * Gets the best available private key from environment variables
 * Tries base64 encoded key first, then falls back to regular key
 * 
 * @returns {string|null} - The best available private key, properly formatted
 */
function getBestAvailableKey() {
  // Try base64 key first
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    const formattedBase64Key = decodeAndFormatBase64Key(process.env.FIREBASE_PRIVATE_KEY_BASE64);
    if (formattedBase64Key) {
      return formattedBase64Key;
    }
  }
  
  // Fall back to regular key
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  }
  
  return null;
}

module.exports = {
  formatPrivateKey,
  decodeAndFormatBase64Key,
  getBestAvailableKey
}; 