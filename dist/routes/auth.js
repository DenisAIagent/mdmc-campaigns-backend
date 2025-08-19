"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("@/controllers/authController");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const rateLimit_1 = require("@/middleware/rateLimit");
const router = (0, express_1.Router)();
// Public routes
router.post('/signup', rateLimit_1.authRateLimit, (0, validation_1.validate)({ body: validation_1.authSchemas.signup }), authController_1.authController.signup);
router.post('/login', rateLimit_1.authRateLimit, (0, validation_1.validate)({ body: validation_1.authSchemas.login }), authController_1.authController.login);
router.post('/refresh', (0, validation_1.validate)({ body: validation_1.authSchemas.refreshToken }), authController_1.authController.refreshToken);
router.post('/logout', (0, validation_1.validate)({ body: validation_1.authSchemas.refreshToken }), authController_1.authController.logout);
router.post('/request-password-reset', rateLimit_1.authRateLimit, (0, validation_1.validate)({
    body: validation_1.authSchemas.login.pick({ email: true })
}), authController_1.authController.requestPasswordReset);
router.post('/reset-password', rateLimit_1.authRateLimit, (0, validation_1.validate)({
    body: validation_1.authSchemas.signup.pick({ password: true }).extend({
        token: validation_1.authSchemas.refreshToken.shape.refreshToken
    })
}), authController_1.authController.resetPassword);
// Protected routes
router.use(auth_1.authenticate);
router.get('/me', authController_1.authController.getMe);
router.put('/profile', (0, validation_1.validate)({
    body: validation_1.authSchemas.signup.pick({ firstName: true, lastName: true }).partial()
}), authController_1.authController.updateProfile);
router.post('/change-password', (0, validation_1.validate)({
    body: validation_1.authSchemas.signup.pick({ password: true }).extend({
        currentPassword: validation_1.authSchemas.login.shape.password,
        newPassword: validation_1.authSchemas.signup.shape.password
    }).omit({ password: true })
}), authController_1.authController.changePassword);
router.post('/logout-all', authController_1.authController.logoutAll);
exports.default = router;
//# sourceMappingURL=auth.js.map