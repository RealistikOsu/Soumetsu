import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { config } from './config';
import { PrismaClient } from './generated/client';

export const db = new PrismaClient({ adapter: new PrismaMariaDb(config.databaseUrl) });
