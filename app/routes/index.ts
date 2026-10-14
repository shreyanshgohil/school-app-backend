import express, { Request, Response } from 'express';
import {
	adController,
	paymentController,
	standardController,
	subscriptionController,
} from '../controllers';
import { customError, notFound } from '../helpers/errorHandler';
import { checkoutValidation, idParamValidation } from '../helpers/validators';
import { isStaff } from '../middlewares/adminMiddleware';
import { isAuthenticated } from '../middlewares/authMiddleware';
import adminRoutes from './admin';
import authRoutes from './authRoutes';
import chapterRoutes from './chapterRoutes';
import contentRoutes from './contentRoutes';
import progressRoutes from './progressRoutes';
import subjectRoutes from './subjectRoutes';
import testRoutes from './testRoutes';

const router = express.Router();

router.get('/health', (req: Request, res: Response) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

// Public
router.use('/auth', authRoutes);
router.get('/standards', standardController.getStandards);

// Student app
router.use('/subjects', isAuthenticated, subjectRoutes);
router.use('/chapters', isAuthenticated, chapterRoutes);
router.use('/tests', isAuthenticated, testRoutes);
router.use('/progress', isAuthenticated, progressRoutes);
router.use('/', contentRoutes);
router.get('/ads', isAuthenticated, adController.getActiveAds);
router.get('/subscription', isAuthenticated, subscriptionController.getStatus);
router.post('/subscription/checkout', isAuthenticated, checkoutValidation, subscriptionController.checkout);
router.get('/subscription/payments/:id', isAuthenticated, idParamValidation, subscriptionController.paymentStatus);

// Razorpay webhook (public, verified by signature; raw body is set up in index.ts)
router.post('/payments/razorpay/webhook', paymentController.razorpayWebhook);

// Admin panel
router.use('/admin', isAuthenticated, isStaff, adminRoutes);

router.use(notFound);
router.use(customError);

export default router;
