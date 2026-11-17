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

  const mockTargetUser = {
    id: 2,
    username: 'targetuser',
    bio: 'Target bio',
  };

  beforeEach(async () => {
    followsRepository = {
      exists: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve(dto)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    usersService = {
      findByUsername: jest.fn(),
    };
    attachmentsService = {
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/avatar.png'),
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
    followsRepository.exists.mockResolvedValue(false);

    const result = await service.followUser('targetuser', 1);

    expect(result.profile.following).toBe(true);
    expect(followsRepository.save).toHaveBeenCalled();
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
});

