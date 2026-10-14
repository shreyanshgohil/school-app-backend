import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { subjectSummarySelect } from './subjectRepository';

class HomeworkRepository {
	// Homework due from `since` onwards, nearest due date first
	async getForStandard(standardId: number, since?: Date) {
		return prisma.homework.findMany({
			where: { standardId, ...(since ? { dueDate: { gte: since } } : {}) },
			orderBy: { dueDate: 'asc' },
			include: { subject: { select: subjectSummarySelect } },
		});
	}

	async getById(id: string) {
		return prisma.homework.findUnique({ where: { id } });
	}

	async create(data: Prisma.HomeworkUncheckedCreateInput) {
		return prisma.homework.create({ data });
	}

	async update(id: string, data: Prisma.HomeworkUncheckedUpdateInput) {
		return prisma.homework.update({ where: { id }, data });
	}

	async delete(id: string) {
		return prisma.homework.delete({ where: { id } });
	}
}

export default new HomeworkRepository();
