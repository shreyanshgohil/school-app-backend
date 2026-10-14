import { prisma } from '../client/prisma';

// Database Connection
export const connectDatabase = async () => {
	await prisma.$connect();
	console.log('Database connected successfully');
};
