import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { TestStatus } from '../generated/prisma/enums';
import { subjectSummarySelect } from './subjectRepository';

export interface TestListFilters {
	standardId?: number;
	subjectId?: string;
	status?: TestStatus;
	weekStart?: Date;
}

const studentTestInclude = (userId: string) =>
	({
		subject: { select: subjectSummarySelect },
		_count: { select: { questions: true } },
		attempts: {
			where: { userId },
			select: { id: true, submittedAt: true, score: true, totalMarks: true, percentage: true },
		},
	}) satisfies Prisma.TestInclude;

const buildWhere = (filters: TestListFilters): Prisma.TestWhereInput => ({
	standardId: filters.standardId,
	subjectId: filters.subjectId,
	status: filters.status,
	weekStart: filters.weekStart,
});

class TestRepository {
	// Published tests for a standard; `live` = running this week, otherwise finished weeks
	async getStudentTests(
		userId: string,
		standardId: number,
		scope: 'live' | 'past',
		subjectId?: string
	) {
		const now = new Date();
		return prisma.test.findMany({
			where: {
				standardId,
				status: TestStatus.PUBLISHED,
				...(subjectId ? { subjectId } : {}),
				...(scope === 'live'
					? { weekStart: { lte: now }, weekEnd: { gt: now } }
					: { weekEnd: { lte: now } }),
			},
			orderBy: [{ weekStart: 'desc' }, { subject: { order: 'asc' } }],
			take: scope === 'past' ? 50 : undefined,
			include: studentTestInclude(userId),
		});
	}

	async getStudentTestById(userId: string, id: string) {
		return prisma.test.findUnique({ where: { id }, include: studentTestInclude(userId) });
	}

	async getById(id: string) {
		return prisma.test.findUnique({
			where: { id },
			include: {
				subject: { select: subjectSummarySelect },
				_count: { select: { questions: true } },
			},
		});
	}

	// Questions in test order. Includes the answer key - strip it before sending to students
	async getQuestions(testId: string) {
		const rows = await prisma.testQuestion.findMany({
			where: { testId },
			orderBy: { order: 'asc' },
			select: {
				question: {
					select: {
						id: true,
						text: true,
						options: true,
						correctOption: true,
						explanation: true,
					},
				},
			},
		});
		return rows.map((row) => row.question);
	}

	async getAll(filters: TestListFilters, offset: number, limit: number) {
		return prisma.test.findMany({
			where: buildWhere(filters),
			orderBy: [{ weekStart: 'desc' }, { createdAt: 'desc' }],
			skip: offset,
			take: limit,
			include: {
				subject: { select: subjectSummarySelect },
				_count: { select: { questions: true, attempts: { where: { submittedAt: { not: null } } } } },
			},
		});
	}

	async count(filters: TestListFilters) {
		return prisma.test.count({ where: buildWhere(filters) });
	}

	async getByIdWithQuestions(id: string) {
		return prisma.test.findUnique({
			where: { id },
			include: {
				subject: { select: subjectSummarySelect },
				questions: {
					orderBy: { order: 'asc' },
					include: { question: true },
				},
				_count: { select: { attempts: { where: { submittedAt: { not: null } } } } },
			},
		});
	}

	async create(data: Prisma.TestUncheckedCreateInput, questionIds: string[]) {
		return prisma.test.create({
			data: {
				...data,
				questions: {
					create: questionIds.map((questionId, index) => ({ questionId, order: index + 1 })),
				},
			},
		});
	}

	async update(id: string, data: Prisma.TestUncheckedUpdateInput, questionIds?: string[]) {
		return prisma.$transaction(async (tx) => {
			if (questionIds) {
				await tx.testQuestion.deleteMany({ where: { testId: id } });
				await tx.testQuestion.createMany({
					data: questionIds.map((questionId, index) => ({
						testId: id,
						questionId,
						order: index + 1,
					})),
				});
			}
			return tx.test.update({ where: { id }, data });
		});
	}

	async delete(id: string) {
		return prisma.test.delete({ where: { id } });
	}

	async countLive() {
		const now = new Date();
		return prisma.test.count({
			where: { status: TestStatus.PUBLISHED, weekStart: { lte: now }, weekEnd: { gt: now } },
		});
	}
}

export default new TestRepository();
