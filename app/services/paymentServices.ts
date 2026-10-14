import { createHmac, timingSafeEqual } from 'node:crypto';
import config from '../../config';
import { createPaymentLink, fetchPaymentLink, isRazorpayConfigured, RazorpayPaymentLink } from '../client/razorpay';
import { PaymentStatus, UserRole } from '../enum';
import { newId } from '../helpers/mongoHelper';
import { CustomError } from '../models/customError';
import paymentRepository from '../repositories/paymentRepository';
import subscriptionServices from './subscriptionServices';
import userServices from './userServices';

const LINK_LIFETIME_SECONDS = 60 * 60;

type PaymentRow = NonNullable<Awaited<ReturnType<typeof paymentRepository.getById>>>;

class PaymentServices {
	isEnabled() {
		return isRazorpayConfigured();
	}

	// Razorpay Payment Link for N months of the paid plan
	async createCheckout(userId: string, months: number) {
		const student = await userServices.getStudentOrThrow(userId);
		if (student.role !== UserRole.STUDENT || student.isSchoolStudent) {
			throw new CustomError(400, 'તમારા માટે બધી ટેસ્ટ પહેલેથી મફત છે');
		}

		const paymentId = newId();
		const amountPaise = config.subscriptionMonthlyPricePaise * months;
		const link = await createPaymentLink({
			amount: amountPaise,
			// Max 40 chars and unique per link
			reference_id: `ss_${paymentId}`,
			description: `શાળા સંગાથી - ${months} મહિનાનો પ્લાન`,
			expire_by: Math.floor(Date.now() / 1000) + LINK_LIFETIME_SECONDS,
			notes: { paymentId, userId: student.id, username: student.username, months: String(months) },
			customer: { name: student.fullName, ...(student.mobile ? { contact: student.mobile } : {}) },
		});

		await paymentRepository.create({
			id: paymentId,
			userId: student.id,
			providerRef: link.id,
			amountPaise,
			months,
		});

		return { paymentId, url: link.short_url, amountPaise, months };
	}

	// Mark paid and extend the plan - safe to call from both the webhook and status polling
	private async settle(payment: PaymentRow, link: Pick<RazorpayPaymentLink, 'status' | 'payments'>) {
		if (link.status === 'paid') {
			const providerPaymentId = link.payments?.[0]?.payment_id ?? null;
			if (await paymentRepository.markPaid(payment.id, providerPaymentId)) {
				await subscriptionServices.grant(payment.userId, payment.months, 'RAZORPAY', providerPaymentId ?? payment.providerRef);
			}
		} else if (link.status === 'expired' || link.status === 'cancelled') {
			await paymentRepository.markClosed(
				payment.id,
				link.status === 'expired' ? PaymentStatus.EXPIRED : PaymentStatus.CANCELLED
			);
		}
	}

	// Called by the app after the student returns from the payment page
	async getStatus(userId: string, paymentId: string) {
		let payment = await paymentRepository.getById(paymentId);
		if (!payment || payment.userId !== userId) {
			throw new CustomError(404, 'પેમેન્ટ મળ્યું નથી');
		}

		// Don't wait for the webhook - ask Razorpay directly
		if (payment.status === PaymentStatus.CREATED) {
			await this.settle(payment, await fetchPaymentLink(payment.providerRef));
			payment = (await paymentRepository.getById(paymentId))!;
		}

		return { id: payment.id, status: payment.status, months: payment.months, amountPaise: payment.amountPaise };
	}

	verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
		if (!config.razorpayWebhookSecret || !signature) return false;
		const expected = createHmac('sha256', config.razorpayWebhookSecret).update(rawBody).digest('hex');
		const received = Buffer.from(signature, 'utf8');
		const computed = Buffer.from(expected, 'utf8');
		return received.length === computed.length && timingSafeEqual(received, computed);
	}

	// payment_link.paid / expired / cancelled
	async handleWebhook(rawBody: Buffer, signature: string | undefined) {
		if (!this.verifyWebhookSignature(rawBody, signature)) {
			throw new CustomError(400, 'Invalid webhook signature');
		}

		const event = JSON.parse(rawBody.toString('utf8')) as {
			event: string;
			payload?: {
				payment_link?: { entity?: { id?: string; status?: RazorpayPaymentLink['status'] } };
				payment?: { entity?: { id?: string } };
			};
		};
		const linkEntity = event.payload?.payment_link?.entity;
		if (!event.event?.startsWith('payment_link.') || !linkEntity?.id || !linkEntity.status) {
			return { handled: false };
		}

		const payment = await paymentRepository.getByProviderRef(linkEntity.id);
		if (!payment) {
			return { handled: false };
		}

		const paymentId = event.payload?.payment?.entity?.id;
		await this.settle(payment, {
			status: linkEntity.status,
			payments: paymentId ? [{ payment_id: paymentId, status: 'captured' }] : null,
		});
		return { handled: true };
	}
}

export default new PaymentServices();
