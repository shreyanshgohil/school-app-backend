import express from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers';
import {
	changePasswordValidationRules,
	loginValidationRules,
	refreshTokenValidationRules,
	registerValidationRules,
	updateProfileValidationRules,
} from '../helpers/validators';
import { isAuthenticated } from '../middlewares/authMiddleware';

const router = express.Router();

// Slow down password guessing
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 30,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { message: 'ઘણા પ્રયત્નો થયા, થોડી વાર પછી ફરી પ્રયત્ન કરો', statusCode: 429 },
});

// Register
router.post('/register', authLimiter, registerValidationRules, authController.register);

// Login
router.post('/login', authLimiter, loginValidationRules, authController.login);

// Refresh Token
router.post('/refresh-token', refreshTokenValidationRules, authController.refreshToken);

// Logout
router.post('/logout', isAuthenticated, authController.logout);

// Fetch Profile
router.get('/profile', isAuthenticated, authController.getProfile);

// Update Profile
router.put('/profile', isAuthenticated, updateProfileValidationRules, authController.updateProfile);

// Change Password
router.put(
	'/change-password',
	isAuthenticated,
	changePasswordValidationRules,
	authController.changePassword
);

export default router;
