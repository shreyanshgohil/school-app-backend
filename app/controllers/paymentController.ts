import { NextFunction, Request, Response } from 'express';
import { paymentServices } from '../services';

class PaymentController {
	// Razorpay webhook - body arrives raw (Buffer) so the signature can be checked
	async razorpayWebhook(req: Request, res: Response, next: NextFunction) {
		try {
			const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
			const result = await paymentServices.handleWebhook(rawBody, req.header('x-razorpay-signature'));
			return res.status(200).json(result);
		} catch (err) {
			next(err);
		}
	}
}

export default new PaymentController();
