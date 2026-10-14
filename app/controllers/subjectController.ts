import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { subjectServices } from '../services';

class SubjectController {
	// Subjects of my standard
	async getSubjects(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const subjects = await subjectServices.getStudentSubjects(getAuthUser(req).id);
			return DefaultResponse(res, 200, 'Subjects fetched successfully', subjects);
		} catch (err) {
			next(err);
		}
	}

	// Subject with its chapters
	async getSubjectDetails(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const subject = await subjectServices.getSubjectDetail(
				getAuthUser(req).id,
				req.params.id as string
			);
			return DefaultResponse(res, 200, 'Subject fetched successfully', subject);
		} catch (err) {
			next(err);
		}
	}
}

export default new SubjectController();
