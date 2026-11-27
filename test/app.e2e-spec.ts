import request from 'supertest';
import { createTestApp, E2eTestContext } from './helpers/test-app.helper';
import {
  clearTestRedis,
  truncateDatabase,
} from './helpers/test-database.helper';

describe('HelloController (e2e)', () => {
  let ctx: E2eTestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await truncateDatabase(ctx.dataSource);
    await clearTestRedis(ctx.redis);
  });

  afterAll(async () => {
    if (ctx?.app) {
      await ctx.app.close();
    }
  });

  it('/api/hello (GET)', () => {
    return request(ctx.app.getHttpServer())
      .get('/api/hello')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/hello?lang=vi (GET)', () => {
    return request(ctx.app.getHttpServer())
      .get('/api/hello?lang=vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });

  it('/api/hello (GET) - Accept-Language: vi', () => {
    return request(ctx.app.getHttpServer())
      .get('/api/hello')
      .set('Accept-Language', 'vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });

  it('/api/hello (GET) - x-custom-lang: vi', () => {
    return request(ctx.app.getHttpServer())
      .get('/api/hello')
      .set('x-custom-lang', 'vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });
});
