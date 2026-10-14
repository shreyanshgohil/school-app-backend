import { model, Schema } from 'mongoose';
import { SubscriptionStatus } from '../enum';

export interface Subscription {
	id: string;
	userId: string;
	plan: string;
	amountPaise: number;
	status: SubscriptionStatus;
	startsAt: Date;
	endsAt: Date;
	provider: string | null;
	providerRef: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const subscriptionSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		plan: { type: String, default: 'MONTHLY' },
		amountPaise: { type: Number, required: true },
		status: { type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE },
		startsAt: { type: Date, required: true },
		endsAt: { type: Date, required: true },
		provider: { type: String, default: null },
		providerRef: { type: String, default: null },
	},
	{ timestamps: true, versionKey: false }
);

subscriptionSchema.index({ userId: 1, endsAt: -1 });

export const SubscriptionModel = model('Subscription', subscriptionSchema);
