import { model, Schema } from 'mongoose';
import { PaymentStatus } from '../enum';

// One online checkout (Razorpay Payment Link). Paying it extends the user's Subscription.
export interface Payment {
	id: string;
	userId: string;
	provider: string;
	// Razorpay payment link id (plink_...)
	providerRef: string;
	// Razorpay payment id (pay_...) once paid
	providerPaymentId: string | null;
	amountPaise: number;
	months: number;
	status: PaymentStatus;
	paidAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const paymentSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		provider: { type: String, default: 'RAZORPAY' },
		providerRef: { type: String, required: true, unique: true },
		providerPaymentId: { type: String, default: null },
		amountPaise: { type: Number, required: true },
		months: { type: Number, required: true },
		status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.CREATED },
		paidAt: { type: Date, default: null },
	},
	{ timestamps: true, versionKey: false }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export const PaymentModel = model('Payment', paymentSchema);
