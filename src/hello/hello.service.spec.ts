import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import { I18nContext, I18nModule } from 'nestjs-i18n';
import { HelloService } from './hello.service';

describe('HelloService', () => {
  let service: HelloService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loaderOptions: {
            path: path.join(__dirname, '../i18n/'),
          },
        }),
      ],
      providers: [HelloService],
    }).compile();

    service = module.get<HelloService>(HelloService);
  });

  it('should return default English message', () => {
    expect(service.getHello()).toBe('Hello World!');
  });

  it('should return Vietnamese message when lang is vi', () => {
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'vi' } as any);
    expect(service.getHello()).toBe('Xin chào thế giới!');
  });

  it('should fallback to English when lang is not supported', () => {
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'fr' } as any);
    expect(service.getHello()).toBe('Hello World!');
  });
});
