import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { useAsync } from '~/core/index.js';
import * as authController from './auth.controller.js';
import * as tunnelAuthController from './tunnel-auth.controller.js';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

const router: Router = Router();

router.get('/auth/session', useAsync(authController.sessionStatus));
router.post('/auth/logout', useAsync(authController.logout));

router.get('/auth', authLimiter, useAsync(tunnelAuthController.tunnelAuth));
router.get('/auth/callback', useAsync(tunnelAuthController.tunnelAuthCallback));

export default router;
