import { UserRole } from '../generated/prisma/enums';
import { hashPassword } from '../helpers/passwordHelper';
import { PaginationQuery } from '../interfaces/global';
import { CustomError } from '../models/customError';
import { standardRepository, tokenRepository, userRepository } from '../repositories';
import { UserListFilters } from '../repositories/userRepository';
import subscriptionServices from './subscriptionServices';

class UserServices {
	// Logged-in student with a standard - every student screen needs this
	async getStudentOrThrow(userId: string) {
		const user = await userRepository.getById(userId);
		if (!user) {
			throw new CustomError(404, 'વપરાશકર્તા મળ્યા નથી');
		}
		if (!user.standardId) {
			throw new CustomError(400, 'કૃપા કરીને પ્રોફાઇલમાં તમારું ધોરણ પસંદ કરો');
		}
		return { ...user, standardId: user.standardId };
	}

	// ----- Admin -----

	async getAll(filters: UserListFilters, pagination: PaginationQuery) {
		const [users, total] = await Promise.all([
			userRepository.getAll(filters, pagination.offset, pagination.limit),
			userRepository.count(filters),
		]);
		return { users, total };
	}

	async getDetails(id: string) {
		const user = await userRepository.getById(id);
		if (!user) {
			throw new CustomError(404, 'વપરાશકર્તા મળ્યા નથી');
		}
		const subscription = await subscriptionServices.getStatus(user);
		return { ...user, subscription };
	}

	async update(
		id: string,
		data: {
			fullName?: string;
			mobile?: string | null;
			standardId?: number;
			isSchoolStudent?: boolean;
			isActive?: boolean;
			schoolName?: string | null;
		}
	) {
		if (data.standardId !== undefined && !(await standardRepository.exists(data.standardId))) {
			throw new CustomError(400, 'અમાન્ય ધોરણ');
		}

		const user = await userRepository.update(id, data);

		// Deactivated accounts are signed out everywhere
		if (data.isActive === false) {
			await tokenRepository.deleteAllForUser(id);
		}
		return user;
	}

	// Kids forget passwords - staff can set a new one
	async resetPassword(id: string, password: string) {
		await userRepository.update(id, { password: await hashPassword(password) });
		await tokenRepository.deleteAllForUser(id);
	}

	private async assertStaffContactFree(email?: string | null, mobile?: string | null, exceptId?: string) {
		if (email && (await userRepository.isEmailTaken(email, exceptId))) {
			throw new CustomError(409, 'આ ઈ-મેલ પહેલેથી વપરાયેલ છે');
		}
		if (mobile && (await userRepository.isStaffMobileTaken(mobile, exceptId))) {
			throw new CustomError(409, 'આ મોબાઇલ નંબર બીજા સંચાલક પાસે છે');
		}
	}

	// Staff log in with email or mobile, so the username is generated
	private async generateStaffUsername(email?: string | null, mobile?: string | null) {
		const base = (email?.split('@')[0] ?? `admin${mobile ?? ''}`).toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24) || 'admin';
		let username = base;
		for (let suffix = 1; await userRepository.isUsernameTaken(username); suffix++) {
			username = `${base}${suffix}`;
		}
		return username;
	}

	async createStaff(data: {
		fullName: string;
		email?: string;
		mobile?: string;
		password: string;
		role?: typeof UserRole.ADMIN | typeof UserRole.TEACHER;
	}) {
		const email = data.email?.trim().toLowerCase() || null;
		const mobile = data.mobile?.trim() || null;
		await this.assertStaffContactFree(email, mobile);

		return userRepository.create({
			username: await this.generateStaffUsername(email, mobile),
			email,
			mobile,
			password: await hashPassword(data.password),
			fullName: data.fullName.trim(),
			role: data.role ?? UserRole.ADMIN,
		});
	}

	async updateStaff(
		actorId: string,
		id: string,
		data: { fullName?: string; email?: string | null; mobile?: string | null; isActive?: boolean; password?: string }
	) {
		const staff = await userRepository.getById(id);
		if (!staff || staff.role === UserRole.STUDENT) {
			throw new CustomError(404, 'સંચાલક મળ્યા નથી');
		}
		if (actorId === id && data.isActive === false) {
			throw new CustomError(400, 'તમે પોતાનું એકાઉન્ટ બંધ કરી શકતા નથી');
		}

		const email = data.email === undefined ? undefined : data.email?.trim().toLowerCase() || null;
		const mobile = data.mobile === undefined ? undefined : data.mobile?.trim() || null;
		await this.assertStaffContactFree(email, mobile, id);

		// Keep at least one way to log in
		const finalEmail = email === undefined ? staff.email : email;
		const finalMobile = mobile === undefined ? staff.mobile : mobile;
		if (!finalEmail && !finalMobile) {
			throw new CustomError(400, 'ઈ-મેલ અથવા મોબાઇલ નંબર જરૂરી છે');
		}

		const user = await userRepository.update(id, {
			fullName: data.fullName?.trim(),
			email,
			mobile,
			isActive: data.isActive,
			...(data.password ? { password: await hashPassword(data.password) } : {}),
		});
		if (data.isActive === false || data.password) {
			await tokenRepository.deleteAllForUser(id);
		}
		return user;
	}

	async grantSubscription(id: string, months: number, note?: string) {
		const user = await userRepository.getById(id);
		if (!user) {
			throw new CustomError(404, 'વપરાશકર્તા મળ્યા નથી');
		}
		return subscriptionServices.grant(id, months, 'ADMIN', note);
	}
}

export default new UserServices();
