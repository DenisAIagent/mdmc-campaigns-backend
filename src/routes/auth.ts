import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { validate, authSchemas } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';
import { authRateLimit } from '@/middleware/rateLimit';

const router = Router();

// Public routes
router.post('/signup', 
  authRateLimit,
  validate({ body: authSchemas.signup }), 
  authController.signup
);

router.post('/login', 
  authRateLimit,
  validate({ body: authSchemas.login }), 
  authController.login
);

router.post('/refresh', 
  validate({ body: authSchemas.refreshToken }), 
  authController.refreshToken
);

router.post('/logout', 
  validate({ body: authSchemas.refreshToken }), 
  authController.logout
);

router.post('/request-password-reset',
  authRateLimit,
  validate({ 
    body: authSchemas.login.pick({ email: true }) 
  }),
  authController.requestPasswordReset
);

router.post('/reset-password',
  authRateLimit,
  validate({ 
    body: authSchemas.signup.pick({ password: true }).extend({
      token: authSchemas.refreshToken.shape.refreshToken
    })
  }),
  authController.resetPassword
);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getMe);

router.put('/profile',
  validate({ 
    body: authSchemas.signup.pick({ firstName: true, lastName: true }).partial()
  }),
  authController.updateProfile
);

router.post('/change-password',
  validate({ 
    body: authSchemas.signup.pick({ password: true }).extend({
      currentPassword: authSchemas.login.shape.password,
      newPassword: authSchemas.signup.shape.password
    }).omit({ password: true })
  }),
  authController.changePassword
);

router.post('/logout-all', authController.logoutAll);

export default router;