import {
  Inject,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const BLACKLIST_PREFIX = 'blacklist:';
const BLACKLIST_VALUE = '1';
const REDIS_ERROR_MESSAGE = 'Redis service unavailable';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setBlacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    const result = await this.redis
      .set(`${BLACKLIST_PREFIX}${jti}`, BLACKLIST_VALUE, 'EX', ttlSeconds)
      .catch(() => null);

    if (!result) {
      throw new ServiceUnavailableException(REDIS_ERROR_MESSAGE);
    }
  }

  async checkTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis
      .get(`${BLACKLIST_PREFIX}${jti}`)
      .catch(() => undefined);

    if (result === undefined) {
      throw new ServiceUnavailableException(REDIS_ERROR_MESSAGE);
    }

    return Boolean(result);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
