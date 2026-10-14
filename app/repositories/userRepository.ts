import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';

// Never select the password hash for API responses
export const userPublicSelect = {
	id: true,
	username: true,
	fullName: true,
	email: true,
	mobile: true,
	role: true,
	standardId: true,
	standard: { select: { id: true, name: true } },
	schoolName: true,
	isSchoolStudent: true,
	avatar: true,
	isActive: true,
	lastLoginAt: true,
	createdAt: true,
} satisfies Prisma.UserSelect;

export interface UserListFilters {
	search?: string;
	standardId?: number;
	isSchoolStudent?: boolean;
	isActive?: boolean;
	role?: Prisma.UserWhereInput['role'];
}

const buildWhere = (filters: UserListFilters): Prisma.UserWhereInput => ({
	role: filters.role,
	standardId: filters.standardId,
	isSchoolStudent: filters.isSchoolStudent,
	isActive: filters.isActive,
	...(filters.search
		? {
				OR: [
					{ fullName: { contains: filters.search, mode: 'insensitive' } },
					{ username: { contains: filters.search, mode: 'insensitive' } },
					{ email: { contains: filters.search, mode: 'insensitive' } },
					{ mobile: { contains: filters.search } },
				],
			}
		: {}),
});

class UserRepository {
	// Includes the password hash - only for login / password checks
	async getByUsernameWithPassword(username: string) {
		return prisma.user.findUnique({ where: { username } });
	}

	async getByEmailWithPassword(email: string) {
		return prisma.user.findUnique({ where: { email } });
	}

	// Mobile is only a login id for staff - students may share a family number
	async getStaffByMobileWithPassword(mobile: string) {
		return prisma.user.findFirst({
			where: { mobile, role: { in: [UserRole.ADMIN, UserRole.TEACHER] } },
		});
	}

	async isEmailTaken(email: string, exceptId?: string) {
		const count = await prisma.user.count({ where: { email, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
		return count > 0;
	}

	async isStaffMobileTaken(mobile: string, exceptId?: string) {
		const count = await prisma.user.count({
			where: {
				mobile,
				role: { in: [UserRole.ADMIN, UserRole.TEACHER] },
				...(exceptId ? { NOT: { id: exceptId } } : {}),
			},
		});
		return count > 0;
	}

	async getByIdWithPassword(id: string) {
		return prisma.user.findUnique({ where: { id } });
	}

	async getById(id: string) {
		return prisma.user.findUnique({ where: { id }, select: userPublicSelect });
	}

	async isUsernameTaken(username: string) {
		const count = await prisma.user.count({ where: { username } });
		return count > 0;
	}

	async create(data: Prisma.UserUncheckedCreateInput) {
		return prisma.user.create({ data, select: userPublicSelect });
	}

	async update(id: string, data: Prisma.UserUncheckedUpdateInput) {
		return prisma.user.update({ where: { id }, data, select: userPublicSelect });
	}

	async updateLastLogin(id: string) {
		return prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
	}

	async getAll(filters: UserListFilters, offset: number, limit: number) {
		return prisma.user.findMany({
			where: buildWhere(filters),
			select: userPublicSelect,
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit,
		});
	}

	async count(filters: UserListFilters) {
		return prisma.user.count({ where: buildWhere(filters) });
	}
}

export default new UserRepository();
