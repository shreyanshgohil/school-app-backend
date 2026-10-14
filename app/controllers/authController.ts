import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser, getBody } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RegisterInput, UpdateProfileInput } from '../interfaces/authInterface';
import { RequestExtended } from '../interfaces/global';
import { authServices } from '../services';

class AuthController {
	// Register
	async register(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await authServices.register(getBody<RegisterInput>(req));
			return DefaultResponse(res, 201, 'એકાઉન્ટ બની ગયું', data);
		} catch (err) {
			next(err);
		}
	}

	// Login
	async login(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { username, password, deviceId } = getBody<{
				username: string;
				password: string;
				deviceId?: string;
			}>(req);
			const data = await authServices.login(username, password, deviceId);
			return DefaultResponse(res, 200, 'લૉગિન સફળ', data);
		} catch (err) {
			next(err);
		}
	}

	// Refresh Token
	async refreshToken(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { refreshToken } = getBody<{ refreshToken: string }>(req);
			const data = await authServices.refreshToken(refreshToken);
			return DefaultResponse(res, 200, 'Token refreshed', data);
		} catch (err) {
			next(err);
		}
	}

	// Logout
	async logout(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			await authServices.logout(getAuthUser(req).tokenId);
			return DefaultResponse(res, 200, 'લૉગઆઉટ થઈ ગયા');
		} catch (err) {
			next(err);
		}
	}

	// Fetch Profile
	async getProfile(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const data = await authServices.getProfile(getAuthUser(req).id);
			return DefaultResponse(res, 200, 'Profile fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	// Update Profile
	async updateProfile(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await authServices.updateProfile(
				getAuthUser(req).id,
				getBody<UpdateProfileInput>(req)
			);
			return DefaultResponse(res, 200, 'પ્રોફાઇલ અપડેટ થઈ ગઈ', data);
		} catch (err) {
			next(err);
		}
	}

	// Change Password
	async changePassword(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const user = getAuthUser(req);
			const { currentPassword, newPassword } = getBody<{
				currentPassword: string;
				newPassword: string;
			}>(req);
			await authServices.changePassword(user.id, user.tokenId, currentPassword, newPassword);
			return DefaultResponse(res, 200, 'પાસવર્ડ બદલાઈ ગયો');
		} catch (err) {
			next(err);
		}
	}
}

export default new AuthController();
