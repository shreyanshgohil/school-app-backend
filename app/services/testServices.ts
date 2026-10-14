import { TestStatus } from '../generated/prisma/enums';
import { getWeekRange } from '../helpers/dateHelper';
import { getGrade, toPercentage } from '../helpers/gradeHelper';
import { PaginationQuery } from '../interfaces/global';
import {
	AnswerInput,
	StudentTestStatus,
	TestInput,
	TestScope,
	TestUpdateInput,
} from '../interfaces/testInterface';
import { CustomError } from '../models/customError';
import {
	attemptRepository,
	questionRepository,
	subjectRepository,
	testRepository,
} from '../repositories';
import { TestListFilters } from '../repositories/testRepository';
import subscriptionServices from './subscriptionServices';
import userServices from './userServices';

// Extra time allowed for a submit to reach the server after the timer ends
const SUBMIT_GRACE_MS = 2 * 60 * 1000;

type StudentTestRow = Awaited<ReturnType<typeof testRepository.getStudentTests>>[number];

const shuffle = <T>(items: T[]) => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

class TestServices {
	private toStudentTest(test: StudentTestRow, hasAccess: boolean) {
		const attempt = test.attempts[0];
		const now = new Date();

		let status: StudentTestStatus = 'NOT_STARTED';
		if (attempt?.submittedAt) status = 'COMPLETED';
		else if (test.weekEnd <= now) status = 'MISSED';
		else if (attempt) status = 'IN_PROGRESS';

		return {
			id: test.id,
			title: test.title,
			description: test.description,
			subject: test.subject,
			weekStart: test.weekStart,
			weekEnd: test.weekEnd,
			durationMinutes: test.durationMinutes,
			difficulty: test.difficulty,
			isPaid: test.isPaid,
			isLocked: test.isPaid && !hasAccess,
			questionCount: test._count.questions,
			totalMarks: test._count.questions * test.marksPerQuestion,
			status,
			result: attempt?.submittedAt
				? {
						score: attempt.score,
						totalMarks: attempt.totalMarks,
						percentage: attempt.percentage,
						grade: getGrade(attempt.percentage),
					}
				: null,
		};
	}

	async getStudentTests(userId: string, scope: TestScope, subjectId?: string) {
		const student = await userServices.getStudentOrThrow(userId);
		const [tests, hasAccess] = await Promise.all([
			testRepository.getStudentTests(userId, student.standardId, scope, subjectId),
			subscriptionServices.hasPremiumAccess(student),
		]);
		return tests.map((test) => this.toStudentTest(test, hasAccess));
	}

	// Loads a published test of the student's standard, or 404
	private async getStudentTestOrThrow(userId: string, testId: string) {
		const student = await userServices.getStudentOrThrow(userId);
		const test = await testRepository.getById(testId);

		if (!test || test.status !== TestStatus.PUBLISHED || test.standardId !== student.standardId) {
			throw new CustomError(404, 'ટેસ્ટ મળી નથી');
		}
		return { student, test };
	}

	async getTestDetail(userId: string, testId: string) {
		const { student, test } = await this.getStudentTestOrThrow(userId, testId);

		// Published but scheduled for a future week
		if (test.weekStart > new Date()) {
			throw new CustomError(404, 'આ ટેસ્ટ હજુ શરૂ થઈ નથી');
		}

		const [row, hasAccess] = await Promise.all([
			testRepository.getStudentTestById(userId, testId),
			subscriptionServices.hasPremiumAccess(student),
		]);
		if (!row) {
			throw new CustomError(404, 'ટેસ્ટ મળી નથી');
		}
		return this.toStudentTest(row, hasAccess);
	}

	async startTest(userId: string, testId: string) {
		const { student, test } = await this.getStudentTestOrThrow(userId, testId);
		const now = new Date();

		if (test.weekStart > now) {
			throw new CustomError(400, 'આ ટેસ્ટ હજુ શરૂ થઈ નથી');
		}
		if (test.weekEnd <= now) {
			throw new CustomError(400, 'આ ટેસ્ટનો સમય પૂરો થઈ ગયો છે');
		}
		if (test.isPaid && !(await subscriptionServices.hasPremiumAccess(student))) {
			throw new CustomError(402, 'આ પેઇડ ટેસ્ટ છે. આગળ વધવા માટે પ્લાન લો', {
				code: 'PAYMENT_REQUIRED',
			});
		}

		const existing = await attemptRepository.getByUserAndTest(userId, testId);
		if (existing?.submittedAt) {
			throw new CustomError(409, 'તમે આ ટેસ્ટ પહેલેથી આપી દીધી છે', { code: 'ALREADY_SUBMITTED' });
		}

		const questions = await testRepository.getQuestions(testId);
		if (!questions.length) {
			throw new CustomError(400, 'આ ટેસ્ટમાં હજુ પ્રશ્નો ઉમેરાયા નથી');
		}

		const attempt = await attemptRepository.start(
			userId,
			testId,
			questions.length * test.marksPerQuestion
		);
		const endsAt = new Date(attempt.startedAt.getTime() + test.durationMinutes * 60 * 1000);

		// The timer ran out while the app was closed - grade what was saved (nothing)
		if (now.getTime() > endsAt.getTime() + SUBMIT_GRACE_MS) {
			await this.gradeAttempt(attempt.id, test.marksPerQuestion, questions, [], attempt.startedAt);
			throw new CustomError(409, 'આ ટેસ્ટનો સમય પૂરો થઈ ગયો છે', { code: 'ALREADY_SUBMITTED' });
		}

		return {
			attemptId: attempt.id,
			testId: test.id,
			title: test.title,
			subject: test.subject,
			durationMinutes: test.durationMinutes,
			startedAt: attempt.startedAt,
			endsAt,
			serverTime: now,
			// Answer key is never sent before submission
			questions: questions.map((question) => ({
				id: question.id,
				text: question.text,
				options: question.options as string[],
			})),
		};
	}

