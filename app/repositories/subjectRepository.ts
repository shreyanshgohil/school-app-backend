import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';

export const subjectSummarySelect = {
	id: true,
	name: true,
	nameEn: true,
	icon: true,
	color: true,
} satisfies Prisma.SubjectSelect;

class SubjectRepository {
	async getByStandard(standardId: number, includeInactive = false) {
		return prisma.subject.findMany({
			where: { standardId, ...(includeInactive ? {} : { isActive: true }) },
			orderBy: { order: 'asc' },
			include: {
				_count: { select: { chapters: { where: { isPublished: true } } } },
			},
		});
	}

	async getById(id: string) {
		return prisma.subject.findUnique({ where: { id } });
	}

	async getWithChapters(id: string) {
		return prisma.subject.findUnique({
			where: { id },
			include: {
				chapters: {
					where: { isPublished: true },
					orderBy: { number: 'asc' },
					select: { id: true, number: true, title: true, summary: true },
				},
			},
		});
	}

	async create(data: Prisma.SubjectUncheckedCreateInput) {
		return prisma.subject.create({ data });
	}

	async update(id: string, data: Prisma.SubjectUncheckedUpdateInput) {
		return prisma.subject.update({ where: { id }, data });
	}
}

export default new SubjectRepository();
