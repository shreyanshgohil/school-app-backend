import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { subjectSummarySelect } from './subjectRepository';

class ChapterRepository {
	async getById(id: string) {
		return prisma.chapter.findUnique({
			where: { id },
			include: { subject: { select: { ...subjectSummarySelect, standardId: true } } },
		});
	}

	// Ordered list of published chapters in a subject - used for prev / next
	async getSubjectChapterOrder(subjectId: string) {
		return prisma.chapter.findMany({
			where: { subjectId, isPublished: true },
			orderBy: { number: 'asc' },
			select: { id: true, number: true },
		});
	}

	async getBySubject(subjectId: string) {
		return prisma.chapter.findMany({
			where: { subjectId },
			orderBy: { number: 'asc' },
		});
	}

	async markComplete(userId: string, chapterId: string) {
		return prisma.chapterProgress.upsert({
			where: { userId_chapterId: { userId, chapterId } },
			create: { userId, chapterId },
			update: {},
		});
	}

	async isCompleted(userId: string, chapterId: string) {
		const count = await prisma.chapterProgress.count({ where: { userId, chapterId } });
		return count > 0;
	}

	async getCompletedChapterIds(userId: string, subjectId?: string) {
		const rows = await prisma.chapterProgress.findMany({
			where: { userId, ...(subjectId ? { chapter: { subjectId } } : {}) },
			select: { chapterId: true, chapter: { select: { subjectId: true } } },
		});
		return rows;
	}

	async countPublishedForStandard(standardId: number) {
		return prisma.chapter.count({
			where: { isPublished: true, subject: { standardId, isActive: true } },
		});
	}

	async countCompletedForStandard(userId: string, standardId: number) {
		return prisma.chapterProgress.count({
			where: { userId, chapter: { isPublished: true, subject: { standardId } } },
		});
	}

	async create(data: Prisma.ChapterUncheckedCreateInput) {
		return prisma.chapter.create({ data });
	}

	async update(id: string, data: Prisma.ChapterUncheckedUpdateInput) {
		return prisma.chapter.update({ where: { id }, data });
	}

	async delete(id: string) {
		return prisma.chapter.delete({ where: { id } });
	}
}

export default new ChapterRepository();
