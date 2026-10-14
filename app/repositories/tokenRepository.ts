import { prisma } from '../client/prisma';

class TokenRepository {
	async create(data: {
		id: string;
		userId: string;
		refreshToken: string;
		deviceId?: string;
		expiresAt: Date;
	}) {
		return prisma.token.create({ data });
	}

	async findActiveSession(tokenId: string, userId: string) {
		return prisma.token.findFirst({
			where: { id: tokenId, userId, expiresAt: { gt: new Date() } },
			include: { user: { select: { isActive: true, role: true } } },
		});
	}

	async findByRefreshToken(refreshToken: string) {
		return prisma.token.findUnique({ where: { refreshToken } });
	}

	async rotate(id: string, refreshToken: string, expiresAt: Date) {
		return prisma.token.update({ where: { id }, data: { refreshToken, expiresAt } });
	}

	async delete(id: string) {
		return prisma.token.deleteMany({ where: { id } });
	}

	async deleteAllForUser(userId: string, exceptTokenId?: string) {
		return prisma.token.deleteMany({
			where: { userId, ...(exceptTokenId ? { NOT: { id: exceptTokenId } } : {}) },
		});
	}

	async deleteExpired() {
		return prisma.token.deleteMany({ where: { expiresAt: { lt: new Date() } } });
	}
}

export default new TokenRepository();
