import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { chapterServices } from '../services';

class ChapterController {
	// Chapter reading / vocabulary / practice questions
	async getChapterDetails(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const chapter = await chapterServices.getChapterDetail(
				getAuthUser(req).id,
				req.params.id as string
			);
			return DefaultResponse(res, 200, 'Chapter fetched successfully', chapter);
		} catch (err) {
			next(err);
		}
	}

	// Mark Chapter Complete
	async completeChapter(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await chapterServices.markComplete(getAuthUser(req).id, req.params.id as string);
			return DefaultResponse(res, 200, 'પાઠ પૂર્ણ થયો');
		} catch (err) {
			next(err);
		}
	}
}

export default new ChapterController();
