import { PaginationQuery } from '../interfaces/global';

const MAX_LIMIT = 100;

export const getPagination = (query: { page?: unknown; limit?: unknown }): PaginationQuery => {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || 20));
	return { page, limit, offset: (page - 1) * limit };
};
