import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { User } from '../users/entities/user.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticleFavorite } from './entities/article-favorite.entity';
import { Article } from './entities/article.entity';
import { Tag } from './entities/tag.entity';
import { TagsController } from './tags.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Tag, ArticleFavorite, User]),
    ProfilesModule,
    AuthModule,
  ],
  controllers: [ArticlesController, TagsController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}

