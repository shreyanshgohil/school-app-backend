import { PrismaPg } from '@prisma/adapter-pg';
import config from '../../config';
import { PrismaClient } from '../generated/prisma/client';

// Single shared client for the whole app
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
