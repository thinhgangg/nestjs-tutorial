import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { Follow } from '../profiles/entities/follow.entity';
import {
  AuthorProfile,
  ProfilesService,
} from '../profiles/profiles.service';
import { User } from '../users/entities/user.entity';
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGE_OFFSET,
  MAX_PAGE_LIMIT,
} from './articles.constants';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleFavorite } from './entities/article-favorite.entity';
import { Article } from './entities/article.entity';
import { Tag } from './entities/tag.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(ArticleFavorite)
    private readonly favoritesRepository: Repository<ArticleFavorite>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly profilesService: ProfilesService,
    private readonly i18n: I18nService,
  ) {}

  async createArticle(dto: CreateArticleDto, currentUserId: number) {
    const author = await this.usersRepository.findOne({
      where: { id: currentUserId },
    });
    const slug = this.generateSlug(dto.article.title);
    const tags = await this.getOrCreateTags(dto.article.tagList || []);

    const newArticle = this.articlesRepository.create({
      slug,
      title: dto.article.title,
      description: dto.article.description,
      body: dto.article.body,
      authorId: currentUserId,
      author: author!,
      tags,
    });

    const savedArticle = await this.articlesRepository.save(newArticle);
    return this.buildArticleResponse(savedArticle, currentUserId);
  }

  async getArticleBySlug(slug: string, currentUserId?: number) {
    const article = await this.findArticleWithRelations(slug);
    return this.buildArticleResponse(article, currentUserId);
  }

  async updateArticle(
    slug: string,
    dto: UpdateArticleDto,
    currentUserId: number,
  ) {
    const lang = I18nContext.current()?.lang;
    const article = await this.findArticleWithRelations(slug);

    if (article.authorId !== currentUserId) {
      throw new ForbiddenException(
        this.i18n.t('common.article.forbidden', { lang }),
      );
    }

    if (dto.article.title && dto.article.title !== article.title) {
      article.title = dto.article.title;
      article.slug = this.generateSlug(dto.article.title);
    }

    if (dto.article.description !== undefined) {
      article.description = dto.article.description;
    }

    if (dto.article.body !== undefined) {
      article.body = dto.article.body;
    }

    const updatedArticle = await this.articlesRepository.save(article);
    return this.buildArticleResponse(updatedArticle, currentUserId);
  }

  async deleteArticle(slug: string, currentUserId: number) {
    const lang = I18nContext.current()?.lang;
    const article = await this.findArticleWithRelations(slug);

    if (article.authorId !== currentUserId) {
      throw new ForbiddenException(
        this.i18n.t('common.article.forbidden', { lang }),
      );
    }

    await this.articlesRepository.remove(article);
    return {
      message: this.i18n.t('common.article.deleted', { lang }),
    };
  }

  async favoriteArticle(slug: string, currentUserId: number) {
    const article = await this.findArticleWithRelations(slug);

    await this.favoritesRepository
      .createQueryBuilder()
      .insert()
      .into(ArticleFavorite)
      .values({
        articleId: article.id,
        userId: currentUserId,
      })
      .orIgnore()
      .execute();

    return this.buildArticleResponse(article, currentUserId);
  }

  async unfavoriteArticle(slug: string, currentUserId: number) {
    const article = await this.findArticleWithRelations(slug);

    await this.favoritesRepository.delete({
      articleId: article.id,
      userId: currentUserId,
    });

    return this.buildArticleResponse(article, currentUserId);
  }

  async listArticles(query: QueryArticlesDto, currentUserId?: number) {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const offset = query.offset ?? DEFAULT_PAGE_OFFSET;

    const qb = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag')
      .orderBy('article.createdAt', 'DESC')
      .addOrderBy('article.id', 'DESC')
      .skip(offset)
      .take(limit);

    if (query.tag) {
      qb.innerJoin(
        'article.tags',
        'filterTag',
        'filterTag.name = :filterTagName',
        { filterTagName: query.tag },
      );
    }

    if (query.author) {
      qb.andWhere('author.username = :authorUsername', {
        authorUsername: query.author,
      });
    }

    if (query.favorited) {
      qb.innerJoin(
        'article_favorites',
        'fav',
        'fav.article_id = article.id',
      ).innerJoin(
        'users',
        'favUser',
        'favUser.id = fav.user_id AND favUser.username = :favUsername',
        { favUsername: query.favorited },
      );
    }

    const [articles, articlesCount] = await qb.getManyAndCount();
    return this.buildArticlesResponse(articles, articlesCount, currentUserId);
  }

  async getFeed(query: QueryFeedDto, currentUserId: number) {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const offset = query.offset ?? DEFAULT_PAGE_OFFSET;

    const qb = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag')
      .innerJoin(
        Follow,
        'follow',
        'follow.following_id = article.author_id AND follow.follower_id = :currentUserId',
        { currentUserId },
      )
      .orderBy('article.createdAt', 'DESC')
      .addOrderBy('article.id', 'DESC')
      .skip(offset)
      .take(limit);

    const [articles, articlesCount] = await qb.getManyAndCount();
    return this.buildArticlesResponse(articles, articlesCount, currentUserId);
  }

  async getTags() {
    const tags = await this.tagsRepository.find({
      order: { name: 'ASC' },
    });
    return {
      tags: tags.map((tag) => tag.name),
    };
  }

  private async findArticleWithRelations(slug: string): Promise<Article> {
    const lang = I18nContext.current()?.lang;
    const article = await this.articlesRepository.findOne({
      where: { slug },
      relations: { author: true, tags: true },
    });

    if (!article) {
      throw new NotFoundException(
        this.i18n.t('common.article.not_found', { lang }),
      );
    }

    return article;
  }

  private async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const normalizedTagNames = [
      ...new Set(
        tagNames
          .map((name) => name.trim().toLowerCase())
          .filter((name) => name.length > 0),
      ),
    ];

    if (normalizedTagNames.length === 0) {
      return [];
    }

    const existingTags = await this.tagsRepository.find({
      where: { name: In(normalizedTagNames) },
    });

    const existingNames = new Set(existingTags.map((tag) => tag.name));
    const missingNames = normalizedTagNames.filter(
      (name) => !existingNames.has(name),
    );

    if (missingNames.length > 0) {
      await this.tagsRepository
        .createQueryBuilder()
        .insert()
        .into(Tag)
        .values(missingNames.map((name) => ({ name })))
        .orIgnore()
        .execute();

      return this.tagsRepository.find({
        where: { name: In(normalizedTagNames) },
      });
    }

    return existingTags;
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const uniqueSuffix = randomUUID().slice(0, 8);
    return baseSlug ? `${baseSlug}-${uniqueSuffix}` : uniqueSuffix;
  }

  private async buildArticleResponse(
    article: Article,
    currentUserId?: number,
  ) {
    const [isFavorited, favoritesCount, authorProfile] = await Promise.all([
      currentUserId
        ? this.favoritesRepository.exists({
            where: { articleId: article.id, userId: currentUserId },
          })
        : Promise.resolve(false),
      this.favoritesRepository.count({
        where: { articleId: article.id },
      }),
      this.profilesService.buildAuthorProfile(article.author, currentUserId),
    ]);

    return {
      article: this.formatArticlePayload(article, {
        favorited: isFavorited,
        favoritesCount,
        author: authorProfile,
      }),
    };
  }

  private async buildArticlesResponse(
    articles: Article[],
    articlesCount: number,
    currentUserId?: number,
  ) {
    if (articles.length === 0) {
      return {
        articles: [],
        articlesCount,
      };
    }

    const articleIds = [...new Set(articles.map((article) => article.id))];

    const [favoriteCountRows, userFavorites, authorProfiles] =
      await Promise.all([
        this.favoritesRepository
          .createQueryBuilder('favorite')
          .select('favorite.articleId', 'articleId')
          .addSelect('COUNT(*)', 'count')
          .where('favorite.articleId IN (:...articleIds)', { articleIds })
          .groupBy('favorite.articleId')
          .getRawMany<{
            articleId: number | string;
            count: string | number;
          }>(),
        currentUserId
          ? this.favoritesRepository.find({
              select: { articleId: true },
              where: {
                userId: currentUserId,
                articleId: In(articleIds),
              },
            })
          : Promise.resolve([]),
        this.profilesService.buildAuthorProfiles(
          articles.map((article) => article.author),
          currentUserId,
        ),
      ]);

    const favoritesCountMap = new Map<number, number>(
      favoriteCountRows.map((row) => [
        Number(row.articleId),
        Number(row.count),
      ]),
    );
    const favoritedArticleIds = new Set(
      userFavorites.map((favorite) => favorite.articleId),
    );

    const articleList = articles.map((article) =>
      this.formatArticlePayload(article, {
        favorited: favoritedArticleIds.has(article.id),
        favoritesCount: favoritesCountMap.get(article.id) ?? 0,
        author: authorProfiles.get(article.author.id)!,
      }),
    );

    return {
      articles: articleList,
      articlesCount,
    };
  }

  private formatArticlePayload(
    article: Article,
    meta: {
      favorited: boolean;
      favoritesCount: number;
      author: AuthorProfile;
    },
  ) {
    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tagList: article.tags ? article.tags.map((tag) => tag.name) : [],
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: meta.favorited,
      favoritesCount: meta.favoritesCount,
      author: meta.author,
    };
  }
}
