import type { Config } from 'drizzle-kit';

export default {
  schema: './src/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: process.env.POSTGRES_DB || 'smart_marketplace',
    ssl: false, // Explicitly disable SSL to avoid "The server does not support SSL connections" error
  },
} satisfies Config;
