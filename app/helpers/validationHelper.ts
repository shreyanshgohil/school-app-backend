import { Request } from 'express';
import { validationResult } from 'express-validator';
import { CustomError } from '../models/customError';

// Check Validation For Requests
export const checkValidation = (req: Request) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const all = errors.array();
		const first = all[0];
		// Rules without a custom message fall back to express-validator's "Invalid value"
		const message =
			first.msg === 'Invalid value' ? `અમાન્ય માહિતી${first.type === 'field' ? ` (${first.path})` : ''}` : first.msg;
		throw new CustomError(400, message, all);
	}
};
