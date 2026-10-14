import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../../helpers/defaultResponseHelper';
import { getPagination } from '../../helpers/paginationHelper';
import { getAuthUser, getBody, getQuery } from '../../helpers/requestHelper';
import { checkValidation } from '../../helpers/validationHelper';
import { RequestExtended } from '../../interfaces/global';
import {
	GenerateQuestionsInput,
	QuestionInput,
	QuestionUpdateInput,
	ReviewQuestionsInput,
} from '../../interfaces/questionInterface';
import { QuestionListFilters } from '../../repositories/questionRepository';
import { questionServices } from '../../services';

class QuestionController {
	// Question Bank
	async getQuestions(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { page, limit, ...filters } = getQuery<
				QuestionListFilters & { page?: number; limit?: number }
			>(req);
			const pagination = getPagination({ page, limit });
			const { questions, total } = await questionServices.getAll(filters, pagination);
			return DefaultResponse(res, 200, 'Questions fetched successfully', questions, total, pagination.page);
		} catch (err) {
			next(err);
		}
	}

	// Question Details
	async getQuestion(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await questionServices.getDetails(req.params.id as string);
			return DefaultResponse(res, 200, 'Question fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	// Create Question (manual entry - approved immediately)
	async createQuestion(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const question = await questionServices.create(getAuthUser(req).id, getBody<QuestionInput>(req));
			return DefaultResponse(res, 201, 'Question created successfully', question);
		} catch (err) {
			next(err);
		}
	}

	// Update Question
	async updateQuestion(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const question = await questionServices.update(
				req.params.id as string,
				getBody<QuestionUpdateInput>(req)
			);
			return DefaultResponse(res, 200, 'Question updated successfully', question);
		} catch (err) {
			next(err);
		}
	}

	// Delete Question
	async deleteQuestion(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await questionServices.delete(req.params.id as string);
			return DefaultResponse(res, 200, 'Question deleted successfully');
		} catch (err) {
			next(err);
		}
	}

	// Approve / reject (AI) questions
	async reviewQuestions(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await questionServices.review(
				getAuthUser(req).id,
				getBody<ReviewQuestionsInput>(req)
			);
			return DefaultResponse(res, 200, 'Questions reviewed successfully', data);
		} catch (err) {
			next(err);
		}
	}

	// Generate questions with AI - saved as PENDING for review
	async generateQuestions(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const questions = await questionServices.generateWithAi(
				getAuthUser(req).id,
				getBody<GenerateQuestionsInput>(req)
			);
			return DefaultResponse(
				res,
				201,
				`${questions.length} questions generated - review them before use`,
				questions
			);
		} catch (err) {
			next(err);
		}
	}
}

export default new QuestionController();
