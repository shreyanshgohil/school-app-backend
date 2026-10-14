import { NextFunction, Response } from 'express';
import { MaterialType } from '../enum';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser, getQuery } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { contentServices } from '../services';

class ContentController {
	// Study Material (notes / pdf / video)
	async getMaterials(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const filters = getQuery<{ type?: MaterialType; subjectId?: string }>(req);
			const materials = await contentServices.getStudentMaterials(getAuthUser(req).id, filters);
			return DefaultResponse(res, 200, 'Materials fetched successfully', materials);
		} catch (err) {
			next(err);
		}
	}

	// Homework
	async getHomework(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const homework = await contentServices.getStudentHomework(getAuthUser(req).id);
			return DefaultResponse(res, 200, 'Homework fetched successfully', homework);
		} catch (err) {
			next(err);
		}
	}
}

export default new ContentController();
