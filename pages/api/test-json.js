export default function handler(req, res) {
  try {
    // Return a simple JSON response
    res.status(200).json({ 
      success: true, 
      message: 'JSON response is working correctly',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-json endpoint:', error);
    res.status(500).json({ 
      error: 'Server error', 
      message: error.message 
    });
  }
} 