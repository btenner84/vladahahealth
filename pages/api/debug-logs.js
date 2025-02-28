import logger from '../../utils/logger';

// In-memory log storage (will reset on server restart)
const recentLogs = [];
const MAX_LOGS = 100;

// Add a listener to capture logs
logger.addListener((logEntry) => {
  recentLogs.unshift(logEntry); // Add to beginning
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.pop(); // Remove oldest
  }
});

export default async function handler(req, res) {
  try {
    logger.info('debug-logs', 'Debug logs endpoint called');
    
    // Get query parameters
    const limit = parseInt(req.query.limit) || 50;
    const source = req.query.source || null;
    const level = req.query.level || null;
    
    // Filter logs
    let filteredLogs = [...recentLogs];
    
    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level.toUpperCase());
    }
    
    // Limit the number of logs
    filteredLogs = filteredLogs.slice(0, limit);
    
    // Return logs
    res.status(200).json({
      count: filteredLogs.length,
      logs: filteredLogs,
      filters: {
        source,
        level,
        limit
      },
      message: 'Recent application logs'
    });
  } catch (error) {
    logger.error('debug-logs', 'Error in debug logs endpoint', error);
    res.status(500).json({ error: error.message });
  }
} 