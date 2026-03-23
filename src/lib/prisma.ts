import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Load environment variables for non-Next.js environments (like seeding)
if (typeof window === 'undefined') {
    try {
        // @ts-ignore
        if (process.loadEnvFile) {
            process.loadEnvFile();
        }
    } catch (e) {
        // Ignore
    }
}
const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ 
    adapter,
    log: ['query', 'info', 'warn', 'error']
  });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
