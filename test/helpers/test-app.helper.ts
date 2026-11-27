import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { REDIS_CLIENT } from '../../src/redis/redis.constants';
import { RedisService } from '../../src/redis/redis.service';
import {
  assertTestDatabase,
  clearTestRedis,
  truncateDatabase,
} from './test-database.helper';

export interface E2eTestContext {
  app: INestApplication<App>;
  dataSource: DataSource;
  jwtService: JwtService;
  redis: Redis;
  redisService: RedisService;
}

export async function createTestApp(): Promise<E2eTestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();

  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);
  const redis = app.get<Redis>(REDIS_CLIENT);
  const redisService = app.get(RedisService);

  assertTestDatabase(dataSource);
  await dataSource.runMigrations();
  await truncateDatabase(dataSource);
  await clearTestRedis(redis);

  return {
    app,
    dataSource,
    jwtService,
    redis,
    redisService,
  };
}

