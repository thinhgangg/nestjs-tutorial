import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port:
            Number(configService.get<number>('REDIS_PORT')) ||
            DEFAULT_REDIS_PORT,
          db: Number(configService.get<number>('REDIS_DB')) || DEFAULT_REDIS_DB,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
