import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { AttachmentsModule } from './attachments/attachments.module';
import { Attachment } from './attachments/entities/attachment.entity';
import { ArticleFavorite } from './articles/entities/article-favorite.entity';
import { Article } from './articles/entities/article.entity';
import { Tag } from './articles/entities/tag.entity';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { Comment } from './comments/entities/comment.entity';
import { HelloModule } from './hello/hello.module';
import { Follow } from './profiles/entities/follow.entity';
import { ProfilesModule } from './profiles/profiles.module';
import { RedisModule } from './redis/redis.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

const DEFAULT_DB_PORT = 5432;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.get<number>('DB_PORT')) || DEFAULT_DB_PORT,
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: [
          User,
          Follow,
          Attachment,
          Article,
          Tag,
          ArticleFavorite,
          Comment,
        ],
        synchronize: false,
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-custom-lang']),
      ],
    }),
    RedisModule,
    UsersModule,
    AuthModule,
    AttachmentsModule,
    ProfilesModule,
    ArticlesModule,
    CommentsModule,
    HelloModule,
  ],
})
export class AppModule {}
