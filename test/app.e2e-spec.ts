import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('HelloController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/hello (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/hello')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/hello?lang=vi (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/hello?lang=vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });

  it('/api/hello (GET) - Accept-Language: vi', () => {
    return request(app.getHttpServer())
      .get('/api/hello')
      .set('Accept-Language', 'vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });

  it('/api/hello (GET) - x-custom-lang: vi', () => {
    return request(app.getHttpServer())
      .get('/api/hello')
      .set('x-custom-lang', 'vi')
      .expect(200)
      .expect('Xin chào thế giới!');
  });
});
