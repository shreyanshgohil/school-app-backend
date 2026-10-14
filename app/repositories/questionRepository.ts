import { Difficulty, QuestionSource, QuestionStatus } from '../enum';
import { compact, contains, found, normalize } from '../helpers/mongoHelper';
import { Chapter, Question, QuestionModel, Subject, TestAttemptModel, TestModel, User } from '../models';

export interface QuestionListFilters {
	standardId?: number;
	subjectId?: string;
	chapterId?: string;
	status?: QuestionStatus;
	source?: QuestionSource;
	difficulty?: Difficulty;
	search?: string;
}

export type QuestionWrite = Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>;

export type QuestionWithRelations = Question & {
	subject: Pick<Subject, 'id' | 'name'> | null;
	chapter: Pick<Chapter, 'id' | 'number' | 'title'> | null;
	createdBy: Pick<User, 'id' | 'fullName'> | null;
	reviewedBy: Pick<User, 'id' | 'fullName'> | null;
};

const RELATIONS = [
	{ path: 'subject', select: 'name' },
	{ path: 'chapter', select: 'number title' },
	{ path: 'createdBy', select: 'fullName' },
	{ path: 'reviewedBy', select: 'fullName' },
];

const buildFilter = (filters: QuestionListFilters) =>
	compact({
		standardId: filters.standardId,
		subjectId: filters.subjectId,
		chapterId: filters.chapterId,
		status: filters.status,
		source: filters.source,
		difficulty: filters.difficulty,
		text: filters.search ? contains(filters.search) : undefined,
	});

class QuestionRepository {
	// Approved questions shown on the chapter "questions" tab
	async getPracticeQuestions(chapterId: string, limit: number) {
		const questions = await QuestionModel.find({ chapterId, status: QuestionStatus.APPROVED })
			.sort({ createdAt: 1 })
			.limit(limit)
			.select('text options correctOption explanation difficulty')
			.lean();
		return normalize<Pick<Question, 'id' | 'text' | 'options' | 'correctOption' | 'explanation' | 'difficulty'>[]>(
			questions
		);
	}

	async getAll(filters: QuestionListFilters, offset: number, limit: number) {
		const questions = await QuestionModel.find(buildFilter(filters))
			.sort({ createdAt: -1 })
			.skip(offset)
			.limit(limit)
			.populate(RELATIONS)
			.lean();
		return normalize<QuestionWithRelations[]>(questions);
	}

	async count(filters: QuestionListFilters) {
		return QuestionModel.countDocuments(buildFilter(filters));
	}

	async countByStatus() {
		return QuestionModel.aggregate<{ _id: QuestionStatus; count: number }>([
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]);
	}

	async getById(id: string) {
		return normalize<Question | null>(await QuestionModel.findById(id).lean());
	}

	async getDetails(id: string) {
		return normalize<QuestionWithRelations | null>(await QuestionModel.findById(id).populate(RELATIONS).lean());
	}

	async create(data: QuestionWrite) {
		const question = await QuestionModel.create(data);
		return normalize<Question>(question.toObject());
	}

	async createMany(data: QuestionWrite[]) {
		const questions = await QuestionModel.insertMany(data);
		return normalize<Question[]>(questions.map((question) => question.toObject()));
	}

	async update(id: string, data: QuestionWrite) {
		const question = await QuestionModel.findByIdAndUpdate(
			id,
			{ $set: compact(data) },
			{ returnDocument: 'after', runValidators: true }
		).lean();
		return normalize<Question>(found(question));
	}

	async delete(id: string) {
		return normalize<Question>(found(await QuestionModel.findByIdAndDelete(id).lean()));
	}

	async review(ids: string[], status: QuestionStatus, reviewerId: string, rejectionReason?: string) {
		const result = await QuestionModel.updateMany(
			{ _id: { $in: ids } },
			{
				$set: {
					status,
					reviewedById: reviewerId,
					reviewedAt: new Date(),
					rejectionReason: status === QuestionStatus.REJECTED ? (rejectionReason ?? null) : null,
				},
			}
		);
		return { count: result.matchedCount };
	}

	async isUsedInTests(id: string) {
		return !!(await TestModel.exists({ 'questions.questionId': id }));
	}

	// True when a student has already been graded on this question
	async isUsedInSubmittedTests(id: string) {
		const testIds = await TestModel.find({ 'questions.questionId': id }).distinct('_id');
		if (!testIds.length) return false;
		return !!(await TestAttemptModel.exists({ testId: { $in: testIds }, submittedAt: { $ne: null } }));
	}

	// Recent question texts, given to the AI so it does not repeat them
	async getRecentTexts(subjectId: string, chapterId: string | undefined, limit: number) {
		const rows = await QuestionModel.find(
			compact({ subjectId, chapterId, status: { $ne: QuestionStatus.REJECTED } })
		)
			.sort({ createdAt: -1 })
			.limit(limit)
			.select('text')
			.lean();
		return rows.map((row) => row.text);
	}

	// Approved question ids that match a test's standard / subject (and optionally difficulty)
	async getApprovedIds(standardId: number, subjectId: string, difficulty?: Difficulty, chapterIds?: string[]) {
		const ids = await QuestionModel.find(
			compact({
				standardId,
				subjectId,
				status: QuestionStatus.APPROVED,
				difficulty,
				chapterId: chapterIds?.length ? { $in: chapterIds } : undefined,
			})
		).distinct('_id');
		return ids.map((id) => id.toString());
	}

	// Count of the given ids that are approved and belong to the standard / subject
	async countValidForTest(ids: string[], standardId: number, subjectId: string) {
		return QuestionModel.countDocuments({
			_id: { $in: ids },
			standardId,
			subjectId,
			status: QuestionStatus.APPROVED,
		});
	}
}

export default new QuestionRepository();
