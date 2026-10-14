import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser, getBody, getQuery } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { AnswerInput, TestScope } from '../interfaces/testInterface';
import { testServices } from '../services';

class TestController {
	// Weekly tests - live this week, or past weeks
	async getTests(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { scope = 'live', subjectId } = getQuery<{ scope?: TestScope; subjectId?: string }>(req);
			const tests = await testServices.getStudentTests(getAuthUser(req).id, scope, subjectId);
			return DefaultResponse(res, 200, 'Tests fetched successfully', tests);
		} catch (err) {
			next(err);
		}
	}

	// Test Details
	async getTestDetails(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const test = await testServices.getTestDetail(getAuthUser(req).id, req.params.id as string);
			return DefaultResponse(res, 200, 'Test fetched successfully', test);
		} catch (err) {
			next(err);
		}
	}

	// Start Test - returns questions without the answer key
	async startTest(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await testServices.startTest(getAuthUser(req).id, req.params.id as string);
			return DefaultResponse(res, 200, 'Test started', data);
		} catch (err) {
			next(err);
		}
	}

	// Submit Test
	async submitTest(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { answers } = getBody<{ answers: AnswerInput[] }>(req);
			const result = await testServices.submitTest(
				getAuthUser(req).id,
				req.params.id as string,
				answers
			);
			return DefaultResponse(res, 200, 'ટેસ્ટ જમા થઈ ગઈ', result);
		} catch (err) {
			next(err);
		}
	}

	// Test Result with answer review
	async getTestResult(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const result = await testServices.getResult(getAuthUser(req).id, req.params.id as string);
			return DefaultResponse(res, 200, 'Result fetched successfully', result);
		} catch (err) {
			next(err);
		}
	}
}

export default new TestController();
