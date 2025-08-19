"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const database_1 = require("@/config/database");
const redis_1 = require("@/config/redis");
const env_1 = require("@/config/env");
const errors_1 = require("@/utils/errors");
class AuthService {
    jwtSecret = env_1.env.JWT_SECRET;
    jwtRefreshSecret = env_1.env.JWT_REFRESH_SECRET;
    jwtExpiresIn = env_1.env.JWT_EXPIRES_IN;
    jwtRefreshExpiresIn = env_1.env.JWT_REFRESH_EXPIRES_IN;
    async signup(data) {
        // Check if user already exists
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existingUser) {
            throw new errors_1.ConflictError('User with this email already exists');
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(data.password, env_1.env.BCRYPT_ROUNDS);
        // Create user
        const user = await database_1.prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role || client_1.UserRole.CLIENT,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        // Create client account for CLIENT role
        if (user.role === client_1.UserRole.CLIENT) {
            await database_1.prisma.clientAccount.create({
                data: {
                    userId: user.id,
                },
            });
        }
        // Generate tokens
        const tokens = await this.generateTokens(user);
        // Update last login
        await this.updateLastLogin(user.id);
        return {
            user,
            ...tokens,
        };
    }
    async login(data) {
        // Find user
        const user = await database_1.prisma.user.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid credentials');
        }
        if (!user.isActive) {
            throw new errors_1.AuthenticationError('Account is deactivated');
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new errors_1.AuthenticationError('Invalid credentials');
        }
        // Generate tokens
        const tokens = await this.generateTokens(user);
        // Update last login
        await this.updateLastLogin(user.id);
        // Return user without password
        const { passwordHash, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            ...tokens,
        };
    }
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, this.jwtRefreshSecret);
            // Check if refresh token exists in database
            const storedToken = await database_1.prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true },
            });
            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new errors_1.AuthenticationError('Invalid or expired refresh token');
            }
            if (!storedToken.user.isActive) {
                throw new errors_1.AuthenticationError('Account is deactivated');
            }
            // Generate new tokens
            const tokens = await this.generateTokens(storedToken.user);
            // Remove old refresh token
            await database_1.prisma.refreshToken.delete({
                where: { id: storedToken.id },
            });
            // Return user without password
            const { passwordHash, ...userWithoutPassword } = storedToken.user;
            return {
                user: userWithoutPassword,
                ...tokens,
            };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AuthenticationError('Refresh token expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AuthenticationError('Invalid refresh token');
            }
            throw error;
        }
    }
    async logout(refreshToken) {
        // Remove refresh token from database
        await database_1.prisma.refreshToken.deleteMany({
            where: { token: refreshToken },
        });
        // Optionally, add access token to blacklist in Redis
        // This would require checking the blacklist in the auth middleware
    }
    async logoutAll(userId) {
        // Remove all refresh tokens for the user
        await database_1.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Verify current password
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new errors_1.AuthenticationError('Current password is incorrect');
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, env_1.env.BCRYPT_ROUNDS);
        // Update password
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        // Logout from all devices
        await this.logoutAll(userId);
    }
    async requestPasswordReset(email) {
        const user = await database_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            // Don't reveal that the user doesn't exist
            return;
        }
        // Generate reset token
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'password_reset' }, this.jwtSecret, { expiresIn: '1h' });
        // Store reset token in Redis with 1 hour expiration
        await redis_1.redis.set(`password_reset:${user.id}`, resetToken, 3600);
        // TODO: Send password reset email
        // await emailService.sendPasswordResetEmail(user.email, resetToken);
    }
    async resetPassword(token, newPassword) {
        try {
            // Verify reset token
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            if (decoded.type !== 'password_reset') {
                throw new errors_1.AuthenticationError('Invalid reset token');
            }
            // Check if token exists in Redis
            const storedToken = await redis_1.redis.get(`password_reset:${decoded.userId}`);
            if (!storedToken || storedToken !== token) {
                throw new errors_1.AuthenticationError('Invalid or expired reset token');
            }
            // Hash new password
            const passwordHash = await bcryptjs_1.default.hash(newPassword, env_1.env.BCRYPT_ROUNDS);
            // Update password
            await database_1.prisma.user.update({
                where: { id: decoded.userId },
                data: { passwordHash },
            });
            // Remove reset token
            await redis_1.redis.del(`password_reset:${decoded.userId}`);
            // Logout from all devices
            await this.logoutAll(decoded.userId);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.AuthenticationError('Reset token expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new errors_1.AuthenticationError('Invalid reset token');
            }
            throw error;
        }
    }
    async generateTokens(user) {
        // Generate access token
        const accessTokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn,
        });
        // Generate refresh token
        const refreshTokenPayload = {
            userId: user.id,
        };
        const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, this.jwtRefreshSecret, {
            expiresIn: this.jwtRefreshExpiresIn,
        });
        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        await database_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt,
            },
        });
        // Clean up expired refresh tokens
        await this.cleanupExpiredTokens(user.id);
        // Get token expiration time
        const decoded = jsonwebtoken_1.default.decode(accessToken);
        const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
        return {
            accessToken,
            refreshToken,
            expiresIn,
        };
    }
    async updateLastLogin(userId) {
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }
    async cleanupExpiredTokens(userId) {
        await database_1.prisma.refreshToken.deleteMany({
            where: {
                userId,
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
    async getUserById(userId) {
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user;
    }
    async updateProfile(userId, data) {
        const user = await database_1.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return user;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map