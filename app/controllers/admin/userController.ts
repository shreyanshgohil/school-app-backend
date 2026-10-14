import { NextFunction, Response } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { DefaultResponse } from '../../helpers/defaultResponseHelper';
import { getPagination } from '../../helpers/paginationHelper';
import { getAuthUser, getBody, getQuery } from '../../helpers/requestHelper';
import { checkValidation } from '../../helpers/validationHelper';
import { RequestExtended } from '../../interfaces/global';
import { userServices } from '../../services';

class UserController {
	// Get All Students
	async getStudents(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const query = getQuery<{
				page?: number;
				limit?: number;
				search?: string;
				standardId?: number;
				isSchoolStudent?: boolean;
				isActive?: boolean;
			}>(req);
			const pagination = getPagination(query);
			const { users, total } = await userServices.getAll(
				{
					role: UserRole.STUDENT,
					search: query.search,
					standardId: query.standardId,
					isSchoolStudent: query.isSchoolStudent,
					isActive: query.isActive,
				},
				pagination
			);
			return DefaultResponse(res, 200, 'Students fetched successfully', users, total, pagination.page);
		} catch (err) {
			next(err);
		}
	}

	// Get Student Details
	async getStudentDetails(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const user = await userServices.getDetails(req.params.id as string);
			return DefaultResponse(res, 200, 'Student fetched successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Update Student (standard, school student flag, active status...)
	async updateStudent(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const user = await userServices.update(req.params.id as string, getBody(req));
			return DefaultResponse(res, 200, 'Student updated successfully', user);
		} catch (err) {
			next(err);
		}
	}

	// Reset Password
	async resetPassword(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { password } = getBody<{ password: string }>(req);
			await userServices.resetPassword(req.params.id as string, password);
			return DefaultResponse(res, 200, 'Password reset successfully');
		} catch (err) {
			next(err);
		}
	}

	// Grant paid access (e.g. after a cash / UPI payment at school)
	async grantSubscription(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { months, note } = getBody<{ months: number; note?: string }>(req);
			const subscription = await userServices.grantSubscription(req.params.id as string, months, note);
			return DefaultResponse(res, 201, 'Subscription granted successfully', subscription);
		} catch (err) {
			next(err);
		}
	}

	// Get All Staff (admins & teachers)
	async getStaff(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const query = getQuery<{ page?: number; limit?: number; search?: string }>(req);
			const pagination = getPagination(query);
			const { users, total } = await userServices.getAll(
				{ role: { in: [UserRole.ADMIN, UserRole.TEACHER] }, search: query.search },
				pagination
			);
			return DefaultResponse(res, 200, 'Staff fetched successfully', users, total, pagination.page);
		} catch (err) {
			next(err);
		}
	}

	// Create Staff (super admin)
	async createStaff(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const user = await userServices.createStaff(getBody(req));
			return DefaultResponse(res, 201, 'સંચાલક ઉમેરાયા', user);
		} catch (err) {
			next(err);
		}
	}

	// Update Staff - details, active status, new password
	async updateStaff(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const user = await userServices.updateStaff(getAuthUser(req).id, req.params.id as string, getBody(req));
			return DefaultResponse(res, 200, 'સંચાલકની માહિતી અપડેટ થઈ', user);
		} catch (err) {
			next(err);
		}
	}
}

export default new UserController();
