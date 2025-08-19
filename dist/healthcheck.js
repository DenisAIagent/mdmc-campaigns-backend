#!/usr/bin/env node
"use strict";
/**
 * Health check script for Docker container
 * Used by Docker HEALTHCHECK instruction
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const env_1 = require("./config/env");
const options = {
    hostname: 'localhost',
    port: env_1.env.API_PORT,
    path: '/health',
    method: 'GET',
    timeout: 5000,
};
const healthCheck = () => {
    return new Promise((resolve, reject) => {
        const req = http_1.default.request(options, (res) => {
            if (res.statusCode === 200) {
                resolve();
            }
            else {
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
//# sourceMappingURL=healthcheck.js.map