import config from '../../config';
import { CustomError } from '../models/customError';

const API_BASE = 'https://api.razorpay.com/v1';

export interface RazorpayPaymentLink {
	id: string;
	short_url: string;
	status: 'created' | 'partially_paid' | 'paid' | 'expired' | 'cancelled';
	amount: number;
	amount_paid: number;
	reference_id: string;
	payments: { payment_id: string; status: string }[] | null;
}

export const isRazorpayConfigured = () => !!config.razorpayKeyId && !!config.razorpayKeySecret;

// Small REST client for the two Payment Link calls we need (no SDK dependency)
const request = async <T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
	if (!isRazorpayConfigured()) {
		throw new CustomError(503, 'ઑનલાઇન પેમેન્ટ હજુ ચાલુ નથી - શાળાનો સંપર્ક કરો');
	}

	const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
	let response: Response;
	try {
		response = await fetch(`${API_BASE}${path}`, {
			method,
			headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(15000),
		});
	} catch (err) {
		console.error('Razorpay request failed:', err);
		throw new CustomError(503, 'પેમેન્ટ સેવા સાથે જોડાણ થયું નહીં, ફરી પ્રયત્ન કરો');
	}

	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		console.error('Razorpay error:', response.status, JSON.stringify(data));
		throw new CustomError(502, 'પેમેન્ટ લિંક બની શકી નહીં, ફરી પ્રયત્ન કરો');
	}
	return data as T;
};

export const createPaymentLink = (body: {
	amount: number;
	reference_id: string;
	description: string;
	expire_by: number;
	notes: Record<string, string>;
	customer?: { name?: string; contact?: string };
}) =>
	request<RazorpayPaymentLink>('POST', '/payment_links', {
		...body,
		currency: 'INR',
		accept_partial: false,
		// We open the link in the app ourselves - no SMS / email from Razorpay
		notify: { sms: false, email: false },
		reminder_enable: false,
	});

export const fetchPaymentLink = (id: string) => request<RazorpayPaymentLink>('GET', `/payment_links/${id}`);
