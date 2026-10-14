import { NextFunction, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { MaterialType } from '../../generated/prisma/enums';
import { DefaultResponse } from '../../helpers/defaultResponseHelper';
import { getBody, getQuery } from '../../helpers/requestHelper';
import { checkValidation } from '../../helpers/validationHelper';
import { RequestExtended } from '../../interfaces/global';
import { contentServices } from '../../services';

// Subjects, chapters, study material and homework
class ContentController {
	async getSubjects(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { standardId } = getQuery<{ standardId: number }>(req);
			const subjects = await contentServices.getSubjects(standardId);
			return DefaultResponse(res, 200, 'Subjects fetched successfully', subjects);
		} catch (err) {
			next(err);
		}
	}

	async createSubject(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const subject = await contentServices.createSubject(
				getBody<Prisma.SubjectUncheckedCreateInput>(req)
			);
			return DefaultResponse(res, 201, 'Subject created successfully', subject);
		} catch (err) {
			next(err);
		}
	}

	async updateSubject(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const subject = await contentServices.updateSubject(
				req.params.id as string,
				getBody<Prisma.SubjectUncheckedUpdateInput>(req)
			);
			return DefaultResponse(res, 200, 'Subject updated successfully', subject);
		} catch (err) {
			next(err);
		}
	}

	async getChapters(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { subjectId } = getQuery<{ subjectId: string }>(req);
			const chapters = await contentServices.getChapters(subjectId);
			return DefaultResponse(res, 200, 'Chapters fetched successfully', chapters);
		} catch (err) {
			next(err);
		}
	}

	// Chapter Details
	async getChapter(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await contentServices.getChapter(req.params.id as string);
			return DefaultResponse(res, 200, 'Chapter fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	async createChapter(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const chapter = await contentServices.createChapter(
				getBody<Prisma.ChapterUncheckedCreateInput>(req)
			);
			return DefaultResponse(res, 201, 'Chapter created successfully', chapter);
		} catch (err) {
			next(err);
		}
	}

	async updateChapter(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const chapter = await contentServices.updateChapter(
				req.params.id as string,
				getBody<Prisma.ChapterUncheckedUpdateInput>(req)
			);
			return DefaultResponse(res, 200, 'Chapter updated successfully', chapter);
		} catch (err) {
			next(err);
		}
	}

	async deleteChapter(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await contentServices.deleteChapter(req.params.id as string);
			return DefaultResponse(res, 200, 'Chapter deleted successfully');
		} catch (err) {
			next(err);
		}
	}

	async getMaterials(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { standardId, type, subjectId } = getQuery<{
				standardId: number;
				type?: MaterialType;
				subjectId?: string;
			}>(req);
			const materials = await contentServices.getMaterials(standardId, { type, subjectId });
			return DefaultResponse(res, 200, 'Materials fetched successfully', materials);
		} catch (err) {
			next(err);
		}
	}

	// Material Details
	async getMaterial(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await contentServices.getMaterial(req.params.id as string);
			return DefaultResponse(res, 200, 'Material fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	async createMaterial(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const material = await contentServices.createMaterial(
				getBody<Prisma.StudyMaterialUncheckedCreateInput>(req)
			);
			return DefaultResponse(res, 201, 'Material created successfully', material);
		} catch (err) {
			next(err);
		}
	}

	async updateMaterial(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const material = await contentServices.updateMaterial(
				req.params.id as string,
				getBody<Prisma.StudyMaterialUncheckedUpdateInput>(req)
			);
			return DefaultResponse(res, 200, 'Material updated successfully', material);
		} catch (err) {
			next(err);
		}
	}

	async deleteMaterial(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await contentServices.deleteMaterial(req.params.id as string);
			return DefaultResponse(res, 200, 'Material deleted successfully');
		} catch (err) {
			next(err);
		}
	}

	async getHomework(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { standardId } = getQuery<{ standardId: number }>(req);
			const homework = await contentServices.getHomework(standardId);
			return DefaultResponse(res, 200, 'Homework fetched successfully', homework);
		} catch (err) {
			next(err);
		}
	}

	// Homework Details
	async getHomeworkItem(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await contentServices.getHomeworkById(req.params.id as string);
			return DefaultResponse(res, 200, 'Homework fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	async createHomework(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const homework = await contentServices.createHomework(
				getBody<Prisma.HomeworkUncheckedCreateInput>(req)
			);
			return DefaultResponse(res, 201, 'Homework created successfully', homework);
		} catch (err) {
			next(err);
		}
	}

	async updateHomework(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const homework = await contentServices.updateHomework(
				req.params.id as string,
				getBody<Prisma.HomeworkUncheckedUpdateInput>(req)
			);
			return DefaultResponse(res, 200, 'Homework updated successfully', homework);
		} catch (err) {
			next(err);
		}
	}

	async deleteHomework(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await contentServices.deleteHomework(req.params.id as string);
			return DefaultResponse(res, 200, 'Homework deleted successfully');
		} catch (err) {
			next(err);
		}
	}
}

export default new ContentController();
