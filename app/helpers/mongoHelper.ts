import { isObjectIdOrHexString, Types } from 'mongoose';
import { CustomError } from '../models/customError';

const transform = (value: unknown): unknown => {
	if (value === null || value === undefined) return value;
	if (value instanceof Types.ObjectId) return value.toString();
	if (value instanceof Date || Buffer.isBuffer(value)) return value;
	if (Array.isArray(value)) return value.map(transform);
	if (typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) {
			if (key === '__v') continue;
			out[key === '_id' ? 'id' : key] = transform(item);
		}
		return out;
	}
	return value;
};

/**
 * Turns lean Mongoose results into plain API objects (`_id` -> `id`, ObjectId -> string,
 * no `__v`), so repositories return the same shapes the services and the app expect.
 */
export const normalize = <T>(value: unknown) => transform(value) as T;

export const newId = () => new Types.ObjectId().toString();

export const toObjectId = (id: string) => new Types.ObjectId(id);

/** A 24-char hex id. Ids from old sessions or bad input are treated as "not found", not as a crash */
export const isId = (value: unknown): value is string => typeof value === 'string' && isObjectIdOrHexString(value);

/** Escape user input before using it inside a RegExp search */
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Case-insensitive "contains" filter */
export const contains = (value: string) => ({ $regex: escapeRegex(value), $options: 'i' });

/** Drop undefined keys so partial updates never overwrite fields by accident */
export const compact = <T extends object>(data: T) =>
	Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;

/** Updates and deletes of a missing document answer 404, like a missing GET */
export const found = <T>(value: T | null | undefined): T => {
	if (value === null || value === undefined) {
		throw new CustomError(404, 'માહિતી મળી નથી');
	}
	return value;
};
