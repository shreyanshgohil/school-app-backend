import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../helpers/tokenHelper';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';
import tokenRepository from '../repositories/tokenRepository';

export const isAuthenticated = async (
	req: RequestExtended,
	res: Response,
	next: NextFunction
) => {
	try {
		// Fetch Token from Header
		const accessToken = req.headers.authorization?.split(' ')[1];

		if (!accessToken) {
			throw new CustomError(401, 'કૃપા કરીને લૉગિન કરો');
		}

		const payload = verifyAccessToken(accessToken);

		// The session must still exist (logout deletes it) and the user must be active
		const session = await tokenRepository.findActiveSession(payload.tokenId, payload.id);
		if (!session || !session.user.isActive) {
			throw new CustomError(401, 'સત્ર પૂરું થયું, ફરી લૉગિન કરો');
		}

		req.user = { id: payload.id, role: session.user.role, tokenId: payload.tokenId };
		next();
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError) {
			// The app refreshes its tokens when it sees this code
			return next(new CustomError(401, 'Token expired', { code: 'TOKEN_EXPIRED' }));
		}
		if (err instanceof jwt.JsonWebTokenError) {
			return next(new CustomError(401, 'Invalid access token'));
		}
		next(err);
	}
};
