import { NextFunction, Response } from 'express';
import { DefaultResponse } from '../helpers/defaultResponseHelper';
import { getAuthUser, getBody } from '../helpers/requestHelper';
import { checkValidation } from '../helpers/validationHelper';
import { RequestExtended } from '../interfaces/global';
import { paymentServices, subscriptionServices, userServices } from '../services';

class SubscriptionController {
	// Free / paid access status for the logged-in student
	async getStatus(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			const student = await userServices.getStudentOrThrow(getAuthUser(req).id);
			const status = await subscriptionServices.getStatus(student);
			return DefaultResponse(res, 200, 'Subscription fetched successfully', status);
		} catch (err) {
			next(err);
		}
	}

	// Start an online purchase - returns the Razorpay payment page URL
	async checkout(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const { months } = getBody<{ months: number }>(req);
			const data = await paymentServices.createCheckout(getAuthUser(req).id, months);
			return DefaultResponse(res, 201, 'Payment link created', data);
		} catch (err) {
			next(err);
		}
	}

	// Payment status after the student returns from the payment page
	async paymentStatus(req: RequestExtended, res: Response, next: NextFunction) {
		try {
			checkValidation(req);
			const data = await paymentServices.getStatus(getAuthUser(req).id, req.params.id as string);
			return DefaultResponse(res, 200, 'Payment status fetched', data);
		} catch (err) {
			next(err);
		}
	}
}

export default new SubscriptionController();
