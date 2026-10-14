import { Types } from 'mongoose';
import { compact, normalize, toObjectId } from '../helpers/mongoHelper';
import { SUBJECT_SUMMARY_FIELDS, SubjectSummary, Test, TestAttempt, TestAttemptModel, TestModel, User } from '../models';
import { SortableSubject, SUBJECT_SORT_FIELDS, toSubjectSummary } from './subjectRepository';

export interface ResultFilters {
	standardId?: number;
	subjectId?: string;
	testId?: string;
	userId?: string;
	weekStart?: Date;
}

type AttemptWrite = Partial<Omit<TestAttempt, 'id' | 'userId' | 'testId'>>;

type SubmittedAttempt = Pick<
	TestAttempt,
	'id' | 'score' | 'totalMarks' | 'percentage' | 'correctCount' | 'submittedAt'
> & {
	test: (Pick<Test, 'id' | 'title' | 'weekStart' | 'weekEnd'> & { subject: SortableSubject }) | null;
};

export type ResultRow = Omit<TestAttempt, 'answers'> & {
	user: Pick<User, 'id' | 'fullName' | 'username' | 'standardId'> | null;
	test: (Pick<Test, 'id' | 'title' | 'weekStart'> & { subject: SubjectSummary }) | null;
};

// Filters on the test (standard / subject / week) are resolved to test ids first.
// Ids are ObjectIds because the same filter also feeds an aggregate, which does no casting.
const buildFilter = async (filters: ResultFilters) => {
	const testFilter = compact({
		standardId: filters.standardId,
		subjectId: filters.subjectId,
		weekStart: filters.weekStart,
	});

	let testIds: Types.ObjectId[] | undefined;
	if (Object.keys(testFilter).length) {
		testIds = await TestModel.find(testFilter).distinct('_id');
		if (filters.testId) testIds = testIds.filter((id) => id.toString() === filters.testId);
	} else if (filters.testId) {
		testIds = [toObjectId(filters.testId)];
	}

	return compact({
		submittedAt: { $ne: null },
		userId: filters.userId ? toObjectId(filters.userId) : undefined,
		testId: testIds ? { $in: testIds } : undefined,
	});
};

class AttemptRepository {
	async getByUserAndTest(userId: string, testId: string) {
		return normalize<TestAttempt | null>(await TestAttemptModel.findOne({ userId, testId }).lean());
	}

	// Creates the attempt once; a second "start" returns the existing one
	async start(userId: string, testId: string, totalMarks: number) {
		const attempt = await TestAttemptModel.findOneAndUpdate(
			{ userId, testId },
			{ $setOnInsert: { totalMarks, startedAt: new Date() } },
			{ upsert: true, returnDocument: 'after' }
		).lean();
		return normalize<TestAttempt>(attempt);
	}

	// Only grades an attempt that has not been submitted yet (guards double submit)
	async submit(id: string, data: AttemptWrite) {
		const result = await TestAttemptModel.updateOne({ _id: id, submittedAt: null }, { $set: compact(data) });
		return result.modifiedCount > 0;
	}

	async getById(id: string) {
		return normalize<TestAttempt | null>(await TestAttemptModel.findById(id).lean());
	}

	// Submitted attempts with test week & subject - feeds the progress card.
	// Oldest week first, subjects in their usual order inside a week.
	async getSubmittedForUser(userId: string, since?: Date) {
		const attempts = normalize<SubmittedAttempt[]>(
			await TestAttemptModel.find({ userId, submittedAt: { $ne: null } })
				.select('score totalMarks percentage correctCount submittedAt testId')
				.populate({
					path: 'test',
					select: 'title weekStart weekEnd subjectId',
					populate: { path: 'subject', select: SUBJECT_SORT_FIELDS },
				})
				.lean()
		);

		return attempts
			.flatMap(({ test, ...attempt }) =>
				test && (!since || test.weekStart >= since) ? [{ ...attempt, test }] : []
			)
			.sort(
				(a, b) =>
					a.test.weekStart.getTime() - b.test.weekStart.getTime() ||
					a.test.subject.order - b.test.subject.order
			)
			.map((attempt) => ({
				id: attempt.id,
				score: attempt.score,
				totalMarks: attempt.totalMarks,
				percentage: attempt.percentage,
				correctCount: attempt.correctCount,
				submittedAt: attempt.submittedAt,
				test: {
					id: attempt.test.id,
					title: attempt.test.title,
					weekStart: attempt.test.weekStart,
					weekEnd: attempt.test.weekEnd,
					subject: toSubjectSummary(attempt.test.subject),
				},
			}));
	}

	async getResults(filters: ResultFilters, offset: number, limit: number) {
		const attempts = await TestAttemptModel.find(await buildFilter(filters))
			.select('-answers')
			.sort({ submittedAt: -1 })
			.skip(offset)
			.limit(limit)
			.populate({ path: 'user', select: 'fullName username standardId' })
			.populate({
				path: 'test',
				select: 'title weekStart subjectId',
				populate: { path: 'subject', select: SUBJECT_SUMMARY_FIELDS },
			})
			.lean();
		return normalize<ResultRow[]>(attempts);
	}

	async countResults(filters: ResultFilters) {
		return TestAttemptModel.countDocuments(await buildFilter(filters));
	}

	async averagePercentage(filters: ResultFilters) {
		const [row] = await TestAttemptModel.aggregate<{ average: number }>([
			{ $match: await buildFilter(filters) },
			{ $group: { _id: null, average: { $avg: '$percentage' } } },
		]);
		return row?.average ?? 0;
	}

	async hasSubmittedAttempts(testId: string) {
		return !!(await TestAttemptModel.exists({ testId, submittedAt: { $ne: null } }));
	}
}

export default new AttemptRepository();
