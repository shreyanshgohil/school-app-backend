/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { CustomError } from '../models/customError';

const toCustomError = (err: unknown): CustomError => {
	if (err instanceof CustomError) {
		return err;
	}

	if (err instanceof Prisma.PrismaClientKnownRequestError) {
		// Unique constraint
		if (err.code === 'P2002') {
			return new CustomError(409, 'આ માહિતી પહેલેથી છે');
		}
		// Record not found
		if (err.code === 'P2025') {
			return new CustomError(404, 'માહિતી મળી નથી');
		}
		// Foreign key constraint
		if (err.code === 'P2003') {
			return new CustomError(400, 'સંબંધિત માહિતી વપરાશમાં છે અથવા મળી નથી');
		}
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
