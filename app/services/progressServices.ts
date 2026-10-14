import { getWeekStartWeeksAgo } from '../helpers/dateHelper';
import { getGrade, toPercentage } from '../helpers/gradeHelper';
import { attemptRepository, chapterRepository, subjectRepository } from '../repositories';
import userServices from './userServices';

const average = (values: number[]) =>
	values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;

class ProgressServices {
	// Numbers on the "મારી પ્રગતિ" screen
	async getSummary(userId: string) {
		const student = await userServices.getStudentOrThrow(userId);

		const [totalChapters, completedChapters, attempts, subjects] = await Promise.all([
			chapterRepository.countPublishedForStandard(student.standardId),
			chapterRepository.countCompletedForStandard(userId, student.standardId),
			attemptRepository.getSubmittedForUser(userId),
			subjectRepository.getByStandard(student.standardId),
		]);

		// Only this standard's subjects - older standards stay in the progress card history
		const subjectIds = new Set(subjects.map((subject) => subject.id));
		const currentAttempts = attempts.filter((attempt) => subjectIds.has(attempt.test.subject.id));

		return {
			student: {
				id: student.id,
				fullName: student.fullName,
				avatar: student.avatar,
				standard: student.standard,
			},
			totalChapters,
			completedChapters,
			testsTaken: currentAttempts.length,
			totalPoints: currentAttempts.reduce((sum, attempt) => sum + attempt.score, 0),
			successRate: average(currentAttempts.map((attempt) => attempt.percentage)),
			subjects: subjects.map((subject) => {
				const subjectAttempts = currentAttempts.filter((attempt) => attempt.test.subject.id === subject.id);
				return {
					id: subject.id,
					name: subject.name,
					nameEn: subject.nameEn,
					icon: subject.icon,
					color: subject.color,
					testsTaken: subjectAttempts.length,
					percentage: average(subjectAttempts.map((attempt) => attempt.percentage)),
				};
			}),
		};
	}

	// Week-by-week progress card plus a trend series for the graph
	async getProgressCard(userId: string, weeks: number) {
		await userServices.getStudentOrThrow(userId);
		const since = getWeekStartWeeksAgo(weeks - 1);
		const attempts = await attemptRepository.getSubmittedForUser(userId, since);

		const byWeek = new Map<string, typeof attempts>();
		attempts.forEach((attempt) => {
			const key = attempt.test.weekStart.toISOString();
			byWeek.set(key, [...(byWeek.get(key) ?? []), attempt]);
		});

		const cards = [...byWeek.entries()].map(([, weekAttempts]) => {
			const score = weekAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
			const totalMarks = weekAttempts.reduce((sum, attempt) => sum + attempt.totalMarks, 0);
			const percentage = toPercentage(score, totalMarks);
			return {
				weekStart: weekAttempts[0].test.weekStart,
				weekEnd: weekAttempts[0].test.weekEnd,
				score,
				totalMarks,
				percentage,
				grade: getGrade(percentage),
				subjects: weekAttempts.map((attempt) => ({
					testId: attempt.test.id,
					testTitle: attempt.test.title,
					subject: attempt.test.subject,
					score: attempt.score,
					totalMarks: attempt.totalMarks,
					percentage: attempt.percentage,
					grade: getGrade(attempt.percentage),
				})),
			};
		});

		return {
			weeks: [...cards].reverse(),
			trend: cards.map((card) => ({ weekStart: card.weekStart, percentage: card.percentage })),
		};
	}
}

export default new ProgressServices();
