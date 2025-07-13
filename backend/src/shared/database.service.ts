import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private pool: Pool;
  public db: ReturnType<typeof drizzle<typeof schema>>;
  private logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      user: this.configService.getOrThrow('POSTGRES_USER'),
      host: this.configService.getOrThrow('POSTGRES_HOST'),
      database: this.configService.getOrThrow('POSTGRES_DB'),
      password: this.configService.getOrThrow('POSTGRES_PASSWORD'),
      port: parseInt(this.configService.getOrThrow('POSTGRES_PORT'), 10),
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onApplicationBootstrap() {
    try {
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      this.logger.log('Database connected successfully');
    } catch (err) {
      this.logger.error('Database connection error', err);
      throw err;
    }
  }

  async onApplicationShutdown() {
    try {
      await this.pool.end();
      this.logger.log('Database disconnected successfully');
    } catch (err) {
      this.logger.error('Database disconnection error', err);
    }
  }
}
