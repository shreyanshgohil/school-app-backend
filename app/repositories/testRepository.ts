import { Types } from 'mongoose';
import { TestStatus } from '../enum';
import { compact, found, normalize, toObjectId } from '../helpers/mongoHelper';
import {
	Question,
	QuestionModel,
	SUBJECT_SUMMARY_FIELDS,
	SubjectSummary,
	Test,
	TestAttempt,
	TestAttemptModel,
	TestModel,
	TestQuestionRef,
} from '../models';
import { SortableSubject, SUBJECT_SORT_FIELDS, toSubjectSummary } from './subjectRepository';

export interface TestListFilters {
	standardId?: number;
	subjectId?: string;
	status?: TestStatus;
	weekStart?: Date;
}

export type TestWrite = Partial<Omit<Test, 'id' | 'createdAt' | 'updatedAt'>>;

type TestDoc<TSubject = SubjectSummary> = Test & { subject: TSubject; questions: TestQuestionRef[] };

type StudentAttempt = Pick<TestAttempt, 'id' | 'submittedAt' | 'score' | 'totalMarks' | 'percentage'>;

const buildFilter = (filters: TestListFilters) =>
	compact({
		standardId: filters.standardId,
		subjectId: filters.subjectId,
		status: filters.status,
		weekStart: filters.weekStart,
	});

const toQuestionRefs = (questionIds: string[]) =>
	questionIds.map((questionId, index) => ({ questionId, order: index + 1 }));

// The embedded question list becomes a count, like the other list endpoints
const withQuestionCount = <T extends { questions: TestQuestionRef[] }>({ questions, ...test }: T) => ({
	...test,
	questionCount: questions.length,
});

// Submitted attempts per test
const countSubmitted = async (testIds: string[]) => {
	const rows = await TestAttemptModel.aggregate<{ _id: Types.ObjectId; count: number }>([
		{ $match: { testId: { $in: testIds.map(toObjectId) }, submittedAt: { $ne: null } } },
		{ $group: { _id: '$testId', count: { $sum: 1 } } },
	]);
	return new Map(rows.map((row) => [row._id.toString(), row.count]));
};

class TestRepository {
	// Adds the student's own attempt (if any) to each test
	private async withStudentAttempts<TSubject>(userId: string, tests: TestDoc<TSubject>[]) {
		const attempts = normalize<(StudentAttempt & { testId: string })[]>(
			await TestAttemptModel.find({ userId, testId: { $in: tests.map((test) => test.id) } })
				.select('testId submittedAt score totalMarks percentage')
				.lean()
		);
		return tests.map((test) => {
			const { questionCount, ...rest } = withQuestionCount(test);
			return {
				...rest,
				_count: { questions: questionCount },
				attempts: attempts
					.filter((attempt) => attempt.testId === test.id)
					.map(({ testId: _testId, ...attempt }): StudentAttempt => attempt),
			};
		});
	}

	// Published tests for a standard; `live` = running this week, otherwise finished weeks
	async getStudentTests(userId: string, standardId: number, scope: 'live' | 'past', subjectId?: string) {
		const now = new Date();
		const tests = normalize<TestDoc<SortableSubject>[]>(
			await TestModel.find(
				compact({
					standardId,
					status: TestStatus.PUBLISHED,
					subjectId,
					...(scope === 'live' ? { weekStart: { $lte: now }, weekEnd: { $gt: now } } : { weekEnd: { $lte: now } }),
				})
			)
				.sort({ weekStart: -1 })
				.limit(scope === 'past' ? 50 : 0)
				.populate({ path: 'subject', select: SUBJECT_SORT_FIELDS })
				.lean()
		);

		// Newest week first, subjects in their usual order inside a week
		tests.sort(
			(a, b) => b.weekStart.getTime() - a.weekStart.getTime() || a.subject.order - b.subject.order
		);
		return this.withStudentAttempts(
			userId,
			tests.map((test) => ({ ...test, subject: toSubjectSummary(test.subject) }))
		);
	}

