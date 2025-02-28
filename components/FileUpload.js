import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ userId }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null); // Clear any previous errors
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('fileName', file.name);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      console.log('Upload successful:', response.data);
      setUploadedFile(response.data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Upload error:', err);
      
      // Extract the most useful error message
      let errorMessage = 'File upload failed';
      
      if (err.response) {
        // The server responded with an error
        console.error('Server error response:', err.response.data);
        errorMessage = err.response.data.error || `Server error: ${err.response.status}`;
        
        // Check for specific Firebase errors
        if (err.response.data.error === 'Storage bucket not initialized') {
          errorMessage = 'Storage service is currently unavailable. Please try again later.';
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setError(`${errorMessage} - Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(handleUpload, 2000); // Retry after 2 seconds
      } else {
        setError(`${errorMessage} - Max retries reached. Please try again later.`);
        setRetryCount(0); // Reset retry count
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    handleUpload();
  };

  return (
    <div className="file-upload-container">
      <h2>Upload File</h2>
      
      <div className="file-input-container">
        <input 
          type="file" 
          onChange={handleFileChange} 
          disabled={uploading}
          className="file-input"
        />
        {file && <p className="selected-file">Selected: {file.name}</p>}
      </div>
      
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        className="upload-button"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      
      {uploading && (
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          {retryCount >= MAX_RETRIES && (
            <button onClick={handleRetry} className="retry-button">
              Try Again
            </button>
          )}
        </div>
      )}
      
      {uploadedFile && !error && (
        <div className="success-container">
          <p className="success-message">File uploaded successfully!</p>
          <a 
            href={uploadedFile.downloadURL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="download-link"
          >
            View Uploaded File
          </a>
        </div>
      )}
      
      <style jsx>{`
        .file-upload-container {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .file-input-container {
          margin-bottom: 15px;
        }
        
        .selected-file {
          margin-top: 5px;
          font-size: 14px;
          color: #666;
        }
        
        .upload-button {
          padding: 10px 15px;
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .upload-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .progress-container {
          margin-top: 15px;
          height: 20px;
          background-color: #f5f5f5;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar {
          height: 100%;
          background-color: #4caf50;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: #333;
        }
        
        .error-container {
          margin-top: 15px;
          padding: 10px;
          background-color: #ffebee;
          border-radius: 4px;
          border-left: 4px solid #f44336;
        }
        
        .error-message {
          color: #d32f2f;
          margin: 0;
        }
        
        .retry-button {
          margin-top: 10px;
          padding: 5px 10px;
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .success-container {
          margin-top: 15px;
          padding: 10px;
          background-color: #e8f5e9;
          border-radius: 4px;
          border-left: 4px solid #4caf50;
        }
        
        .success-message {
          color: #2e7d32;
          margin: 0 0 10px 0;
        }
        
        .download-link {
          color: #4285f4;
          text-decoration: none;
        }
        
        .download-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default FileUpload; 