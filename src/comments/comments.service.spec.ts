import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import { Article } from '../articles/entities/article.entity';
import { AttachmentsService } from '../attachments/attachments.service';
import { Follow } from '../profiles/entities/follow.entity';
import { User } from '../users/entities/user.entity';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: Record<string, jest.Mock>;
  let articlesRepository: Record<string, jest.Mock>;
  let followsRepository: Record<string, jest.Mock>;
  let usersRepository: Record<string, jest.Mock>;
  let attachmentsService: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;

  const mockUser: User = {
    id: 1,
    username: 'john',
    email: 'john@example.com',
    password: 'hash',
    bio: 'Author bio',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSecondUser: User = {
    ...mockUser,
    id: 2,
    username: 'jane',
    email: 'jane@example.com',
  };

  const mockArticle: Article = {
    id: 10,
    slug: 'my-first-post-12345678',
    title: 'My First Post',
    description: 'First post desc',
    body: 'First post body',
    authorId: 1,
    author: mockUser,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment: Comment = {
    id: 100,
    body: 'Nice article!',
    articleId: 10,
    article: mockArticle,
    authorId: 1,
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    commentsRepository = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) =>
        Promise.resolve({
          id: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...entity,
        }),
      ),
      find: jest.fn().mockResolvedValue([mockComment]),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(mockComment),
    };

    articlesRepository = {
      findOne: jest.fn().mockResolvedValue(mockArticle),
    };

    followsRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    usersRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    attachmentsService = {
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/john.png'),
      getAvatarUrls: jest
        .fn()
        .mockResolvedValue(new Map([[1, '/public/avatars/john.png']])),
    };

    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: commentsRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articlesRepository,
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

    service = module.get<CommentsService>(CommentsService);
  });

  describe('addComment', () => {
    it('should create and return formatted comment', async () => {
      const result = await service.addComment(
        mockArticle.slug,
        { comment: { body: 'Great post!' } },
        1,
      );

      expect(commentsRepository.save).toHaveBeenCalled();
      expect(result.comment).toMatchObject({
        id: 100,
        body: 'Great post!',
        author: {
          username: 'john',
          bio: 'Author bio',
          image: '/public/avatars/john.png',
          following: false,
        },
      });
    });

    it('should throw NotFoundException if article does not exist', async () => {
      articlesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addComment('missing-slug', { comment: { body: 'Hi' } }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if author does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addComment(mockArticle.slug, { comment: { body: 'Hi' } }, 99),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getComments', () => {
    it('should return comments with batch-loaded following status and avatars', async () => {
      const secondComment: Comment = {
        ...mockComment,
        id: 101,
        body: 'Second comment',
        authorId: 2,
        author: mockSecondUser,
      };
      commentsRepository.find.mockResolvedValue([mockComment, secondComment]);
      followsRepository.find.mockResolvedValue([{ followingId: 2 }]);
      attachmentsService.getAvatarUrls.mockResolvedValue(
        new Map([[1, '/public/avatars/john.png']]),
      );

      const result = await service.getComments(mockArticle.slug, 99);

      expect(result.comments).toHaveLength(2);
      expect(result.comments[0]).toMatchObject({
        id: 100,
        body: 'Nice article!',
        author: {
          username: 'john',
          image: '/public/avatars/john.png',
          following: false,
        },
      });
      expect(result.comments[1]).toMatchObject({
        id: 101,
        body: 'Second comment',
        author: {
          username: 'jane',
          image: null,
          following: true,
        },
      });
      expect(attachmentsService.getAvatarUrls).toHaveBeenCalledWith([1, 2]);
      expect(followsRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should skip follows lookup when user is unauthenticated', async () => {
      const result = await service.getComments(mockArticle.slug);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].author.following).toBe(false);
      expect(followsRepository.find).not.toHaveBeenCalled();
    });

    it('should return empty array without batch queries when article has no comments', async () => {
      commentsRepository.find.mockResolvedValue([]);

      const result = await service.getComments(mockArticle.slug, 1);

      expect(result).toEqual({ comments: [] });
      expect(followsRepository.find).not.toHaveBeenCalled();
      expect(attachmentsService.getAvatarUrls).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if article does not exist', async () => {
      articlesRepository.findOne.mockResolvedValue(null);

      await expect(service.getComments('missing-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete comment when current user is the comment author', async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.deleteComment(mockArticle.slug, 100, 1);

      expect(commentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 100, articleId: mockArticle.id },
      });
      expect(commentsRepository.remove).toHaveBeenCalledWith(mockComment);
      expect(result.message).toBe('common.comment.deleted');
    });

    it('should throw NotFoundException if article does not exist', async () => {
      articlesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteComment('missing-slug', 100, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if comment does not exist on the article', async () => {
      commentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteComment(mockArticle.slug, 999, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if current user is not the comment author', async () => {
      commentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(
        service.deleteComment(mockArticle.slug, 100, 2),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('CreateCommentDto validation', () => {
    it('should reject empty body and missing comment wrapper, and accept trimmed body', async () => {
      const missingWrapper = plainToInstance(CreateCommentDto, {});
      const emptyBody = plainToInstance(CreateCommentDto, {
        comment: { body: '   ' },
      });
      const validDto = plainToInstance(CreateCommentDto, {
        comment: { body: '  Hello world  ' },
      });

      expect((await validate(missingWrapper)).length).toBeGreaterThan(0);
      expect((await validate(emptyBody)).length).toBeGreaterThan(0);
      expect(await validate(validDto)).toHaveLength(0);
      expect(validDto.comment.body).toBe('Hello world');
    });
  });
});

