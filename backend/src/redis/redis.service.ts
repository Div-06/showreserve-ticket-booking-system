import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isMock = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop retrying and fallback
          }
          return Math.min(times * 100, 1000);
        },
        lazyConnect: true,
      });

      await this.client.connect();
      this.logger.log(`Connected to Redis at ${redisUrl}`);
    } catch (err) {
      this.logger.warn(`Could not connect to Redis at ${redisUrl}. Falling back to in-memory RedisMock. (${err.message})`);
      this.client = new RedisMock() as unknown as Redis;
      this.isMock = true;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  getIsMock(): boolean {
    return this.isMock;
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (e) {
        // Ignore disconnect errors on shutdown
      }
    }
  }
}
