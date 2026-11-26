import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from '../attachments/attachments.service';
import { Follow } from '../profiles/entities/follow.entity';
import { User } from '../users/entities/user.entity';
import { MAX_PAGE_LIMIT } from './articles.constants';
import { ArticlesService } from './articles.service';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { ArticleFavorite } from './entities/article-favorite.entity';
import { Article } from './entities/article.entity';
import { Tag } from './entities/tag.entity';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let articlesRepository: Record<string, jest.Mock>;
  let tagsRepository: Record<string, jest.Mock>;
  let favoritesRepository: Record<string, jest.Mock>;
  let followsRepository: Record<string, jest.Mock>;
  let usersRepository: Record<string, jest.Mock>;
  let attachmentsService: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;
  let queryBuilderMock: Record<string, jest.Mock>;
  let tagQueryBuilderMock: Record<string, jest.Mock>;
  let favoriteQueryBuilderMock: Record<string, jest.Mock>;

  const mockAuthor: User = {
    id: 1,
    username: 'john',
    email: 'john@example.com',
    password: 'hash',
    bio: 'Author bio',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockArticle: Article = {
    id: 10,
    slug: 'my-first-post-12345678',
    title: 'My First Post',
    description: 'First post desc',
    body: 'First post body',
    authorId: 1,
    author: mockAuthor,
    tags: [{ id: 1, name: 'dragons', createdAt: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilderMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
    };

    tagQueryBuilderMock = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    favoriteQueryBuilderMock = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    articlesRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 10, ...entity })),
      remove: jest.fn().mockResolvedValue(mockArticle),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
    };

    tagsRepository = {
      find: jest.fn().mockResolvedValue([{ id: 1, name: 'dragons' }]),
      createQueryBuilder: jest.fn(() => tagQueryBuilderMock),
    };

    favoritesRepository = {
      exists: jest.fn().mockResolvedValue(false),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => favoriteQueryBuilderMock),
    };

    followsRepository = {
      exists: jest.fn().mockResolvedValue(false),
      find: jest.fn().mockResolvedValue([]),
    };

    usersRepository = {
      findOne: jest.fn().mockResolvedValue(mockAuthor),
    };

    attachmentsService = {
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/avatar.png'),
      getAvatarUrls: jest
        .fn()
        .mockResolvedValue(new Map([[1, '/public/avatars/avatar.png']])),
    };

    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: articlesRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: tagsRepository,
        },
        {
          provide: getRepositoryToken(ArticleFavorite),
          useValue: favoritesRepository,
        },
        {
          provide: getRepositoryToken(Follow),
          useValue: followsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: AttachmentsService,
          useValue: attachmentsService,
        },
        {
          provide: I18nService,
          useValue: i18nService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  describe('createArticle', () => {
    it('should create an article with tags using batch orIgnore insert and return formatted article', async () => {
      tagsRepository.find
        .mockResolvedValueOnce([{ id: 1, name: 'dragons' }])
        .mockResolvedValueOnce([
          { id: 1, name: 'dragons' },
          { id: 2, name: 'training' },
        ]);

      const result = await service.createArticle(
        {
          article: {
            title: 'How to train your dragon',
            description: 'Ever wonder how?',
            body: 'It takes a Jacobian',
            tagList: ['dragons', 'training'],
          },
        },
        1,
      );

      expect(result.article.title).toBe('How to train your dragon');
      expect(result.article.author.username).toBe('john');
      expect(result.article.author.image).toBe('/public/avatars/avatar.png');
      expect(tagQueryBuilderMock.values).toHaveBeenCalledWith([
        { name: 'training' },
      ]);
      expect(tagQueryBuilderMock.orIgnore).toHaveBeenCalled();
      expect(tagsRepository.find).toHaveBeenCalledTimes(2);
      expect(articlesRepository.save).toHaveBeenCalled();
    });
  });

  describe('getArticleBySlug', () => {
    it('should return article by slug', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);
      favoritesRepository.exists.mockResolvedValue(true);
      favoritesRepository.count.mockResolvedValue(5);
      followsRepository.exists.mockResolvedValue(true);

      const result = await service.getArticleBySlug(
        'my-first-post-12345678',
        2,
      );

      expect(result.article.title).toBe('My First Post');
      expect(result.article.favorited).toBe(true);
      expect(result.article.favoritesCount).toBe(5);
      expect(result.article.author.following).toBe(true);
    });

    it('should throw NotFoundException if article does not exist', async () => {
      articlesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getArticleBySlug('nonexistent-slug'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateArticle', () => {
    it('should update article and regenerate slug when title changed', async () => {
      articlesRepository.findOne.mockResolvedValue({
        ...mockArticle,
      });

      const result = await service.updateArticle(
        'my-first-post-12345678',
        {
          article: {
            title: 'Updated Post Title',
            description: 'Updated desc',
          },
        },
        1,
      );

      expect(result.article.title).toBe('Updated Post Title');
      expect(result.article.slug).toContain('updated-post-title');
      expect(articlesRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if current user is not author', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);

      await expect(
        service.updateArticle(
          'my-first-post-12345678',
          { article: { title: 'Hacked' } },
          99,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if article not found', async () => {
      articlesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateArticle(
          'nonexistent',
          { article: { title: 'Test' } },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteArticle', () => {
    it('should remove article if current user is author', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.deleteArticle('my-first-post-12345678', 1);

      expect(articlesRepository.remove).toHaveBeenCalledWith(mockArticle);
      expect(result.message).toBe('common.article.deleted');
    });

    it('should throw ForbiddenException if current user is not author', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);

      await expect(
        service.deleteArticle('my-first-post-12345678', 99),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('favoriteArticle', () => {
    it('should insert into favorites repository and return article', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.favoriteArticle(
        'my-first-post-12345678',
        1,
      );

      expect(favoritesRepository.createQueryBuilder).toHaveBeenCalled();
      expect(favoriteQueryBuilderMock.execute).toHaveBeenCalled();
      expect(result.article.slug).toBe(mockArticle.slug);
    });
  });

  describe('unfavoriteArticle', () => {
    it('should delete from favorites repository and return article', async () => {
      articlesRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.unfavoriteArticle(
        'my-first-post-12345678',
        1,
      );

      expect(favoritesRepository.delete).toHaveBeenCalledWith({
        articleId: mockArticle.id,
        userId: 1,
      });
      expect(result.article.slug).toBe(mockArticle.slug);
    });
  });

  describe('listArticles', () => {
    it('should return articles list and articlesCount with pagination and tie-breaker ordering', async () => {
      const result = await service.listArticles({ limit: 10, offset: 0 }, 1);

      expect(result.articlesCount).toBe(1);
      expect(result.articles[0].slug).toBe(mockArticle.slug);
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
        'article.createdAt',
        'DESC',
      );
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith(
        'article.id',
        'DESC',
      );
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(0);
    });

    it('should batch load favorited, favoritesCount, following and avatar for multiple articles', async () => {
      const secondAuthor: User = {
        ...mockAuthor,
        id: 2,
        username: 'jane',
      };
      const secondArticle: Article = {
        ...mockArticle,
        id: 11,
        slug: 'second-post-87654321',
        authorId: 2,
        author: secondAuthor,
      };
      queryBuilderMock.getManyAndCount.mockResolvedValue([
        [mockArticle, secondArticle],
        2,
      ]);
      favoriteQueryBuilderMock.getRawMany.mockResolvedValue([
        { articleId: '10', count: '3' },
      ]);
      favoritesRepository.find.mockResolvedValue([{ articleId: 11 }]);
      followsRepository.find.mockResolvedValue([{ followingId: 2 }]);
      attachmentsService.getAvatarUrls.mockResolvedValue(
        new Map([[1, '/public/avatars/john.png']]),
      );

      const result = await service.listArticles({}, 99);

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0]).toMatchObject({
        slug: mockArticle.slug,
        favorited: false,
        favoritesCount: 3,
        author: {
          username: 'john',
          image: '/public/avatars/john.png',
          following: false,
        },
      });
      expect(result.articles[1]).toMatchObject({
        slug: secondArticle.slug,
        favorited: true,
        favoritesCount: 0,
        author: {
          username: 'jane',
          image: null,
          following: true,
        },
      });
      expect(attachmentsService.getAvatarUrls).toHaveBeenCalledWith([1, 2]);
      expect(favoritesRepository.exists).not.toHaveBeenCalled();
      expect(favoritesRepository.count).not.toHaveBeenCalled();
      expect(followsRepository.exists).not.toHaveBeenCalled();
    });

    it('should return empty list without batch queries when no articles match', async () => {
      queryBuilderMock.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listArticles({}, 1);

      expect(result).toEqual({ articles: [], articlesCount: 0 });
      expect(favoritesRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(attachmentsService.getAvatarUrls).not.toHaveBeenCalled();
    });
  });

  describe('getFeed', () => {
    it('should return articles from followed users with tie-breaker ordering', async () => {
      const result = await service.getFeed({ limit: 5, offset: 0 }, 1);

      expect(result.articlesCount).toBe(1);
      expect(queryBuilderMock.innerJoin).toHaveBeenCalled();
      expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith(
        'article.id',
        'DESC',
      );
    });
  });

  describe('Query DTO validation', () => {
    it('should reject limit=0 and limit>MAX_PAGE_LIMIT for QueryArticlesDto and QueryFeedDto', async () => {
      for (const DtoClass of [QueryArticlesDto, QueryFeedDto]) {
        const zeroDto = plainToInstance(DtoClass, { limit: '0' });
        const overMaxDto = plainToInstance(DtoClass, {
          limit: String(MAX_PAGE_LIMIT + 1),
        });
        const validMinDto = plainToInstance(DtoClass, { limit: '1' });
        const validMaxDto = plainToInstance(DtoClass, {
          limit: String(MAX_PAGE_LIMIT),
        });

        expect((await validate(zeroDto)).length).toBeGreaterThan(0);
        expect((await validate(overMaxDto)).length).toBeGreaterThan(0);
        expect(await validate(validMinDto)).toHaveLength(0);
        expect(await validate(validMaxDto)).toHaveLength(0);
      }
    });
  });

  describe('getTags', () => {
    it('should return all tag names', async () => {
      tagsRepository.find.mockResolvedValue([
        { id: 1, name: 'angularjs' },
        { id: 2, name: 'reactjs' },
      ]);

      const result = await service.getTags();
      expect(result.tags).toEqual(['angularjs', 'reactjs']);
    });
  });
});

