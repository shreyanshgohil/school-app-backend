import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { Difficulty, QuestionStatus } from '../generated/prisma/enums';

export interface QuestionListFilters {
	standardId?: number;
	subjectId?: string;
	chapterId?: string;
	status?: QuestionStatus;
	source?: Prisma.QuestionWhereInput['source'];
	difficulty?: Difficulty;
	search?: string;
}

const buildWhere = (filters: QuestionListFilters): Prisma.QuestionWhereInput => ({
	standardId: filters.standardId,
	subjectId: filters.subjectId,
	chapterId: filters.chapterId,
	status: filters.status,
	source: filters.source,
	difficulty: filters.difficulty,
	...(filters.search ? { text: { contains: filters.search, mode: 'insensitive' } } : {}),
});

class QuestionRepository {
	// Approved questions shown on the chapter "questions" tab
	async getPracticeQuestions(chapterId: string, limit: number) {
		return prisma.question.findMany({
			where: { chapterId, status: QuestionStatus.APPROVED },
			orderBy: { createdAt: 'asc' },
			take: limit,
			select: {
				id: true,
				text: true,
				options: true,
				correctOption: true,
				explanation: true,
				difficulty: true,
			},
		});
	}

	async getAll(filters: QuestionListFilters, offset: number, limit: number) {
		return prisma.question.findMany({
			where: buildWhere(filters),
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit,
			include: {
				subject: { select: { id: true, name: true } },
				chapter: { select: { id: true, number: true, title: true } },
				createdBy: { select: { id: true, fullName: true } },
				reviewedBy: { select: { id: true, fullName: true } },
			},
		});
	}

	async count(filters: QuestionListFilters) {
		return prisma.question.count({ where: buildWhere(filters) });
	}

	async countByStatus() {
		return prisma.question.groupBy({ by: ['status'], _count: { _all: true } });
	}

	async getById(id: string) {
		return prisma.question.findUnique({ where: { id } });
	}

	async getDetails(id: string) {
		return prisma.question.findUnique({
			where: { id },
			include: {
				subject: { select: { id: true, name: true } },
				chapter: { select: { id: true, number: true, title: true } },
				createdBy: { select: { id: true, fullName: true } },
				reviewedBy: { select: { id: true, fullName: true } },
			},
		});
	}

	async create(data: Prisma.QuestionUncheckedCreateInput) {
		return prisma.question.create({ data });
	}

	async createMany(data: Prisma.QuestionUncheckedCreateInput[]) {
		return prisma.question.createManyAndReturn({ data });
	}

	async update(id: string, data: Prisma.QuestionUncheckedUpdateInput) {
		return prisma.question.update({ where: { id }, data });
	}

	async delete(id: string) {
		return prisma.question.delete({ where: { id } });
	}

	async review(
		ids: string[],
		status: QuestionStatus,
		reviewerId: string,
		rejectionReason?: string
	) {
		return prisma.question.updateMany({
			where: { id: { in: ids } },
			data: {
				status,
				reviewedById: reviewerId,
				reviewedAt: new Date(),
				rejectionReason: status === QuestionStatus.REJECTED ? (rejectionReason ?? null) : null,
			},
		});
	}

	async isUsedInTests(id: string) {
		const count = await prisma.testQuestion.count({ where: { questionId: id } });
		return count > 0;
	}

	// True when a student has already been graded on this question
	async isUsedInSubmittedTests(id: string) {
		const count = await prisma.testQuestion.count({
			where: {
				questionId: id,
				test: { attempts: { some: { submittedAt: { not: null } } } },
			},
		});
		return count > 0;
	}

	// Recent question texts, given to the AI so it does not repeat them
	async getRecentTexts(subjectId: string, chapterId: string | undefined, limit: number) {
		const rows = await prisma.question.findMany({
			where: {
				subjectId,
				...(chapterId ? { chapterId } : {}),
				status: { not: QuestionStatus.REJECTED },
			},
			orderBy: { createdAt: 'desc' },
			take: limit,
			select: { text: true },
		});
		return rows.map((row) => row.text);
	}

	// Approved question ids that match a test's standard / subject (and optionally difficulty)
	async getApprovedIds(
		standardId: number,
		subjectId: string,
		difficulty?: Difficulty,
		chapterIds?: string[]
	) {
		const rows = await prisma.question.findMany({
			where: {
				standardId,
				subjectId,
				status: QuestionStatus.APPROVED,
				...(difficulty ? { difficulty } : {}),
				...(chapterIds?.length ? { chapterId: { in: chapterIds } } : {}),
			},
			select: { id: true },
		});
		return rows.map((row) => row.id);
	}

	// Count of the given ids that are approved and belong to the standard / subject
	async countValidForTest(ids: string[], standardId: number, subjectId: string) {
		return prisma.question.count({
			where: { id: { in: ids }, standardId, subjectId, status: QuestionStatus.APPROVED },
		});
	}
}

export default new QuestionRepository();
