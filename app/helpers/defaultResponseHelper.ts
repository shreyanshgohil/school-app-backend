import { Response } from 'express';
import { DefaultResponseInterface } from '../interfaces/global';

// Default Response For Every Api
export const DefaultResponse = (
	res: Response,
	statusCode: number,
	message: string,
	data?: unknown,
	total?: number,
	page?: number
) => {
	let response: DefaultResponseInterface = {
		message: message,
		statusCode: statusCode,
		data: data ?? null,
	};

	if (total !== undefined) {
		response = { ...response, total };
	}
	if (page !== undefined) {
		response = { ...response, page };
	}

	return res.status(statusCode).json(response);
};
