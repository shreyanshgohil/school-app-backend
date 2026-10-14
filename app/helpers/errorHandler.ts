/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { CustomError } from '../models/customError';

const toCustomError = (err: unknown): CustomError => {
	if (err instanceof CustomError) {
		return err;
	}

	// Unique index (username, email, one attempt per test...)
	if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
		return new CustomError(409, 'આ માહિતી પહેલેથી છે');
	}
	// Malformed id or value that does not fit the schema
	if (err instanceof mongoose.Error.CastError || err instanceof mongoose.Error.ValidationError) {
		return new CustomError(400, 'અમાન્ય માહિતી');
	}

	// Malformed JSON body
	if (err instanceof SyntaxError && 'body' in err) {
		return new CustomError(400, 'Invalid JSON body');
	}

	return new CustomError(500, 'કંઈક ખોટું થયું, ફરી પ્રયત્ન કરો');
};

// Custom Error Object
export const customError = (
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const error = toCustomError(err);

	if (error.status >= 500) {
		console.error('Error: ', err);
	}

	return res.status(error.status).json({
		message: error.message,
		statusCode: error.status,
		error: error.additionalInfo,
	});
};

// 404 Not Found Error
export const notFound = (req: Request, res: Response, next: NextFunction) => {
	next(new CustomError(404, 'Path not found'));
};
