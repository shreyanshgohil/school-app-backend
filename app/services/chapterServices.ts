import { CustomError } from '../models/customError';
import { chapterRepository, questionRepository } from '../repositories';
import userServices from './userServices';

const PRACTICE_QUESTION_LIMIT = 10;

class ChapterServices {
	private async getStudentChapter(userId: string, chapterId: string) {
		const student = await userServices.getStudentOrThrow(userId);
		const chapter = await chapterRepository.getById(chapterId);

		if (!chapter || !chapter.isPublished || chapter.subject.standardId !== student.standardId) {
			throw new CustomError(404, 'પાઠ મળ્યો નથી');
		}
		return chapter;
	}

	async getChapterDetail(userId: string, chapterId: string) {
		const chapter = await this.getStudentChapter(userId, chapterId);

		const [order, questions, isCompleted] = await Promise.all([
			chapterRepository.getSubjectChapterOrder(chapter.subjectId),
			questionRepository.getPracticeQuestions(chapter.id, PRACTICE_QUESTION_LIMIT),
			chapterRepository.isCompleted(userId, chapter.id),
		]);

		const index = order.findIndex((row) => row.id === chapter.id);
		const { standardId: _standardId, ...subject } = chapter.subject;

		return {
			id: chapter.id,
			number: chapter.number,
			title: chapter.title,
			summary: chapter.summary,
			content: chapter.content,
			imageUrl: chapter.imageUrl,
			vocabulary: (chapter.vocabulary ?? []) as { word: string; meaning: string }[],
			subject,
			isCompleted,
			prevChapterId: index > 0 ? order[index - 1].id : null,
			nextChapterId: index >= 0 && index < order.length - 1 ? order[index + 1].id : null,
			practiceQuestions: questions.map((question) => ({
				...question,
				options: question.options as string[],
			})),
		};
	}

	async markComplete(userId: string, chapterId: string) {
		await this.getStudentChapter(userId, chapterId);
		return chapterRepository.markComplete(userId, chapterId);
	}
}

export default new ChapterServices();
