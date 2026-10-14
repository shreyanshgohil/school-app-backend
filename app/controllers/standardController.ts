import { NextFunction, Request, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { standardRepository } from '../repositories';

class StandardController {
	// Standards list (public - used on the register screen)
	async getStandards(req: Request, res: Response, next: NextFunction) {
		try {
			const standards = await standardRepository.getAll();
			return DefaultResponse(res, 200, 'Standards fetched successfully', standards);
		} catch (err) {
			next(err);
		}
	}
}

export default new StandardController();
