import { model, Schema } from 'mongoose';

// Std 1 to 10 - the number itself is the id
export interface Standard {
	id: number;
	name: string;
	order: number;
}

const standardSchema = new Schema(
	{
		_id: { type: Number, required: true },
		name: { type: String, required: true },
		order: { type: Number, required: true },
	},
	{ versionKey: false }
);

export const StandardModel = model('Standard', standardSchema);
