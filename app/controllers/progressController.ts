import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser, getQuery } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { progressServices } from '../services';

class ProgressController {
	// Progress Summary
	async getSummary(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const summary = await progressServices.getSummary(getAuthUser(req).id);
			return DefaultResponse(res, 200, 'Progress fetched successfully', summary);
		} catch (err) {
			next(err);
		}
	}

	// Weekly Progress Card
	async getProgressCard(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { weeks = 12 } = getQuery<{ weeks?: number }>(req);
			const card = await progressServices.getProgressCard(getAuthUser(req).id, weeks);
			return DefaultResponse(res, 200, 'Progress card fetched successfully', card);
		} catch (err) {
			next(err);
		}
	}
}

export default new ProgressController();
