import { QuestionSource, QuestionStatus } from '../generated/prisma/enums';
import { PaginationQuery } from '../interfaces/global';
import {
	GenerateQuestionsInput,
	QuestionInput,
	QuestionUpdateInput,
	ReviewQuestionsInput,
} from '../interfaces/questionInterface';
import { CustomError } from '../models/customError';
import { chapterRepository, questionRepository, subjectRepository } from '../repositories';
import { QuestionListFilters } from '../repositories/questionRepository';
import aiQuestionServices from './aiQuestionServices';

const MAX_EXISTING_FOR_AI = 40;

class QuestionServices {
	async getAll(filters: QuestionListFilters, pagination: PaginationQuery) {
		const [questions, total] = await Promise.all([
			questionRepository.getAll(filters, pagination.offset, pagination.limit),
			questionRepository.count(filters),
		]);
		return { questions, total };
	}

	async getDetails(id: string) {
		const question = await questionRepository.getDetails(id);
		if (!question) {
			throw new CustomError(404, 'પ્રશ્ન મળ્યો નથી');
		}
		return question;
	}

	// Subject must be in the standard and the chapter (if any) in the subject
	private async resolveScope(standardId: number, subjectId: string, chapterId?: string | null) {
		const subject = await subjectRepository.getById(subjectId);
		if (!subject || subject.standardId !== standardId) {
			throw new CustomError(400, 'આ વિષય પસંદ કરેલા ધોરણનો નથી');
		}

		if (!chapterId) {
			return { subject, chapter: null };
		}
		const chapter = await chapterRepository.getById(chapterId);
		if (!chapter || chapter.subjectId !== subjectId) {
			throw new CustomError(400, 'આ પાઠ પસંદ કરેલા વિષયનો નથી');
		}
		return { subject, chapter };
	}

	// Questions typed in by staff are trusted and approved straight away
	async create(userId: string, data: QuestionInput) {
		await this.resolveScope(data.standardId, data.subjectId, data.chapterId);
		return questionRepository.create({
			standardId: data.standardId,
			subjectId: data.subjectId,
			chapterId: data.chapterId ?? null,
			text: data.text.trim(),
			options: data.options.map((option) => option.trim()),
			correctOption: data.correctOption,
			explanation: data.explanation?.trim() || null,
			difficulty: data.difficulty,
			source: QuestionSource.MANUAL,
			status: QuestionStatus.APPROVED,
			createdById: userId,
			reviewedById: userId,
			reviewedAt: new Date(),
		});
	}

	async update(id: string, data: QuestionUpdateInput) {
		const question = await questionRepository.getById(id);
		if (!question) {
			throw new CustomError(404, 'પ્રશ્ન મળ્યો નથી');
		}

		const changesAnswerKey = data.options !== undefined || data.correctOption !== undefined;
		if (changesAnswerKey && (await questionRepository.isUsedInSubmittedTests(id))) {
			throw new CustomError(
				409,
				'Students were already graded on this question - options and answer cannot be changed'
			);
		}

		const standardId = data.standardId ?? question.standardId;
		const subjectId = data.subjectId ?? question.subjectId;
		const chapterId = data.chapterId === undefined ? question.chapterId : data.chapterId;
		if (data.standardId !== undefined || data.subjectId !== undefined || data.chapterId !== undefined) {
			await this.resolveScope(standardId, subjectId, chapterId);
		}

		const options = data.options ?? (question.options as string[]);
		const correctOption = data.correctOption ?? question.correctOption;
		if (correctOption >= options.length) {
			throw new CustomError(400, 'સાચો વિકલ્પ ચાર વિકલ્પોમાંથી એક હોવો જોઈએ');
		}

		return questionRepository.update(id, {
			standardId: data.standardId,
			subjectId: data.subjectId,
			chapterId: data.chapterId,
			text: data.text?.trim(),
			options: data.options?.map((option) => option.trim()),
			correctOption: data.correctOption,
			explanation: data.explanation === undefined ? undefined : data.explanation?.trim() || null,
			difficulty: data.difficulty,
		});
	}

	async delete(id: string) {
		if (await questionRepository.isUsedInTests(id)) {
			throw new CustomError(409, 'આ પ્રશ્ન કોઈ ટેસ્ટમાં છે - પહેલા ટેસ્ટમાંથી દૂર કરો');
		}
		await questionRepository.delete(id);
	}

	async review(reviewerId: string, data: ReviewQuestionsInput) {
		const result = await questionRepository.review(
			data.ids,
			data.status,
			reviewerId,
			data.rejectionReason
		);
		return { updated: result.count };
	}

	// AI questions are saved as PENDING - students never see them until approved
	async generateWithAi(userId: string, data: GenerateQuestionsInput) {
		const { subject, chapter } = await this.resolveScope(data.standardId, data.subjectId, data.chapterId);
		const existingQuestions = await questionRepository.getRecentTexts(
			subject.id,
			chapter?.id,
			MAX_EXISTING_FOR_AI
		);

		const generated = await aiQuestionServices.generate({
			standardName: `ધોરણ ${data.standardId}`,
			subjectName: subject.name,
			subjectNameEn: subject.nameEn,
			chapterTitle: chapter ? `પાઠ ${chapter.number} - ${chapter.title}` : undefined,
			chapterContent: chapter?.content,
			topic: data.topic,
			count: data.count,
			difficulty: data.difficulty,
			existingQuestions,
		});

		return questionRepository.createMany(
			generated.map((question) => ({
				standardId: data.standardId,
				subjectId: subject.id,
				chapterId: chapter?.id ?? null,
				text: question.text,
				options: question.options,
				correctOption: question.correctOption,
				explanation: question.explanation,
				difficulty: question.difficulty,
				source: QuestionSource.AI,
				status: QuestionStatus.PENDING,
				createdById: userId,
			}))
		);
	}
}

export default new QuestionServices();
