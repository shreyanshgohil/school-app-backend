import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { AdType } from '../generated/prisma/enums';

class AdRepository {
	// Active ads of a type that are inside their schedule window, highest priority first
	async getActive(type: AdType) {
		const now = new Date();
		return prisma.ad.findMany({
			where: {
				type,
				isActive: true,
				AND: [
					{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
					{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
				],
			},
			orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
			select: { id: true, title: true, type: true, imageUrl: true, targetUrl: true },
		});
	}

	async getAll() {
		return prisma.ad.findMany({ orderBy: [{ type: 'asc' }, { priority: 'desc' }] });
	}

	async getById(id: string) {
		return prisma.ad.findUnique({ where: { id } });
	}

	async create(data: Prisma.AdUncheckedCreateInput) {
		return prisma.ad.create({ data });
	}

	async update(id: string, data: Prisma.AdUncheckedUpdateInput) {
		return prisma.ad.update({ where: { id }, data });
	}

	async delete(id: string) {
		return prisma.ad.delete({ where: { id } });
	}
}

export default new AdRepository();
