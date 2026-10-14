import { UserRole } from '../enum';
import { getWeekRange } from '../helpers/dateHelper';
import { PaginationQuery } from '../interfaces/global';
import {
	attemptRepository,
	questionRepository,
	subscriptionRepository,
	testRepository,
	userRepository,
} from '../repositories';
import { ResultFilters } from '../repositories/attemptRepository';

class DashboardServices {
	async getStats() {
		const { weekStart } = getWeekRange();

		const [
			students,
			schoolStudents,
			activeSubscriptions,
			liveTests,
			questionsByStatus,
			submissionsThisWeek,
			averageThisWeek,
		] = await Promise.all([
			userRepository.count({ role: UserRole.STUDENT }),
			userRepository.count({ role: UserRole.STUDENT, isSchoolStudent: true }),
			subscriptionRepository.countActive(),
			testRepository.countLive(),
			questionRepository.countByStatus(),
			attemptRepository.countResults({ weekStart }),
			attemptRepository.averagePercentage({ weekStart }),
		]);

		const questions = Object.fromEntries(
			questionsByStatus.map((row) => [row._id, row.count])
		) as Record<string, number>;

		return {
			students,
			schoolStudents,
			activeSubscriptions,
			liveTests,
			questions: {
				pending: questions.PENDING ?? 0,
				approved: questions.APPROVED ?? 0,
				rejected: questions.REJECTED ?? 0,
			},
			thisWeek: {
				weekStart,
				submissions: submissionsThisWeek,
				averagePercentage: Math.round(averageThisWeek * 10) / 10,
			},
		};
	}

	async getResults(filters: ResultFilters, pagination: PaginationQuery) {
		const [results, total] = await Promise.all([
			attemptRepository.getResults(filters, pagination.offset, pagination.limit),
			attemptRepository.countResults(filters),
		]);
		return { results, total };
	}
}

export default new DashboardServices();
