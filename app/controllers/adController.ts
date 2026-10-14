import { NextFunction, Response } from 'express';
import { AdInput } from '../interfaces/contentInterface';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getBody } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { adServices } from '../services';

class AdController {
	// Ads for the app (banner + daily interstitial)
	async getActiveAds(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const ads = await adServices.getActiveAds();
			return DefaultResponse(res, 200, 'Ads fetched successfully', ads);
		} catch (err) {
			next(err);
		}
	}

	// ----- Admin -----

	async getAll(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const ads = await adServices.getAll();
			return DefaultResponse(res, 200, 'Ads fetched successfully', ads);
		} catch (err) {
			next(err);
		}
	}

	// Ad Details
	async getById(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await adServices.getById(req.params.id as string);
			return DefaultResponse(res, 200, 'Ad fetched successfully', data);
		} catch (err) {
			next(err);
		}
	}

	async create(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const ad = await adServices.create(getBody<AdInput>(req));
			return DefaultResponse(res, 201, 'Ad created successfully', ad);
		} catch (err) {
			next(err);
		}
	}

	async update(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const ad = await adServices.update(
				req.params.id as string,
				getBody<Partial<AdInput>>(req)
			);
			return DefaultResponse(res, 200, 'Ad updated successfully', ad);
		} catch (err) {
			next(err);
		}
	}

	async delete(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			await adServices.delete(req.params.id as string);
			return DefaultResponse(res, 200, 'Ad deleted successfully');
		} catch (err) {
			next(err);
		}
	}
}

export default new AdController();
