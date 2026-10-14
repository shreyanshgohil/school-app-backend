import { Request } from 'express';
import { matchedData } from 'express-validator';
import { RequestExtended } from '../interfaces/global';
import { CustomError } from '../models/customError';

// Authenticated user set by isAuthenticated
export const getAuthUser = (req: RequestExtended) => {
	if (!req.user) {
		throw new CustomError(401, 'કૃપા કરીને લૉગિન કરો');
	}
	return req.user;
};

// Only the fields declared in the route's validators - nothing else from the client
export const getBody = <T>(req: Request) =>
	matchedData(req, { locations: ['body'], includeOptionals: true }) as T;

export const getQuery = <T>(req: Request) =>
	matchedData(req, { locations: ['query'] }) as T;
