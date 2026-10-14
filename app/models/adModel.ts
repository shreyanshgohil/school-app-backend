import { model, Schema } from 'mongoose';
import { AdType } from '../enum';

// Admin managed, child-safe house ads
export interface Ad {
	id: string;
	title: string;
	type: AdType;
	imageUrl: string;
	targetUrl: string | null;
	isActive: boolean;
	priority: number;
	startsAt: Date | null;
	endsAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const adSchema = new Schema(
	{
		title: { type: String, required: true },
		type: { type: String, enum: Object.values(AdType), required: true },
		imageUrl: { type: String, required: true },
		targetUrl: { type: String, default: null },
		isActive: { type: Boolean, default: true },
		priority: { type: Number, default: 0 },
		startsAt: { type: Date, default: null },
		endsAt: { type: Date, default: null },
	},
	{ timestamps: true, versionKey: false }
);

adSchema.index({ type: 1, isActive: 1 });

export const AdModel = model('Ad', adSchema);
