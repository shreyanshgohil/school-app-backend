import { prisma } from '../client/prisma';
import { Prisma } from '../generated/prisma/client';
import { SubscriptionStatus } from '../generated/prisma/enums';

class SubscriptionRepository {
	async getActive(userId: string) {
		const now = new Date();
		return prisma.subscription.findFirst({
			where: {
				userId,
				status: SubscriptionStatus.ACTIVE,
				startsAt: { lte: now },
				endsAt: { gt: now },
			},
			orderBy: { endsAt: 'desc' },
		});
	}

	async getLatest(userId: string) {
		return prisma.subscription.findFirst({
			where: { userId, status: SubscriptionStatus.ACTIVE },
			orderBy: { endsAt: 'desc' },
		});
	}

	async create(data: Prisma.SubscriptionUncheckedCreateInput) {
		return prisma.subscription.create({ data });
	}

	async countActive() {
		const now = new Date();
		return prisma.subscription.count({
			where: { status: SubscriptionStatus.ACTIVE, startsAt: { lte: now }, endsAt: { gt: now } },
		});
	}
}

export default new SubscriptionRepository();
