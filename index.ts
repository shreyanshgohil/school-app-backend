import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import config from './config';
import { connectDatabase, disconnectDatabase } from './app/config/db';
import routes from './app/routes';

const app = express();

// Behind a load balancer / ingress - needed for correct client IPs in rate limiting
app.set('trust proxy', 1);

// Images under /static are loaded by the app (and web admin) from other origins
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/static', express.static(path.join(process.cwd(), 'public'), { maxAge: '7d' }));
app.use(
	cors({
		origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	})
);
// Webhook signatures are computed over the exact bytes - keep that body raw
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Import routes
app.use('/api/v1', routes);
app.use((req, res) => {
	res.status(404).json({ message: 'Path not found', statusCode: 404 });
});

const start = async () => {
	await connectDatabase();

	const server = app.listen(config.port, () => {
		console.log(`Server is listening on port ${config.port}`);
	});

	const shutdown = () => {
		server.close(() => {
			disconnectDatabase().finally(() => process.exit(0));
		});
	};
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
};

start().catch((err) => {
	console.error('Failed to start server:', err);
	process.exit(1);
});
