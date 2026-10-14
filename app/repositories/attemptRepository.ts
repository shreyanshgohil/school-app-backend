import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { subjectSummarySelect } from './subjectRepository';

export interface ResultFilters {
	standardId?: number;
	subjectId?: string;
	testId?: string;
	userId?: string;
	weekStart?: Date;
}

const buildWhere = (filters: ResultFilters): Prisma.TestAttemptWhereInput => ({
	submittedAt: { not: null },
	userId: filters.userId,
	testId: filters.testId,
	test: {
		standardId: filters.standardId,
		subjectId: filters.subjectId,
		weekStart: filters.weekStart,
	},
});

class AttemptRepository {
	async getByUserAndTest(userId: string, testId: string) {
		return prisma.testAttempt.findUnique({ where: { userId_testId: { userId, testId } } });
	}

	// Creates the attempt once; a second "start" returns the existing row
	async start(userId: string, testId: string, totalMarks: number) {
		return prisma.testAttempt.upsert({
			where: { userId_testId: { userId, testId } },
			create: { userId, testId, totalMarks },
			update: {},
		});
	}

	// Only grades an attempt that has not been submitted yet (guards double submit)
	async submit(id: string, data: Prisma.TestAttemptUncheckedUpdateInput) {
		const result = await prisma.testAttempt.updateMany({
			where: { id, submittedAt: null },
			data,
		});
		return result.count > 0;
	}

	async getById(id: string) {
		return prisma.testAttempt.findUnique({ where: { id } });
	}

	// Submitted attempts with test week & subject - feeds the progress card
	async getSubmittedForUser(userId: string, since?: Date) {
		return prisma.testAttempt.findMany({
			where: {
				userId,
				submittedAt: { not: null },
				...(since ? { test: { weekStart: { gte: since } } } : {}),
			},
			orderBy: [{ test: { weekStart: 'asc' } }, { test: { subject: { order: 'asc' } } }],
			select: {
				id: true,
				score: true,
				totalMarks: true,
				percentage: true,
				correctCount: true,
				submittedAt: true,
				test: {
					select: {
						id: true,
						title: true,
						weekStart: true,
						weekEnd: true,
						subject: { select: subjectSummarySelect },
					},
				},
			},
		});
	}

	async getResults(filters: ResultFilters, offset: number, limit: number) {
		return prisma.testAttempt.findMany({
			where: buildWhere(filters),
			orderBy: { submittedAt: 'desc' },
			skip: offset,
			take: limit,
			include: {
				user: { select: { id: true, fullName: true, username: true, standardId: true } },
				test: {
					select: {
						id: true,
						title: true,
						weekStart: true,
						subject: { select: subjectSummarySelect },
					},
				},
			},
		});
	}

	async countResults(filters: ResultFilters) {
		return prisma.testAttempt.count({ where: buildWhere(filters) });
	}

	async averagePercentage(filters: ResultFilters) {
		const result = await prisma.testAttempt.aggregate({
			where: buildWhere(filters),
			_avg: { percentage: true },
		});
		return result._avg.percentage ?? 0;
	}

	async hasSubmittedAttempts(testId: string) {
		const count = await prisma.testAttempt.count({
			where: { testId, submittedAt: { not: null } },
		});
		return count > 0;
	}
}

export default new AttemptRepository();
