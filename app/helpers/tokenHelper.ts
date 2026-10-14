import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import config from '../../config';
import { UserRole } from '../enum';

export interface AccessTokenPayload {
	id: string;
	role: UserRole;
	tokenId: string;
}

export interface RefreshTokenPayload {
	id: string;
	tokenId: string;
}

// Generate AccessToken
export const generateAccessToken = (payload: AccessTokenPayload) => {
	// expiresIn works in seconds if given in number
	return jwt.sign(payload, config.accessTokenSecretKey, {
		expiresIn: config.accessTokenExpireTime,
	});
};

// Generate RefreshToken - a unique jwtid makes every rotation produce a new token,
// even within the same second, so reuse of an old token is always detectable
export const generateRefreshToken = (payload: RefreshTokenPayload) => {
	return jwt.sign(payload, config.refreshTokenSecretKey, {
		expiresIn: config.refreshTokenExpireTime,
		jwtid: randomUUID(),
	});
};

// Verify Access Token - throws TokenExpiredError / JsonWebTokenError
export const verifyAccessToken = (accessToken: string) => {
	return jwt.verify(accessToken, config.accessTokenSecretKey) as AccessTokenPayload;
};

// Verify Refresh Token
export const verifyRefreshToken = (refreshToken: string) => {
	return jwt.verify(refreshToken, config.refreshTokenSecretKey) as RefreshTokenPayload;
};
