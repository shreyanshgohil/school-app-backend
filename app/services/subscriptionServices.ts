import config from '../../config';
import { isRazorpayConfigured } from '../client/razorpay';
import { PLAN_MONTHS } from '../constants/plans';
import { addMonths } from '../helpers/dateHelper';
import { UserRole } from '../generated/prisma/enums';
import { subscriptionRepository } from '../repositories';

interface AccessUser {
	id: string;
	role: UserRole;
	isSchoolStudent: boolean;
}

class SubscriptionServices {
	// Staff and our own school students always have access; others need an active plan
	async hasPremiumAccess(user: AccessUser) {
		if (user.role !== UserRole.STUDENT || user.isSchoolStudent) {
			return true;
		}
		const active = await subscriptionRepository.getActive(user.id);
		return !!active;
	}

	async getStatus(user: AccessUser) {
		const active = await subscriptionRepository.getActive(user.id);
		return {
			isSchoolStudent: user.isSchoolStudent,
			hasPremiumAccess: user.role !== UserRole.STUDENT || user.isSchoolStudent || !!active,
			activeSubscription: active
				? { plan: active.plan, startsAt: active.startsAt, endsAt: active.endsAt }
				: null,
			monthlyPricePaise: config.subscriptionMonthlyPricePaise,
			onlinePaymentEnabled: isRazorpayConfigured(),
			planMonths: PLAN_MONTHS,
		};
	}

	// Extends from the end of the current plan so renewals never lose days
	async grant(userId: string, months: number, provider: string, providerRef?: string) {
		const latest = await subscriptionRepository.getLatest(userId);
		const now = new Date();
		const startsAt = latest && latest.endsAt > now ? latest.endsAt : now;

		return subscriptionRepository.create({
			userId,
			plan: 'MONTHLY',
			amountPaise: config.subscriptionMonthlyPricePaise * months,
			startsAt,
			endsAt: addMonths(startsAt, months),
			provider,
			providerRef,
		});
	}
}

export default new SubscriptionServices();
