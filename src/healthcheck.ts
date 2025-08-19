#!/usr/bin/env node

/**
 * Health check script for Docker container
 * Used by Docker HEALTHCHECK instruction
 */

import http from 'http';
import { env } from './config/env';

const options = {
  hostname: 'localhost',
  port: env.API_PORT,
  path: '/health',
  method: 'GET',
  timeout: 5000,
};

const healthCheck = () => {
  return new Promise<void>((resolve, reject) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Health check failed with status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });

    req.end();
  });
};

healthCheck()
  .then(() => {
    console.log('Health check passed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });