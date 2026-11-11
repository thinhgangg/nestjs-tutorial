import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const BLACKLIST_PREFIX = 'blacklist:';
const BLACKLIST_VALUE = '1';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setBlacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      `${BLACKLIST_PREFIX}${token}`,
      BLACKLIST_VALUE,
      'EX',
      ttlSeconds,
    );
  }

  async checkTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`${BLACKLIST_PREFIX}${token}`);
    return Boolean(result);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
