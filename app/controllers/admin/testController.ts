import { NextFunction, Response } from 'express';
import { TestStatus } from '../../enum';
import { getWeekRange } from '../../helpers/dateHelper';
import { DefaultResponse } from '../../helpers/defaultResponseHelper';
import { getPagination } from '../../helpers/paginationHelper';
import { getAuthUser, getBody, getQuery } from '../../helpers/requestHelper';
import { checkValidation } from '../../helpers/validationHelper';
import { RequestExtended } from '../../interfaces/global';
import { TestInput, TestUpdateInput } from '../../interfaces/testInterface';
import { testServices } from '../../services';

class TestController {
	// Get All Tests
	async getTests(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const query = getQuery<{
				page?: number;
				limit?: number;
				standardId?: number;
				subjectId?: string;
				status?: TestStatus;
				weekOf?: string;
			}>(req);
			const pagination = getPagination(query);
			const { tests, total } = await testServices.getAll(
				{
					standardId: query.standardId,
					subjectId: query.subjectId,
					status: query.status,
					weekStart: query.weekOf ? getWeekRange(new Date(query.weekOf)).weekStart : undefined,
				},
				pagination
			);
			return DefaultResponse(res, 200, 'Tests fetched successfully', tests, total, pagination.page);
		} catch (err) {
			next(err);
		}
	}

	// Test Details with questions & answer key
	async getTestDetails(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const test = await testServices.getDetails(req.params.id as string);
			return DefaultResponse(res, 200, 'Test fetched successfully', test);
		} catch (err) {
			next(err);
		}
	}

	// Create Test
	async createTest(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const test = await testServices.create(getAuthUser(req).id, getBody<TestInput>(req));
			return DefaultResponse(res, 201, 'Test created successfully', test);
		} catch (err) {
			next(err);
		}
	}

	// Update Test
	async updateTest(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const test = await testServices.update(req.params.id as string, getBody<TestUpdateInput>(req));
			return DefaultResponse(res, 200, 'Test updated successfully', test);
		} catch (err) {
			next(err);
		}
	}

	// Publish / archive / back to draft
	async updateTestStatus(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { status } = getBody<{ status: TestStatus }>(req);
			const test = await testServices.updateStatus(req.params.id as string, status);
			return DefaultResponse(res, 200, 'Test status updated successfully', test);
		} catch (err) {
			next(err);
		}
	}

	// Delete Test
	async deleteTest(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await testServices.delete(req.params.id as string);
			return DefaultResponse(res, 200, 'Test deleted successfully');
		} catch (err) {
			next(err);
		}
	}
}

export default new TestController();
