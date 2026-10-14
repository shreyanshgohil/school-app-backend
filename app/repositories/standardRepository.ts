import { prisma } from '../client/prisma';

class StandardRepository {
	async getAll() {
		return prisma.standard.findMany({
			orderBy: { order: 'asc' },
			select: { id: true, name: true },
		});
	}

	async exists(id: number) {
		const count = await prisma.standard.count({ where: { id } });
		return count > 0;
	}
}

export default new StandardRepository();