	private async gradeAttempt(
		attemptId: string,
		marksPerQuestion: number,
		questions: Awaited<ReturnType<typeof testRepository.getQuestions>>,
		answers: AnswerInput[],
		startedAt: Date
	) {
		const selected = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption]));
		let correctCount = 0;
		let wrongCount = 0;
		const savedAnswers: Record<string, number | null> = {};

		questions.forEach((question) => {
			const choice = selected.get(question.id);
			const optionCount = (question.options as string[]).length;
			const isValidChoice =
				typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice < optionCount;

			savedAnswers[question.id] = isValidChoice ? choice : null;
			if (!isValidChoice) return;
			if (choice === question.correctOption) correctCount++;
			else wrongCount++;
		});

		const totalMarks = questions.length * marksPerQuestion;
		const score = correctCount * marksPerQuestion;
		const now = new Date();

		return attemptRepository.submit(attemptId, {
			answers: savedAnswers,
			score,
			totalMarks,
			correctCount,
			wrongCount,
			skippedCount: questions.length - correctCount - wrongCount,
			percentage: toPercentage(score, totalMarks),
			submittedAt: now,
			timeTakenSeconds: Math.round((now.getTime() - startedAt.getTime()) / 1000),
		});
	}

	async submitTest(userId: string, testId: string, answers: AnswerInput[]) {
		const { test } = await this.getStudentTestOrThrow(userId, testId);
		const attempt = await attemptRepository.getByUserAndTest(userId, testId);

		if (!attempt) {
			throw new CustomError(400, 'પહેલા ટેસ્ટ શરૂ કરો');
		}
		if (attempt.submittedAt) {
			throw new CustomError(409, 'તમે આ ટેસ્ટ પહેલેથી આપી દીધી છે', { code: 'ALREADY_SUBMITTED' });
		}

		const questions = await testRepository.getQuestions(testId);
		const deadline = attempt.startedAt.getTime() + test.durationMinutes * 60 * 1000 + SUBMIT_GRACE_MS;
		// Answers that arrive well after the timer ended are not counted
		const acceptedAnswers = Date.now() <= deadline ? answers : [];

		await this.gradeAttempt(attempt.id, test.marksPerQuestion, questions, acceptedAnswers, attempt.startedAt);
		return this.getResult(userId, testId);
	}

	async getResult(userId: string, testId: string) {
		const { test } = await this.getStudentTestOrThrow(userId, testId);
		const attempt = await attemptRepository.getByUserAndTest(userId, testId);

		if (!attempt?.submittedAt) {
			throw new CustomError(404, 'પરિણામ મળ્યું નથી');
		}

		const questions = await testRepository.getQuestions(testId);
		const answers = (attempt.answers ?? {}) as Record<string, number | null>;

		return {
			test: { id: test.id, title: test.title, subject: test.subject, weekStart: test.weekStart },
			score: attempt.score,
			totalMarks: attempt.totalMarks,
			correctCount: attempt.correctCount,
			wrongCount: attempt.wrongCount,
			skippedCount: attempt.skippedCount,
			percentage: attempt.percentage,
			grade: getGrade(attempt.percentage),
			timeTakenSeconds: attempt.timeTakenSeconds,
			submittedAt: attempt.submittedAt,
			questions: questions.map((question) => {
				const selectedOption = answers[question.id] ?? null;
				return {
					id: question.id,
					text: question.text,
					options: question.options as string[],
					correctOption: question.correctOption,
					selectedOption,
					isCorrect: selectedOption === question.correctOption,
					explanation: question.explanation,
				};
			}),
		};
	}

	// ----- Admin -----

	async getAll(filters: TestListFilters, pagination: PaginationQuery) {
		const [tests, total] = await Promise.all([
			testRepository.getAll(filters, pagination.offset, pagination.limit),
			testRepository.count(filters),
		]);
		return { tests, total };
	}

	async getDetails(id: string) {
		const test = await testRepository.getByIdWithQuestions(id);
		if (!test) {
			throw new CustomError(404, 'ટેસ્ટ મળી નથી');
		}
		return test;
	}

	private async resolveQuestionIds(
		standardId: number,
		subjectId: string,
		data: Pick<TestInput, 'questionIds' | 'autoPickCount' | 'chapterIds' | 'difficulty'>
	) {
		if (data.questionIds?.length) {
			const ids = [...new Set(data.questionIds)];
			const valid = await questionRepository.countValidForTest(ids, standardId, subjectId);
			if (valid !== ids.length) {
				throw new CustomError(400, 'ફક્ત એ જ ધોરણ અને વિષયના મંજૂર પ્રશ્નો વાપરી શકાય');
			}
			return ids;
		}

		if (data.autoPickCount) {
			const available = await questionRepository.getApprovedIds(
				standardId,
				subjectId,
				data.difficulty,
				data.chapterIds
			);
			if (available.length < data.autoPickCount) {
				throw new CustomError(
					400,
					`આ પસંદગી માટે ફક્ત ${available.length} મંજૂર પ્રશ્નો ઉપલબ્ધ છે`
				);
			}
			return shuffle(available).slice(0, data.autoPickCount);
		}

		return undefined;
	}

	private async assertSubjectInStandard(subjectId: string, standardId: number) {
		const subject = await subjectRepository.getById(subjectId);
		if (!subject || subject.standardId !== standardId) {
			throw new CustomError(400, 'આ વિષય પસંદ કરેલા ધોરણનો નથી');
		}
	}

	async create(userId: string, data: TestInput) {
		await this.assertSubjectInStandard(data.subjectId, data.standardId);
		const questionIds = (await this.resolveQuestionIds(data.standardId, data.subjectId, data)) ?? [];

		if (data.status === TestStatus.PUBLISHED && !questionIds.length) {
			throw new CustomError(400, 'પ્રકાશિત કરતાં પહેલાં ટેસ્ટમાં પ્રશ્નો ઉમેરો');
		}

		const { weekStart, weekEnd } = getWeekRange(new Date(data.weekOf));
		const test = await testRepository.create(
			{
				title: data.title,
				description: data.description,
				standardId: data.standardId,
				subjectId: data.subjectId,
				weekStart,
				weekEnd,
				durationMinutes: data.durationMinutes,
				marksPerQuestion: data.marksPerQuestion,
				difficulty: data.difficulty,
				isPaid: data.isPaid,
				status: data.status,
				createdById: userId,
			},
			questionIds
		);
		return this.getDetails(test.id);
	}

	async update(id: string, data: TestUpdateInput) {
		const existing = await testRepository.getById(id);
		if (!existing) {
			throw new CustomError(404, 'ટેસ્ટ મળી નથી');
		}

		const standardId = data.standardId ?? existing.standardId;
		const subjectId = data.subjectId ?? existing.subjectId;
		// Forms resend unchanged fields - only a real change counts
		const movesSubject = standardId !== existing.standardId || subjectId !== existing.subjectId;
		if (movesSubject) {
			await this.assertSubjectInStandard(subjectId, standardId);
		}

		const questionIds = await this.resolveQuestionIds(standardId, subjectId, data);
		const changesQuestions = questionIds !== undefined || movesSubject;

		// Changing questions after students were graded would make old results meaningless
		if (changesQuestions && (await attemptRepository.hasSubmittedAttempts(id))) {
			throw new CustomError(409, 'વિદ્યાર્થીઓએ આ ટેસ્ટ આપી દીધી છે, હવે પ્રશ્નો બદલી શકાશે નહીં');
		}

		const week = data.weekOf ? getWeekRange(new Date(data.weekOf)) : undefined;

		await testRepository.update(
			id,
			{
				title: data.title,
				description: data.description,
				standardId: data.standardId,
				subjectId: data.subjectId,
				weekStart: week?.weekStart,
				weekEnd: week?.weekEnd,
				durationMinutes: data.durationMinutes,
				marksPerQuestion: data.marksPerQuestion,
				difficulty: data.difficulty,
				isPaid: data.isPaid,
			},
			questionIds
		);

		if (data.status) {
			await this.updateStatus(id, data.status);
		}
		return this.getDetails(id);
	}

	async updateStatus(id: string, status: TestStatus) {
		const test = await testRepository.getById(id);
		if (!test) {
			throw new CustomError(404, 'ટેસ્ટ મળી નથી');
		}
		if (status === TestStatus.PUBLISHED && test._count.questions === 0) {
			throw new CustomError(400, 'પ્રકાશિત કરતાં પહેલાં ટેસ્ટમાં પ્રશ્નો ઉમેરો');
		}
		await testRepository.update(id, { status });
		return this.getDetails(id);
	}

	async delete(id: string) {
		if (await attemptRepository.hasSubmittedAttempts(id)) {
			throw new CustomError(409, 'વિદ્યાર્થીઓએ આ ટેસ્ટ આપી છે - કાઢી નાખવાને બદલે આર્કાઇવ કરો');
		}
		await testRepository.delete(id);
	}
}

export default new TestServices();
