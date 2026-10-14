import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { PaymentStatus } from '../generated/prisma/enums';

class PaymentRepository {
	async create(data: Prisma.PaymentUncheckedCreateInput) {
		return prisma.payment.create({ data });
	}

	async getById(id: string) {
		return prisma.payment.findUnique({ where: { id } });
	}

	async getByProviderRef(providerRef: string) {
		return prisma.payment.findUnique({ where: { providerRef } });
	}

	// Moves CREATED -> PAID exactly once; returns false if it was already handled
	async markPaid(id: string, providerPaymentId: string | null) {
		const result = await prisma.payment.updateMany({
			where: { id, status: PaymentStatus.CREATED },
			data: { status: PaymentStatus.PAID, providerPaymentId, paidAt: new Date() },
		});
		return result.count === 1;
	}

	async markClosed(id: string, status: typeof PaymentStatus.EXPIRED | typeof PaymentStatus.CANCELLED) {
		return prisma.payment.updateMany({ where: { id, status: PaymentStatus.CREATED }, data: { status } });
	}
}

export default new PaymentRepository();
