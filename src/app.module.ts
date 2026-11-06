import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] }, // Hỗ trợ query ?lang=vi hoặc ?lang=en
        AcceptLanguageResolver, // Hỗ trợ header Accept-Language
        new HeaderResolver(['x-custom-lang']),
      ],
    }),
    HelloModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
