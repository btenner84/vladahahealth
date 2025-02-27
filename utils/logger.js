/**
 * Logger utility for consistent logging across the application
 * This helps with debugging Firebase and other issues
 */

// Array to store listeners
const listeners = [];

const logger = {
  /**
   * Add a listener function to receive log entries
   * @param {Function} listener - Function that will be called with each log entry
   */
  addListener: (listener) => {
    if (typeof listener === 'function') {
      listeners.push(listener);
    }
  },
  
  /**
   * Remove a listener function
   * @param {Function} listener - Function to remove
   */
  removeListener: (listener) => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  },
  
  /**
   * Notify all listeners with a log entry
   * @param {Object} logObj - The log object to send to listeners
   */
  _notifyListeners: (logObj) => {
    listeners.forEach(listener => {
      try {
        listener(logObj);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  },

  /**
   * Log information messages
   * @param {string} source - The source of the log (e.g., 'upload.js', 'firebase-init')
   * @param {string} message - The message to log
   * @param {Object} [data] - Optional data to include in the log
   */
  info: (source, message, data = null) => {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      source,
      message
    };
    
    if (data) {
      // Sanitize sensitive data
      const sanitizedData = { ...data };
      if (sanitizedData.privateKey) {
        sanitizedData.privateKey = sanitizedData.privateKey.substring(0, 20) + '... [REDACTED]';
      }
      if (sanitizedData.credential) {
        sanitizedData.credential = '[CREDENTIAL OBJECT REDACTED]';
      }
      logObj.data = sanitizedData;
    }
    
    console.log(JSON.stringify(logObj));
    logger._notifyListeners(logObj);
  },
  
  /**
   * Log warning messages
   * @param {string} source - The source of the log
   * @param {string} message - The message to log
   * @param {Object} [data] - Optional data to include in the log
   */
  warn: (source, message, data = null) => {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      source,
      message
    };
    
    if (data) {
      // Sanitize sensitive data
      const sanitizedData = { ...data };
      if (sanitizedData.privateKey) {
        sanitizedData.privateKey = sanitizedData.privateKey.substring(0, 20) + '... [REDACTED]';
      }
      if (sanitizedData.credential) {
        sanitizedData.credential = '[CREDENTIAL OBJECT REDACTED]';
      }
      logObj.data = sanitizedData;
    }
    
    console.warn(JSON.stringify(logObj));
    logger._notifyListeners(logObj);
  },
  
  /**
   * Log error messages
   * @param {string} source - The source of the log
   * @param {string} message - The message to log
   * @param {Error|Object} [error] - The error object or data to include
   */
  error: (source, message, error = null) => {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      source,
      message
    };
    
    if (error) {
      if (error instanceof Error) {
        logObj.errorMessage = error.message;
        logObj.stack = error.stack;
        
        // Include additional properties from the error
        const errorObj = {};
        Object.getOwnPropertyNames(error).forEach(key => {
          if (key !== 'message' && key !== 'stack') {
            errorObj[key] = error[key];
          }
        });
        
        if (Object.keys(errorObj).length > 0) {
          logObj.errorDetails = errorObj;
        }
      } else {
        // Sanitize sensitive data
        const sanitizedData = { ...error };
        if (sanitizedData.privateKey) {
          sanitizedData.privateKey = sanitizedData.privateKey.substring(0, 20) + '... [REDACTED]';
        }
        if (sanitizedData.credential) {
          sanitizedData.credential = '[CREDENTIAL OBJECT REDACTED]';
        }
        logObj.data = sanitizedData;
      }
    }
    
    console.error(JSON.stringify(logObj));
    logger._notifyListeners(logObj);
  },
  
  /**
   * Log Firebase-specific information
   * @param {string} source - The source of the log
   * @param {string} message - The message to log
   * @param {Object} config - Firebase configuration to log (will be sanitized)
   */
  firebaseInit: (source, message, config = {}) => {
    const sanitizedConfig = { ...config };
    
    // Sanitize sensitive information
    if (sanitizedConfig.credential) {
      sanitizedConfig.credential = '[CREDENTIAL OBJECT REDACTED]';
    }
    
    if (sanitizedConfig.privateKey) {
      sanitizedConfig.privateKey = sanitizedConfig.privateKey.substring(0, 20) + '... [REDACTED]';
    }
    
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      source,
      message: `Firebase Init: ${message}`,
      config: sanitizedConfig
    };
    
    console.log(JSON.stringify(logObj));
    logger._notifyListeners(logObj);
  }
};

module.exports = logger; 