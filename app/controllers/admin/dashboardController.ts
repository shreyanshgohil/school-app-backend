import { NextFunction, Response } from 'express';
import { getWeekRange } from '../../helpers/dateHelper';
import { DefaultResponse } from '../../helpers/defaultResponseHelper';
import { getPagination } from '../../helpers/paginationHelper';
import { getQuery } from '../../helpers/requestHelper';
import { checkValidation } from '../../helpers/validationHelper';
import { RequestExtended } from '../../interfaces/global';
import { dashboardServices, progressServices } from '../../services';

class DashboardController {
	// Dashboard Stats
	async getStats(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const stats = await dashboardServices.getStats();
			return DefaultResponse(res, 200, 'Dashboard fetched successfully', stats);
		} catch (err) {
			next(err);
		}
	}

	// All submitted results, filterable by standard / subject / test / student / week
	async getResults(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const query = getQuery<{
				page?: number;
				limit?: number;
				standardId?: number;
				subjectId?: string;
				testId?: string;
				userId?: string;
				weekOf?: string;
			}>(req);
			const pagination = getPagination(query);
			const { results, total } = await dashboardServices.getResults(
				{
					standardId: query.standardId,
					subjectId: query.subjectId,
					testId: query.testId,
					userId: query.userId,
					weekStart: query.weekOf ? getWeekRange(new Date(query.weekOf)).weekStart : undefined,
				},
				pagination
			);
			return DefaultResponse(res, 200, 'Results fetched successfully', results, total, pagination.page);
		} catch (err) {
			next(err);
		}
	}

	// A student's progress summary and progress card
	async getStudentProgress(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const userId = req.params.id as string;
			const [summary, card] = await Promise.all([
				progressServices.getSummary(userId),
				progressServices.getProgressCard(userId, 52),
			]);
			return DefaultResponse(res, 200, 'Progress fetched successfully', { summary, card });
		} catch (err) {
			next(err);
		}
	}
}

export default new DashboardController();
