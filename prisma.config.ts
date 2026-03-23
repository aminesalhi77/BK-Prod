import { defineConfig } from '@prisma/config';

// Load environment variables from .env file
try {
  // @ts-ignore - loadEnvFile is available in Node 20.6+
  if (process.loadEnvFile) {
    process.loadEnvFile();
  }
} catch (e) {
  // Ignore if .env doesn't exist or other error
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});