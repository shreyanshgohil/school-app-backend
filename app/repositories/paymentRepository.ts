import { PaymentStatus } from '../enum';
import { normalize } from '../helpers/mongoHelper';
import { Payment, PaymentModel } from '../models';

class PaymentRepository {
	async create(data: { id: string; userId: string; providerRef: string; amountPaise: number; months: number }) {
		const { id, ...rest } = data;
		const payment = await PaymentModel.create({ _id: id, ...rest });
		return normalize<Payment>(payment.toObject());
	}

	async getById(id: string) {
		return normalize<Payment | null>(await PaymentModel.findById(id).lean());
	}

	async getByProviderRef(providerRef: string) {
		return normalize<Payment | null>(await PaymentModel.findOne({ providerRef }).lean());
	}

	// Moves CREATED -> PAID exactly once; returns false if it was already handled
	async markPaid(id: string, providerPaymentId: string | null) {
		const result = await PaymentModel.updateOne(
			{ _id: id, status: PaymentStatus.CREATED },
			{ $set: { status: PaymentStatus.PAID, providerPaymentId, paidAt: new Date() } }
		);
		return result.modifiedCount === 1;
	}

	async markClosed(id: string, status: typeof PaymentStatus.EXPIRED | typeof PaymentStatus.CANCELLED) {
		await PaymentModel.updateOne({ _id: id, status: PaymentStatus.CREATED }, { $set: { status } });
	}
}

export default new PaymentRepository();
