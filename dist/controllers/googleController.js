"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleController = exports.GoogleController = void 0;
const googleAdsService_1 = require("@/services/googleAdsService");
const logger_1 = require("@/utils/logger");
class GoogleController {
    async generateOAuthUrl(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const authUrl = await googleAdsService_1.googleAdsService.generateOAuthUrl(req.userId);
            const response = {
                success: true,
                data: { authUrl },
                message: 'OAuth URL generated successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async handleOAuthCallback(req, res, next) {
        try {
            const { code, state } = req.body;
            const result = await googleAdsService_1.googleAdsService.handleOAuthCallback(code, state);
            logger_1.logger.info('Google OAuth callback processed successfully', { userId: result.userId });
            const response = {
                success: true,
                data: result,
                message: 'Google authentication successful',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async createLinkRequest(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const { customerId } = req.body;
            await googleAdsService_1.googleAdsService.createCustomerClientLink(req.userId, customerId);
            logger_1.logger.info('Google Ads link request created', { userId: req.userId, customerId });
            const response = {
                success: true,
                message: 'Link request sent successfully',
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
    async getLinkStatus(req, res, next) {
        try {
            if (!req.userId) {
                return next(new Error('User ID not found'));
            }
            const linkStatus = await googleAdsService_1.googleAdsService.checkLinkStatus(req.userId);
            const response = {
                success: true,
                data: { linkStatus },
            };
            res.status(200).json(response);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GoogleController = GoogleController;
exports.googleController = new GoogleController();
//# sourceMappingURL=googleController.js.map