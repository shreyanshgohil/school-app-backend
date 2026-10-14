import { SubscriptionStatus } from '../enum';
import { normalize } from '../helpers/mongoHelper';
import { Subscription, SubscriptionModel } from '../models';

class SubscriptionRepository {
	async getActive(userId: string) {
		const now = new Date();
		const subscription = await SubscriptionModel.findOne({
			userId,
			status: SubscriptionStatus.ACTIVE,
			startsAt: { $lte: now },
			endsAt: { $gt: now },
		})
			.sort({ endsAt: -1 })
			.lean();
		return normalize<Subscription | null>(subscription);
	}

	async getLatest(userId: string) {
		const subscription = await SubscriptionModel.findOne({ userId, status: SubscriptionStatus.ACTIVE })
			.sort({ endsAt: -1 })
			.lean();
		return normalize<Subscription | null>(subscription);
	}

	async create(data: {
		userId: string;
		plan: string;
		amountPaise: number;
		startsAt: Date;
		endsAt: Date;
		provider?: string;
		providerRef?: string;
	}) {
		const subscription = await SubscriptionModel.create(data);
		return normalize<Subscription>(subscription.toObject());
	}

	async countActive() {
		const now = new Date();
		return SubscriptionModel.countDocuments({
			status: SubscriptionStatus.ACTIVE,
			startsAt: { $lte: now },
			endsAt: { $gt: now },
		});
	}
}

export default new SubscriptionRepository();
