import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { seed } from '../src/shared/seeds';
import path from 'path';

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

const db = drizzle(pool);

async function migrateAndSeed() {
  try {
    console.log('🚀 Starting database setup...');

    // Run migrations
    console.log('📝 Running migrations...');
    await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
    console.log('✅ Migrations completed!');

    // Run seed
    console.log('🌱 Running seed...');
    await seed();
    console.log('✅ Seed completed!');

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateAndSeed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { migrateAndSeed };
