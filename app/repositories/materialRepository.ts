import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { MaterialType } from '../generated/prisma/enums';
import { subjectSummarySelect } from './subjectRepository';

class MaterialRepository {
	async getForStandard(
		standardId: number,
		filters: { type?: MaterialType; subjectId?: string; includeUnpublished?: boolean }
	) {
		return prisma.studyMaterial.findMany({
			where: {
				standardId,
				type: filters.type,
				subjectId: filters.subjectId,
				...(filters.includeUnpublished ? {} : { isPublished: true }),
			},
			orderBy: [{ subject: { order: 'asc' } }, { createdAt: 'desc' }],
			include: { subject: { select: subjectSummarySelect } },
		});
	}

	async getById(id: string) {
		return prisma.studyMaterial.findUnique({ where: { id } });
	}

	async create(data: Prisma.StudyMaterialUncheckedCreateInput) {
		return prisma.studyMaterial.create({ data });
	}

	async update(id: string, data: Prisma.StudyMaterialUncheckedUpdateInput) {
		return prisma.studyMaterial.update({ where: { id }, data });
	}

	async delete(id: string) {
		return prisma.studyMaterial.delete({ where: { id } });
	}
}

export default new MaterialRepository();
