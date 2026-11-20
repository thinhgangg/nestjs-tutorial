import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from '../attachments/attachments.service';
import { Follow } from '../profiles/entities/follow.entity';
import { User } from '../users/entities/user.entity';
import { ArticlesService } from './articles.service';
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
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
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
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve({ id: 2, ...dto })),
    };

    favoritesRepository = {
      exists: jest.fn().mockResolvedValue(false),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
    };

    followsRepository = {
      exists: jest.fn().mockResolvedValue(false),
    };

    usersRepository = {
      findOne: jest.fn().mockResolvedValue(mockAuthor),
    };

    attachmentsService = {
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/avatar.png'),
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
    it('should create an article with tags and return formatted article', async () => {
      tagsRepository.find.mockResolvedValue([]);

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
      expect(queryBuilderMock.execute).toHaveBeenCalled();
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
    it('should return articles list and articlesCount with pagination', async () => {
      const result = await service.listArticles({ limit: 10, offset: 0 }, 1);

      expect(result.articlesCount).toBe(1);
      expect(result.articles[0].slug).toBe(mockArticle.slug);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(0);
    });
  });

  describe('getFeed', () => {
    it('should return articles from followed users', async () => {
      const result = await service.getFeed({ limit: 5, offset: 0 }, 1);

      expect(result.articlesCount).toBe(1);
      expect(queryBuilderMock.innerJoin).toHaveBeenCalled();
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

