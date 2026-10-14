import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import config from '../../config';
import { UserRole } from '../generated/prisma/enums';
import { comparePassword, hashPassword } from '../helpers/passwordHelper';
import {
	generateAccessToken,
	generateRefreshToken,
	verifyRefreshToken,
} from '../helpers/tokenHelper';
import { RegisterInput, UpdateProfileInput } from '../interfaces/authInterface';
import { CustomError } from '../models/customError';
import { standardRepository, tokenRepository, userRepository } from '../repositories';
import subscriptionServices from './subscriptionServices';

const normalizeUsername = (username: string) => username.trim().toLowerCase();

class AuthServices {
	private async issueTokens(user: { id: string; role: UserRole }, deviceId?: string) {
		const tokenId = randomUUID();
		const accessToken = generateAccessToken({ id: user.id, role: user.role, tokenId });
		const refreshToken = generateRefreshToken({ id: user.id, tokenId });

		await tokenRepository.create({
			id: tokenId,
			userId: user.id,
			refreshToken,
			deviceId,
			expiresAt: new Date(Date.now() + config.refreshTokenExpireTime * 1000),
		});

		return { accessToken, refreshToken };
	}

	async register(data: RegisterInput) {
		const username = normalizeUsername(data.username);

		if (await userRepository.isUsernameTaken(username)) {
			throw new CustomError(409, 'આ યુઝરનેમ પહેલેથી વપરાયેલ છે, બીજું યુઝરનેમ પસંદ કરો');
		}

		if (!(await standardRepository.exists(data.standardId))) {
			throw new CustomError(400, 'કૃપા કરીને માન્ય ધોરણ પસંદ કરો');
		}

		const isSchoolStudent =
			!!config.schoolAccessCode && data.schoolCode?.trim() === config.schoolAccessCode;

		const user = await userRepository.create({
			username,
			password: await hashPassword(data.password),
			fullName: data.fullName.trim(),
			mobile: data.mobile?.trim() || null,
			standardId: data.standardId,
			isSchoolStudent,
			schoolName: isSchoolStudent ? config.schoolName || null : data.schoolName?.trim() || null,
			avatar: data.avatar ?? null,
			lastLoginAt: new Date(),
		});

		const tokens = await this.issueTokens(user, data.deviceId);
		return { user, ...tokens };
	}

	// Students log in with their username; super admins can also use email or mobile
	private async findLoginUser(identifier: string) {
		const value = identifier.trim();
		if (value.includes('@')) {
			return userRepository.getByEmailWithPassword(value.toLowerCase());
		}
		const digits = value.replace(/[\s-]/g, '').replace(/^\+?91(?=\d{10}$)/, '');
		if (/^\d{10}$/.test(digits)) {
			return userRepository.getStaffByMobileWithPassword(digits);
		}
		return userRepository.getByUsernameWithPassword(normalizeUsername(value));
	}

	async login(identifier: string, password: string, deviceId?: string) {
		const user = await this.findLoginUser(identifier);

		if (!user || !(await comparePassword(password, user.password))) {
			throw new CustomError(401, 'યુઝરનેમ અથવા પાસવર્ડ ખોટો છે');
		}

		if (!user.isActive) {
			throw new CustomError(403, 'તમારું એકાઉન્ટ બંધ કરવામાં આવ્યું છે, શાળાનો સંપર્ક કરો');
		}

		await userRepository.updateLastLogin(user.id);
		const tokens = await this.issueTokens(user, deviceId);
		const profile = await userRepository.getById(user.id);
		return { user: profile, ...tokens };
	}

	async refreshToken(refreshToken: string) {
		let payload;
		try {
			payload = verifyRefreshToken(refreshToken);
		} catch (err) {
			if (err instanceof jwt.JsonWebTokenError) {
				throw new CustomError(401, 'સત્ર પૂરું થયું, ફરી લૉગિન કરો');
			}
			throw err;
		}

		const session = await tokenRepository.findByRefreshToken(refreshToken);
		if (!session) {
			// A valid but already-rotated refresh token means it was reused - end that session
			await tokenRepository.delete(payload.tokenId);
			throw new CustomError(401, 'સત્ર પૂરું થયું, ફરી લૉગિન કરો');
		}

		const user = await userRepository.getById(payload.id);
		if (!user || !user.isActive) {
			await tokenRepository.delete(session.id);
			throw new CustomError(401, 'સત્ર પૂરું થયું, ફરી લૉગિન કરો');
		}

		const accessToken = generateAccessToken({ id: user.id, role: user.role, tokenId: session.id });
		const newRefreshToken = generateRefreshToken({ id: user.id, tokenId: session.id });
		await tokenRepository.rotate(
			session.id,
			newRefreshToken,
			new Date(Date.now() + config.refreshTokenExpireTime * 1000)
		);

		return { accessToken, refreshToken: newRefreshToken };
	}

	async logout(tokenId: string) {
		await tokenRepository.delete(tokenId);
	}

	async getProfile(userId: string) {
		const user = await userRepository.getById(userId);
		if (!user) {
			throw new CustomError(404, 'વપરાશકર્તા મળ્યા નથી');
		}
		const subscription = await subscriptionServices.getStatus(user);
		return { ...user, subscription };
	}

	async updateProfile(userId: string, data: UpdateProfileInput) {
		if (data.standardId !== undefined && !(await standardRepository.exists(data.standardId))) {
			throw new CustomError(400, 'કૃપા કરીને માન્ય ધોરણ પસંદ કરો');
		}

		await userRepository.update(userId, {
			fullName: data.fullName?.trim(),
			mobile: data.mobile === undefined ? undefined : data.mobile?.trim() || null,
			avatar: data.avatar,
			standardId: data.standardId,
		});
		return this.getProfile(userId);
	}

	// Changing the password signs out every other device
	async changePassword(userId: string, tokenId: string, currentPassword: string, newPassword: string) {
		const user = await userRepository.getByIdWithPassword(userId);
		if (!user || !(await comparePassword(currentPassword, user.password))) {
			throw new CustomError(400, 'હાલનો પાસવર્ડ ખોટો છે');
		}

		await userRepository.update(userId, { password: await hashPassword(newPassword) });
		await tokenRepository.deleteAllForUser(userId, tokenId);
	}
}

export default new AuthServices();