	async getStudentTestById(userId: string, id: string) {
		const test = normalize<TestDoc | null>(
			await TestModel.findById(id).populate({ path: 'subject', select: SUBJECT_SUMMARY_FIELDS }).lean()
		);
		if (!test) return null;
		const [row] = await this.withStudentAttempts(userId, [test]);
		return row;
	}

	async getById(id: string) {
		const test = normalize<TestDoc | null>(
			await TestModel.findById(id).populate({ path: 'subject', select: SUBJECT_SUMMARY_FIELDS }).lean()
		);
		if (!test) return null;
		const { questionCount, ...rest } = withQuestionCount(test);
		return { ...rest, _count: { questions: questionCount } };
	}

	// Questions in test order. Includes the answer key - strip it before sending to students
	async getQuestions(testId: string) {
		const test = await TestModel.findById(testId).select('questions').lean();
		if (!test) return [];

		const refs = [...test.questions].sort((a, b) => a.order - b.order);
		const questions = normalize<Pick<Question, 'id' | 'text' | 'options' | 'correctOption' | 'explanation'>[]>(
			await QuestionModel.find({ _id: { $in: refs.map((ref) => ref.questionId) } })
				.select('text options correctOption explanation')
				.lean()
		);
		const byId = new Map(questions.map((question) => [question.id, question]));
		return refs.flatMap((ref) => byId.get(ref.questionId.toString()) ?? []);
	}

	async getAll(filters: TestListFilters, offset: number, limit: number) {
		const tests = normalize<TestDoc[]>(
			await TestModel.find(buildFilter(filters))
				.sort({ weekStart: -1, createdAt: -1 })
				.skip(offset)
				.limit(limit)
				.populate({ path: 'subject', select: SUBJECT_SUMMARY_FIELDS })
				.lean()
		);
		const submitted = await countSubmitted(tests.map((test) => test.id));

		return tests.map((test) => {
			const { questionCount, ...rest } = withQuestionCount(test);
			return { ...rest, _count: { questions: questionCount, attempts: submitted.get(test.id) ?? 0 } };
		});
	}

	async count(filters: TestListFilters) {
		return TestModel.countDocuments(buildFilter(filters));
	}

	async getByIdWithQuestions(id: string) {
		const test = normalize<TestDoc | null>(
			await TestModel.findById(id).populate({ path: 'subject', select: SUBJECT_SUMMARY_FIELDS }).lean()
		);
		if (!test) return null;

		const [questions, submitted] = await Promise.all([
			QuestionModel.find({ _id: { $in: test.questions.map((ref) => ref.questionId) } }).lean(),
			countSubmitted([test.id]),
		]);
		const byId = new Map(normalize<Question[]>(questions).map((question) => [question.id, question]));

		return {
			...test,
			questions: [...test.questions]
				.sort((a, b) => a.order - b.order)
				.flatMap((ref) => {
					const question = byId.get(ref.questionId);
					return question ? [{ order: ref.order, question }] : [];
				}),
			_count: { attempts: submitted.get(test.id) ?? 0 },
		};
	}

	async create(data: TestWrite, questionIds: string[]) {
		const test = await TestModel.create({ ...data, questions: toQuestionRefs(questionIds) });
		return normalize<Test>(test.toObject());
	}

	async update(id: string, data: TestWrite, questionIds?: string[]) {
		const test = await TestModel.findByIdAndUpdate(
			id,
			{ $set: compact({ ...data, questions: questionIds ? toQuestionRefs(questionIds) : undefined }) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Test>(found(test));
	}

	// Attempts belong to the test and go with it
	async delete(id: string) {
		const test = found(await TestModel.findByIdAndDelete(id).lean());
		await TestAttemptModel.deleteMany({ testId: id });
		return normalize<Test>(test);
	}

	async countLive() {
		const now = new Date();
		return TestModel.countDocuments({
			status: TestStatus.PUBLISHED,
			weekStart: { $lte: now },
			weekEnd: { $gt: now },
		});
	}
}

export default new TestRepository();
