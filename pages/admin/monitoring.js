import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

const MonitoringDashboard = () => {
  const [firebaseStatus, setFirebaseStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [logEntries, setLogEntries] = useState([]);

  useEffect(() => {
    const checkFirebaseStatus = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/firebase-test');
        setFirebaseStatus(response.data);
        setError(null);
      } catch (err) {
        console.error('Error checking Firebase status:', err);
        setError(err.response?.data || { error: err.message });
        setFirebaseStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRecentUploads = async () => {
      try {
        // This endpoint would need to be implemented
        const response = await axios.get('/api/recent-uploads');
        setRecentUploads(response.data.uploads || []);
      } catch (err) {
        console.error('Error fetching recent uploads:', err);
        // Don't set error state here to avoid overriding Firebase status errors
      }
    };

    const fetchLogEntries = async () => {
      try {
        // This endpoint would need to be implemented
        const response = await axios.get('/api/logs');
        setLogEntries(response.data.logs || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
        // Don't set error state here to avoid overriding Firebase status errors
      }
    };

    checkFirebaseStatus();
    fetchRecentUploads();
    fetchLogEntries();

    // Set up polling for regular updates
    const interval = setInterval(() => {
      checkFirebaseStatus();
      fetchRecentUploads();
      fetchLogEntries();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    Promise.all([
      axios.get('/api/firebase-test'),
      axios.get('/api/recent-uploads').catch(() => ({ data: { uploads: [] } })),
      axios.get('/api/logs').catch(() => ({ data: { logs: [] } }))
    ]).then(([firebaseRes, uploadsRes, logsRes]) => {
      setFirebaseStatus(firebaseRes.data);
      setRecentUploads(uploadsRes.data.uploads || []);
      setLogEntries(logsRes.data.logs || []);
      setError(null);
    }).catch(err => {
      console.error('Error refreshing data:', err);
      setError(err.response?.data || { error: err.message });
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container">
      <Head>
        <title>Firebase Monitoring Dashboard</title>
        <meta name="description" content="Monitor Firebase operations and file uploads" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">Firebase Monitoring Dashboard</h1>
        
        <div className="refresh-container">
          <button 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="refresh-button"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <span className="last-updated">
            Last updated: {formatTimestamp(new Date())}
          </span>
        </div>

        <div className="card">
          <h2>Firebase Status</h2>
          {isLoading && !firebaseStatus ? (
            <div className="loading">Loading Firebase status...</div>
          ) : error ? (
            <div className="error">
              <h3>Error</h3>
              <pre>{JSON.stringify(error, null, 2)}</pre>
            </div>
          ) : firebaseStatus ? (
            <div className="status-container">
              <div className={`status-indicator ${firebaseStatus.success ? 'success' : 'error'}`}>
                {firebaseStatus.success ? 'Connected' : 'Disconnected'}
              </div>
              
              <h3>Environment Variables</h3>
              <table className="env-table">
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(firebaseStatus.env || {}).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className={value.includes('Not set') ? 'error-text' : 'success-text'}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {firebaseStatus.bucket && (
                <div className="bucket-info">
                  <h3>Storage Bucket</h3>
                  <p>{firebaseStatus.bucket}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">No Firebase status data available</div>
          )}
        </div>

        <div className="card">
          <h2>Recent Uploads</h2>
          {recentUploads.length > 0 ? (
            <table className="uploads-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>User ID</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((upload, index) => (
                  <tr key={index}>
                    <td>{upload.fileName}</td>
                    <td>{upload.userId}</td>
                    <td>{(upload.fileSize / 1024).toFixed(2)} KB</td>
                    <td>{upload.fileType}</td>
                    <td>{formatTimestamp(upload.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">No recent uploads</div>
          )}
        </div>

        <div className="card">
          <h2>Recent Log Entries</h2>
          {logEntries.length > 0 ? (
            <div className="logs-container">
              {logEntries.map((log, index) => (
                <div key={index} className={`log-entry ${log.level.toLowerCase()}`}>
                  <div className="log-header">
                    <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                    <span className="log-level">{log.level}</span>
                    <span className="log-source">{log.source}</span>
                  </div>
                  <div className="log-message">{log.message}</div>
                  {log.data && (
                    <pre className="log-data">{JSON.stringify(log.data, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No log entries available</div>
          )}
        </div>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f5f5f5;
        }

        .main {
          padding: 2rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          width: 100%;
          max-width: 1200px;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 2.5rem;
          text-align: center;
          margin-bottom: 2rem;
        }

        .refresh-container {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          width: 100%;
          justify-content: space-between;
        }

        .refresh-button {
          padding: 0.5rem 1rem;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .refresh-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .last-updated {
          font-size: 0.9rem;
          color: #666;
        }

        .card {
          margin: 1rem 0;
          padding: 1.5rem;
          text-align: left;
          color: inherit;
          text-decoration: none;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          transition: color 0.15s ease, border-color 0.15s ease;
          width: 100%;
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .card h2 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 0.5rem;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100px;
          color: #666;
        }

        .error {
          background-color: #ffebee;
          padding: 1rem;
          border-radius: 4px;
          border-left: 4px solid #f44336;
        }

        .error h3 {
          margin-top: 0;
          color: #d32f2f;
        }

        .error pre {
          overflow-x: auto;
          background-color: #f8f8f8;
          padding: 0.5rem;
          border-radius: 4px;
        }

        .status-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .status-indicator {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: bold;
          text-align: center;
          width: 120px;
        }

        .status-indicator.success {
          background-color: #e8f5e9;
          color: #2e7d32;
        }

        .status-indicator.error {
          background-color: #ffebee;
          color: #d32f2f;
        }

        .env-table {
          width: 100%;
          border-collapse: collapse;
        }

        .env-table th, .env-table td {
          padding: 0.5rem;
          border: 1px solid #eaeaea;
          text-align: left;
        }

        .env-table th {
          background-color: #f5f5f5;
        }

        .error-text {
          color: #d32f2f;
        }

        .success-text {
          color: #2e7d32;
        }

        .bucket-info {
          margin-top: 1rem;
        }

        .bucket-info h3 {
          margin-bottom: 0.5rem;
        }

        .no-data {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .uploads-table {
          width: 100%;
          border-collapse: collapse;
        }

        .uploads-table th, .uploads-table td {
          padding: 0.5rem;
          border: 1px solid #eaeaea;
          text-align: left;
        }

        .uploads-table th {
          background-color: #f5f5f5;
        }

        .logs-container {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #eaeaea;
          border-radius: 4px;
        }

        .log-entry {
          padding: 0.75rem;
          border-bottom: 1px solid #eaeaea;
        }

        .log-entry:last-child {
          border-bottom: none;
        }

        .log-entry.error {
          background-color: #ffebee;
          border-left: 4px solid #f44336;
        }

        .log-entry.warn {
          background-color: #fff8e1;
          border-left: 4px solid #ffc107;
        }

        .log-entry.info {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
        }

        .log-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .log-timestamp {
          color: #666;
        }

        .log-level {
          font-weight: bold;
        }

        .log-source {
          font-family: monospace;
        }

        .log-message {
          margin-bottom: 0.5rem;
        }

        .log-data {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;
          overflow-x: auto;
          margin: 0;
        }

        @media (max-width: 600px) {
          .main {
            padding: 1rem;
          }
          
          .title {
            font-size: 1.5rem;
          }
          
          .refresh-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .env-table, .uploads-table {
            font-size: 0.9rem;
          }
          
          .log-header {
            flex-direction: column;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MonitoringDashboard; 