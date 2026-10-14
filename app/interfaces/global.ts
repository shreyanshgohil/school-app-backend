import { Request } from 'express';
import { UserRole } from '../enum';

export interface AuthUser {
	id: string;
	role: UserRole;
	tokenId: string;
}

export interface RequestExtended extends Request {
	user?: AuthUser;
}

export interface DefaultResponseInterface {
	message: string;
	statusCode: number;
	data: unknown;
	total?: number;
	page?: number;
}

export interface PaginationQuery {
	page: number;
	limit: number;
	offset: number;
}
