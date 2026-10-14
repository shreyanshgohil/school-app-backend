import { CustomError } from '../models/customError';
import { chapterRepository, subjectRepository } from '../repositories';
import userServices from './userServices';

class SubjectServices {
	// Subjects of the student's own standard with chapter progress
	async getStudentSubjects(userId: string) {
		const student = await userServices.getStudentOrThrow(userId);
		const [subjects, completed] = await Promise.all([
			subjectRepository.getByStandard(student.standardId),
			chapterRepository.getCompletedChapterIds(userId),
		]);

		const completedBySubject = new Map<string, number>();
		completed.forEach(({ chapter }) => {
			completedBySubject.set(chapter.subjectId, (completedBySubject.get(chapter.subjectId) ?? 0) + 1);
		});

		return subjects.map(({ _count, ...subject }) => ({
			id: subject.id,
			name: subject.name,
			nameEn: subject.nameEn,
			description: subject.description,
			icon: subject.icon,
			color: subject.color,
			chapterCount: _count.chapters,
			completedCount: completedBySubject.get(subject.id) ?? 0,
		}));
	}

	async getSubjectDetail(userId: string, subjectId: string) {
		const student = await userServices.getStudentOrThrow(userId);
		const subject = await subjectRepository.getWithChapters(subjectId);

		// Students only see subjects of their own standard
		if (!subject || subject.standardId !== student.standardId || !subject.isActive) {
			throw new CustomError(404, 'વિષય મળ્યો નથી');
		}

		const completed = await chapterRepository.getCompletedChapterIds(userId, subjectId);
		const completedIds = new Set(completed.map((row) => row.chapterId));

		return {
			id: subject.id,
			name: subject.name,
			nameEn: subject.nameEn,
			description: subject.description,
			icon: subject.icon,
			color: subject.color,
			chapters: subject.chapters.map((chapter) => ({
				...chapter,
				isCompleted: completedIds.has(chapter.id),
			})),
		};
	}
}

export default new SubjectServices();
