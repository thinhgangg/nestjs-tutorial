import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from '../attachments/attachments.service';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let followsRepository: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let attachmentsService: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;
  let queryBuilderMock: Record<string, jest.Mock>;

  const mockTargetUser = {
    id: 2,
    username: 'targetuser',
    bio: 'Target bio',
  };

  beforeEach(async () => {
    queryBuilderMock = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    followsRepository = {
      exists: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    usersService = {
      findByUsername: jest.fn(),
    };
    attachmentsService = {
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/avatar.png'),
      getAvatarUrls: jest.fn().mockResolvedValue(new Map()),
    };
    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(Follow),
          useValue: followsRepository,
        },
        {
          provide: UsersService,
          useValue: usersService,
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

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('getProfile - should return profile with following false when anonymous', async () => {
    usersService.findByUsername.mockResolvedValue(mockTargetUser);

    const result = await service.getProfile('targetuser');

    expect(result.profile.username).toBe('targetuser');
    expect(result.profile.following).toBe(false);
    expect(result.profile.image).toBe('/public/avatars/avatar.png');
  });

  it('getProfile - should return profile with following true when user is following', async () => {
    usersService.findByUsername.mockResolvedValue(mockTargetUser);
    followsRepository.exists.mockResolvedValue(true);

    const result = await service.getProfile('targetuser', 1);

    expect(result.profile.username).toBe('targetuser');
    expect(result.profile.following).toBe(true);
  });

  it('getProfile - should throw NotFoundException if user not found', async () => {
    usersService.findByUsername.mockResolvedValue(null);

    await expect(service.getProfile('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('followUser - should follow target user and return following true', async () => {
    usersService.findByUsername.mockResolvedValue(mockTargetUser);

    const result = await service.followUser('targetuser', 1);

    expect(result.profile.following).toBe(true);
    expect(followsRepository.createQueryBuilder).toHaveBeenCalled();
    expect(queryBuilderMock.execute).toHaveBeenCalled();
  });

  it('followUser - should throw BadRequestException if following self', async () => {
    usersService.findByUsername.mockResolvedValue({ id: 1, username: 'myself' });

    await expect(service.followUser('myself', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('unfollowUser - should delete follow and return following false', async () => {
    usersService.findByUsername.mockResolvedValue(mockTargetUser);

    const result = await service.unfollowUser('targetuser', 1);

    expect(result.profile.following).toBe(false);
    expect(followsRepository.delete).toHaveBeenCalledWith({
      followerId: 1,
      followingId: 2,
    });
  });

  it('unfollowUser - should throw BadRequestException if unfollowing self', async () => {
    usersService.findByUsername.mockResolvedValue({ id: 1, username: 'myself' });

    await expect(service.unfollowUser('myself', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('buildAuthorProfile', () => {
    it('should build single author profile with following status and avatar', async () => {
      followsRepository.exists.mockResolvedValue(true);

      const profile = await service.buildAuthorProfile(mockTargetUser, 1);

      expect(profile).toEqual({
        username: 'targetuser',
        bio: 'Target bio',
        image: '/public/avatars/avatar.png',
        following: true,
      });
    });

    it('should skip follows lookup when currentUserId matches author id', async () => {
      const profile = await service.buildAuthorProfile(mockTargetUser, 2);

      expect(profile.following).toBe(false);
      expect(followsRepository.exists).not.toHaveBeenCalled();
    });
  });

  describe('buildAuthorProfiles', () => {
    it('should return empty map without querying when authors list is empty', async () => {
      const result = await service.buildAuthorProfiles([], 1);

      expect(result.size).toBe(0);
      expect(followsRepository.find).not.toHaveBeenCalled();
      expect(attachmentsService.getAvatarUrls).not.toHaveBeenCalled();
    });

    it('should batch load following status and avatars for unique authors', async () => {
      const firstAuthor = { id: 1, username: 'john', bio: 'John bio' };
      const secondAuthor = { id: 2, username: 'jane', bio: null };
      followsRepository.find.mockResolvedValue([{ followingId: 2 }]);
      attachmentsService.getAvatarUrls.mockResolvedValue(
        new Map([[1, '/public/avatars/john.png']]),
      );

      const result = await service.buildAuthorProfiles(
        [firstAuthor, secondAuthor, firstAuthor],
        99,
      );

      expect(result.get(1)).toEqual({
        username: 'john',
        bio: 'John bio',
        image: '/public/avatars/john.png',
        following: false,
      });
      expect(result.get(2)).toEqual({
        username: 'jane',
        bio: null,
        image: null,
        following: true,
      });
      expect(attachmentsService.getAvatarUrls).toHaveBeenCalledWith([1, 2]);
      expect(followsRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should skip follows lookup when currentUserId is undefined', async () => {
      attachmentsService.getAvatarUrls.mockResolvedValue(new Map());

      const result = await service.buildAuthorProfiles([mockTargetUser]);

      expect(result.get(2)?.following).toBe(false);
      expect(followsRepository.find).not.toHaveBeenCalled();
    });
  });
});
