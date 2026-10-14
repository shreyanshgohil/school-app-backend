import dotenv from 'dotenv';
dotenv.config({ path: '.env', quiet: true });

const required = (name: string) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
};

// Env file configuration
function config(Env: NodeJS.ProcessEnv) {
	return {
		nodeEnv: Env.NODE_ENV ?? 'development',
		port: Number(Env.PORT ?? 8080),
		// Comma separated list; "*" allows any origin (mobile apps send no Origin header)
		corsOrigins: (Env.CORS_ORIGINS ?? '*').split(',').map((origin) => origin.trim()),
		mongodbUri: required('MONGODB_URI'),
		accessTokenSecretKey: required('ACCESS_TOKEN_SECRET_KEY'),
		refreshTokenSecretKey: required('REFRESH_TOKEN_SECRET_KEY'),
		accessTokenExpireTime: 60 * 60, // in seconds - 1 hour
		refreshTokenExpireTime: 30 * 24 * 60 * 60, // in seconds - 30 days
		// Students who register with this code are marked as our own school students (free access)
		schoolAccessCode: Env.SCHOOL_ACCESS_CODE ?? '',
		schoolName: Env.SCHOOL_NAME ?? '',
		subscriptionMonthlyPricePaise: Number(Env.SUBSCRIPTION_MONTHLY_PRICE_PAISE ?? 1000),
		// Razorpay (online plan purchase). Empty = online payment switched off
		razorpayKeyId: Env.RAZORPAY_KEY_ID ?? '',
		razorpayKeySecret: Env.RAZORPAY_KEY_SECRET ?? '',
		razorpayWebhookSecret: Env.RAZORPAY_WEBHOOK_SECRET ?? '',
		anthropicApiKey: Env.ANTHROPIC_API_KEY ?? '',
		aiQuestionModel: Env.AI_QUESTION_MODEL ?? 'claude-opus-5-5',
	};
}

export default {
	...config(process.env),
};
