import admin from 'firebase-admin';
import logger from '../../utils/logger';

// In-memory log store (this will be reset on server restart)
// In a production environment, you would store logs in a database
const logStore = [];

// Maximum number of logs to keep in memory
const MAX_LOGS = 100;

// Add a log entry to the in-memory store
export const addLogEntry = (entry) => {
  logStore.unshift(entry); // Add to beginning (newest first)
  
  // Keep only the most recent logs
  if (logStore.length > MAX_LOGS) {
    logStore.pop(); // Remove oldest log
  }
};

// Monkey patch the logger to store logs
const originalInfo = logger.info;
const originalWarn = logger.warn;
const originalError = logger.error;
const originalFirebaseInit = logger.firebaseInit;

logger.info = (source, message, data = null) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    source,
    message,
    data: data ? { ...data } : undefined
  };
  
  addLogEntry(entry);
  return originalInfo(source, message, data);
};

logger.warn = (source, message, data = null) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'WARN',
    source,
    message,
    data: data ? { ...data } : undefined
  };
  
  addLogEntry(entry);
  return originalWarn(source, message, data);
};

logger.error = (source, message, error = null) => {
  let entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    source,
    message
  };
  
  if (error) {
    if (error instanceof Error) {
      entry.errorMessage = error.message;
      entry.stack = error.stack;
    } else {
      entry.data = { ...error };
    }
  }
  
  addLogEntry(entry);
  return originalError(source, message, error);
};

logger.firebaseInit = (source, message, config = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    source,
    message: `Firebase Init: ${message}`,
    config: { ...config }
  };
  
  // Sanitize sensitive information
  if (entry.config.credential) {
    entry.config.credential = '[CREDENTIAL OBJECT REDACTED]';
  }
  
  if (entry.config.privateKey) {
    entry.config.privateKey = entry.config.privateKey.substring(0, 20) + '... [REDACTED]';
  }
  
  addLogEntry(entry);
  return originalFirebaseInit(source, message, config);
};

export default async function handler(req, res) {
  try {
    logger.info('logs-api', 'Retrieving recent logs');
    
    // Return the logs
    return res.status(200).json({
      success: true,
      logs: logStore
    });
  } catch (error) {
    logger.error('logs-api', 'Error retrieving logs', error);
    return res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
} 