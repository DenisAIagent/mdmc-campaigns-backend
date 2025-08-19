"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const authService_1 = require("@/services/authService");
const logger_1 = require("@/utils/logger");
class AuthController {
    async signup(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;
            const result = await authService_1.authService.signup({
                email,
                password,
                firstName,
                lastName,
            });
            logger_1.logger.info('User signed up successfully', { userId: result.user.id, email: result.user.email });
            const response = {
                success: true,
                data: result,
                message: 'Account created successfully',
            };
            res.status(201).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService_1.authService.login({ email, password });
            logger_1.logger.info('User logged in successfully', { userId: result.user.id, email: result.user.email });
            const response = {
                success: true,
                data: result,
                message: 'Logged in successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await authService_1.authService.refreshToken(refreshToken);
            logger_1.logger.info('Token refreshed successfully', { userId: result.user.id });
            const response = {
                success: true,
                data: result,
                message: 'Token refreshed successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await authService_1.authService.logout(refreshToken);
            logger_1.logger.info('User logged out successfully', { userId: req.userId });
            const response = {
                success: true,
                message: 'Logged out successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async logoutAll(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            await authService_1.authService.logoutAll(req.userId);
            logger_1.logger.info('User logged out from all devices', { userId: req.userId });
            const response = {
                success: true,
                message: 'Logged out from all devices successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getMe(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const user = await authService_1.authService.getUserById(req.userId);
            if (!user) {
                return next(new Error('User not found'));
            }
            const response = {
                success: true,
                data: { user },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { firstName, lastName } = req.body;
            const user = await authService_1.authService.updateProfile(req.userId, {
                firstName,
                lastName,
            });
            logger_1.logger.info('User profile updated', { userId: req.userId });
            const response = {
                success: true,
                data: { user },
                message: 'Profile updated successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async changePassword(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { currentPassword, newPassword } = req.body;
            await authService_1.authService.changePassword(req.userId, currentPassword, newPassword);
            logger_1.logger.info('User password changed', { userId: req.userId });
            const response = {
                success: true,
                message: 'Password changed successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;
            await authService_1.authService.requestPasswordReset(email);
            logger_1.logger.info('Password reset requested', { email });
            const response = {
                success: true,
                message: 'If the email exists, a password reset link has been sent',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            await authService_1.authService.resetPassword(token, newPassword);
            logger_1.logger.info('Password reset completed');
            const response = {
                success: true,
                message: 'Password reset successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=authController.js.map