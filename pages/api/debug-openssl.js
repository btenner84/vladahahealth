import logger from '../../utils/logger';
import { getFirebaseAdmin } from '../../utils/firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default async function handler(req, res) {
  try {
    logger.info('debug-openssl', 'Debug OpenSSL endpoint called');
    
    // Get OpenSSL version
    let opensslVersion = 'Unknown';
    try {
      // This is a hacky way to get the OpenSSL version
      const sign = crypto.createSign('RSA-SHA256');
      sign.update('test');
      try {
        // This will fail but the error might contain version info
        sign.sign('invalid key');
      } catch (error) {
        opensslVersion = error.toString();
      }
    } catch (error) {
      opensslVersion = `Error getting OpenSSL version: ${error.message}`;
    }
    
    // Get Node.js version
    const nodeVersion = process.version;
    
    // Test key handling
    const testResults = await testKeyHandling();
    
    // Return diagnostic information
    res.status(200).json({
      environment: process.env.NODE_ENV,
      nodeVersion,
      opensslVersion,
      testResults,
      message: 'OpenSSL diagnostic information'
    });
  } catch (error) {
    logger.error('debug-openssl', 'Error in OpenSSL debug endpoint', error);
    res.status(500).json({ error: error.message });
  }
}

async function testKeyHandling() {
  const results = {
    tests: []
  };
  
  // Test 1: Create a simple RSA key pair and sign data
  try {
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    
    const sign = crypto.createSign('SHA256');
    sign.update('test data');
    const signature = sign.sign(privateKey);
    
    results.tests.push({
      name: 'Generate and use RSA key pair',
      success: true,
      message: `Successfully generated and used RSA key pair. Signature length: ${signature.length}`
    });
  } catch (error) {
    results.tests.push({
      name: 'Generate and use RSA key pair',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
  
  // Test 2: Create a PEM file and use it
  try {
    const tempDir = os.tmpdir();
    const keyFileName = `test-key-${crypto.randomBytes(8).toString('hex')}.pem`;
    const keyFilePath = path.join(tempDir, keyFileName);
    
    // Create a test private key
    const testKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFAzpw9bqm9bxV
Ej8XyJWU4iTDHtTLtGQG1XZYbx8nE+c0Yq1UrBUGlQZlkEyBczwAUgHyOH5XymGg
yJb9aHZ6+HQYbBnOQkOFRzhtMmPBzv+TrFJEWtdcA7qC8Xh7cPpiLg6y2BbUAsuZ
RP7gHlLYSQwR5vXGbRVOFdSbGlLQnF/lHIpHi7+5r1k7VWvVd4mz0XmOGrV3rEAU
9QNBJ+AHnHDfMaLgWc1lCUKPKQ8kQFmtfTm8bgCnEVv7u2UO+PGZNc3+TOUZ1bFJ
VUG+Z9LFGMKqFvV7oQUGBwQDZ6JTlNHiL8QFfQu0qQKxJYxh8G9aPeNb6UEb1JRJ
RUDZLWGHAgMBAAECggEABEI1P6nf6Zs7mJlyBDv+Pfl5nZXQpSBpQbMvLtNjYRi5
PvFVZ8RRK3zAGHGiPYxLmjUE6B4vC2w9PIYeAPgBo/c7ZcHGZzGokFvQQjKjpLwO
ZJwbQEacJGCvQ3RucvA9Z0W+P8V7wUy1XJZaHYfy7uKHDIGmZYZFwLxjrxbW6zCB
QQyIrz3TAGUHNs5jC0EZRFQjcw+JR1ZQpQYyGEQ2HcJyXzAZCYwZG+qhekUZYGTY
YcJC9w3m5kCQIBpGJZJLDYm7iKDNdFQQWBJQNsl4vxEcKT9qFQVfn9wZvMX4jcvk
UmGZk/qdLzuXFmKI1ixgCGv7JzXHi6OQsQMXNRkYAQKBgQDxQvGDLCDzD9cJgFkB
zhDnN/W4OWTsJRbBDKyTBWr8L5JxdDvFVk4yxHeCZc0kkYGzvsX5eijialZbZTQi
QGJvQU/+4J+KVCV1Gm1jqWnRKGvUJtDOZYQQrEL5p4bsB7LnYxAOiRrRJu/oK2bP
tSJ4mYHbJUHJ7aeKKl5kXEjYAQKBgQDRHvL0dEJpO4ABDXOt/DBII0kBCh8+5r5p
Qss4ZJFQaAUgHIJLiBNwx7eRnqSswf0eeUDQ3qgWkHuMPxqhYtSxNGwWFTlTGJRE
lS3LzM9BW0iqGpTQYHfUsZ7uXgWl6CrJO4aLIBq6jE4gQg9GYbLQ0LBX3ZkE5Z6P
LQz8J0+ZBwKBgQDWJvUMNhFqS5x8vX0vYDZ3X5kQKvNbFTLm9jWZGpQD5icQYRDr
rAqIaOAIFOIHwWwpE3kxxoUrZQQT0+8QcZK6qYHYlxSdD4nxYMCHQdpG9d8GIhVZ
cz4I7UmsNQvUQXnOiAlGLQy1+6vEKjWg9eKVMFk/rwo2j32sDJMJnF0AAQKBgH+a
Pc6Tk7O0QeJW4Dt3GJxnYFxOUEKMAmwLYZXkWXmMKvWMSXYVP7iLqY0vYsA5+JxS
oEwY6dHzP2Xz+cMQ+4Yqgii3dz3ImcCwjPBEFcmCvUkRXq9zUZPrJnqFCKgEjjnR
3pXvhLxlYyLkKwO4ELqiizFhb9DWl8nnFfLGPTi5AoGBAMV/Gb3Vw5FmPulvI5Xt
LFrKsekSFJJ4Q3QVbnwp8desHUKT3MKLM5amQJvYXXKpNqAQrFhwVQBVlgJnPQJX
ipbHoQ8AKi6cQKPxDXVizKzK5HRQGFxOCG+Ky+gQcgQYWK8DVwKJnUvG9tnKJxQk
wLeNwEVQGvz5K6L+B6/l0idl
-----END PRIVATE KEY-----`;
    
    // Write the key to a temporary file
    fs.writeFileSync(keyFilePath, testKey, { mode: 0o600 });
    
    // Try to use the key
    const sign = crypto.createSign('SHA256');
    sign.update('test data');
    const signature = sign.sign(fs.readFileSync(keyFilePath));
    
    // Clean up
    fs.unlinkSync(keyFilePath);
    
    results.tests.push({
      name: 'Use PEM file',
      success: true,
      message: `Successfully used PEM file. Signature length: ${signature.length}`
    });
  } catch (error) {
    results.tests.push({
      name: 'Use PEM file',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
  
  // Test 3: Create a service account JSON file and use it
  try {
    const tempDir = os.tmpdir();
    const keyFileName = `test-sa-${crypto.randomBytes(8).toString('hex')}.json`;
    const keyFilePath = path.join(tempDir, keyFileName);
    
    // Create a test service account
    const serviceAccount = {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: crypto.randomBytes(16).toString('hex'),
      private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDFAzpw9bqm9bxV
Ej8XyJWU4iTDHtTLtGQG1XZYbx8nE+c0Yq1UrBUGlQZlkEyBczwAUgHyOH5XymGg
yJb9aHZ6+HQYbBnOQkOFRzhtMmPBzv+TrFJEWtdcA7qC8Xh7cPpiLg6y2BbUAsuZ
RP7gHlLYSQwR5vXGbRVOFdSbGlLQnF/lHIpHi7+5r1k7VWvVd4mz0XmOGrV3rEAU
9QNBJ+AHnHDfMaLgWc1lCUKPKQ8kQFmtfTm8bgCnEVv7u2UO+PGZNc3+TOUZ1bFJ
VUG+Z9LFGMKqFvV7oQUGBwQDZ6JTlNHiL8QFfQu0qQKxJYxh8G9aPeNb6UEb1JRJ
RUDZLWGHAgMBAAECggEABEI1P6nf6Zs7mJlyBDv+Pfl5nZXQpSBpQbMvLtNjYRi5
PvFVZ8RRK3zAGHGiPYxLmjUE6B4vC2w9PIYeAPgBo/c7ZcHGZzGokFvQQjKjpLwO
ZJwbQEacJGCvQ3RucvA9Z0W+P8V7wUy1XJZaHYfy7uKHDIGmZYZFwLxjrxbW6zCB
QQyIrz3TAGUHNs5jC0EZRFQjcw+JR1ZQpQYyGEQ2HcJyXzAZCYwZG+qhekUZYGTY
YcJC9w3m5kCQIBpGJZJLDYm7iKDNdFQQWBJQNsl4vxEcKT9qFQVfn9wZvMX4jcvk
UmGZk/qdLzuXFmKI1ixgCGv7JzXHi6OQsQMXNRkYAQKBgQDxQvGDLCDzD9cJgFkB
zhDnN/W4OWTsJRbBDKyTBWr8L5JxdDvFVk4yxHeCZc0kkYGzvsX5eijialZbZTQi
QGJvQU/+4J+KVCV1Gm1jqWnRKGvUJtDOZYQQrEL5p4bsB7LnYxAOiRrRJu/oK2bP
tSJ4mYHbJUHJ7aeKKl5kXEjYAQKBgQDRHvL0dEJpO4ABDXOt/DBII0kBCh8+5r5p
Qss4ZJFQaAUgHIJLiBNwx7eRnqSswf0eeUDQ3qgWkHuMPxqhYtSxNGwWFTlTGJRE
lS3LzM9BW0iqGpTQYHfUsZ7uXgWl6CrJO4aLIBq6jE4gQg9GYbLQ0LBX3ZkE5Z6P
LQz8J0+ZBwKBgQDWJvUMNhFqS5x8vX0vYDZ3X5kQKvNbFTLm9jWZGpQD5icQYRDr
rAqIaOAIFOIHwWwpE3kxxoUrZQQT0+8QcZK6qYHYlxSdD4nxYMCHQdpG9d8GIhVZ
cz4I7UmsNQvUQXnOiAlGLQy1+6vEKjWg9eKVMFk/rwo2j32sDJMJnF0AAQKBgH+a
Pc6Tk7O0QeJW4Dt3GJxnYFxOUEKMAmwLYZXkWXmMKvWMSXYVP7iLqY0vYsA5+JxS
oEwY6dHzP2Xz+cMQ+4Yqgii3dz3ImcCwjPBEFcmCvUkRXq9zUZPrJnqFCKgEjjnR
3pXvhLxlYyLkKwO4ELqiizFhb9DWl8nnFfLGPTi5AoGBAMV/Gb3Vw5FmPulvI5Xt
LFrKsekSFJJ4Q3QVbnwp8desHUKT3MKLM5amQJvYXXKpNqAQrFhwVQBVlgJnPQJX
ipbHoQ8AKi6cQKPxDXVizKzK5HRQGFxOCG+Ky+gQcgQYWK8DVwKJnUvG9tnKJxQk
wLeNwEVQGvz5K6L+B6/l0idl
-----END PRIVATE KEY-----`,
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com'
    };
    
    // Write the service account to a temporary file
    fs.writeFileSync(keyFilePath, JSON.stringify(serviceAccount, null, 2), { mode: 0o600 });
    
    // Try to read the file to verify it was written correctly
    const fileContent = fs.readFileSync(keyFilePath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Clean up
    fs.unlinkSync(keyFilePath);
    
    results.tests.push({
      name: 'Create service account JSON file',
      success: true,
      message: `Successfully created and read service account JSON file. Private key length: ${parsedContent.private_key.length}`
    });
  } catch (error) {
    results.tests.push({
      name: 'Create service account JSON file',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
  
  // Test 4: Try to initialize Firebase Admin
  try {
    const admin = getFirebaseAdmin();
    results.tests.push({
      name: 'Initialize Firebase Admin',
      success: true,
      message: 'Successfully initialized Firebase Admin'
    });
  } catch (error) {
    results.tests.push({
      name: 'Initialize Firebase Admin',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
  
  return results;
} 