"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiKey = exports.requireOwnership = exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
const client_1 = require("@prisma/client");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.AuthenticationError('Token not provided');
        }
        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AuthenticationError('Token expired');
            }
            throw new errors_1.AuthenticationError('Invalid token');
        }
        // Verify user still exists and is active
        const user = await database_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            throw new errors_1.AuthenticationError('User not found or inactive');
        }
        // Attach user to request
        req.user = user;
        req.userId = user.id;
        req.userRole = user.role;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.userRole) {
                throw new errors_1.AuthenticationError('Authentication required');
            }
            if (!allowedRoles.includes(req.userRole)) {
                throw new errors_1.AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authorize = authorize;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                },
            });
            if (user && user.isActive) {
                req.user = user;
                req.userId = user.id;
                req.userRole = user.role;
            }
        }
        catch {
            // Ignore errors for optional auth
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.optionalAuth = optionalAuth;
// Middleware to ensure the user owns the resource
const requireOwnership = (resourceParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.userId) {
                throw new errors_1.AuthenticationError('Authentication required');
            }
            const resourceId = req.params[resourceParam];
            if (!resourceId) {
                throw new errors_1.AuthenticationError('Resource ID not provided');
            }
            // For CLIENT role, ensure they can only access their own resources
            if (req.userRole === client_1.UserRole.CLIENT) {
                // This will be implemented per resource type in the controllers
                req.params.ownerId = req.userId;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireOwnership = requireOwnership;
// Middleware to validate API key for webhooks
const validateApiKey = (validApiKey) => {
    return (req, res, next) => {
        try {
            const apiKey = req.headers['x-api-key'] || req.query.api_key;
            if (!apiKey || apiKey !== validApiKey) {
                throw new errors_1.AuthenticationError('Invalid API key');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validateApiKey = validateApiKey;
//# sourceMappingURL=auth.js.map