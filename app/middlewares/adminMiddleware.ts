import { NextFunction, Response } from 'express';
import { UserRole } from '../enum';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';

// Must run after isAuthenticated
export const allowRoles =
	(...roles: UserRole[]) =>
	(req: RequestExtended, res: Response, next: NextFunction) => {
		if (!req.user || !roles.includes(req.user.role)) {
			return next(new CustomError(403, 'તમને આ માટે પરવાનગી નથી'));
		}
		next();
	};

// Admins and teachers manage content, questions, tests and results
export const isStaff = allowRoles(UserRole.ADMIN, UserRole.TEACHER);

// Only admins manage students and ads
export const isAdmin = allowRoles(UserRole.ADMIN);
