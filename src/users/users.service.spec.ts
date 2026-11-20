import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from '../attachments/attachments.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Record<string, jest.Mock>;
  let attachmentsService: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;

  const mockUser = {
    id: 1,
    email: 'user@example.com',
    username: 'myuser',
    bio: 'Old bio',
    password: 'hashedpassword',
  };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      exists: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve({ id: 1, ...dto })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    attachmentsService = {
      validateAvatar: jest.fn(),
      saveAvatar: jest.fn().mockResolvedValue({ url: '/public/avatars/new.png' }),
      getAvatarUrl: jest.fn().mockResolvedValue('/public/avatars/avatar.png'),
    };
    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
  });

  it('updateUserProfile - should update bio and username', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);
    usersRepository.exists.mockResolvedValue(false);

    const result = await service.updateUserProfile(1, {
      username: 'newusername',
      bio: 'New bio',
    });

    expect(result.user.username).toBe(mockUser.username);
    expect(usersRepository.update).toHaveBeenCalled();
  });

  it('updateUserProfile - should throw ConflictException if new email is taken', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);
    usersRepository.exists.mockResolvedValue(true);

    await expect(
      service.updateUserProfile(1, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('updateUserProfile - should throw ConflictException if new username is taken', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);
    usersRepository.exists.mockResolvedValue(true);

    await expect(
      service.updateUserProfile(1, { username: 'takenusername' }),
    ).rejects.toThrow(ConflictException);
  });

  it('updateUserProfile - should validate avatar before updating user in database', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);
    attachmentsService.validateAvatar.mockImplementation(() => {
      throw new BadRequestException('Invalid avatar');
    });

    const mockFile = {
      mimetype: 'application/pdf',
      size: 1024,
      originalname: 'test.pdf',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(
      service.updateUserProfile(1, { bio: 'New bio' }, mockFile),
    ).rejects.toThrow(BadRequestException);

    expect(attachmentsService.validateAvatar).toHaveBeenCalledWith(mockFile);
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('updateUserProfile - should save avatar if file is provided', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);

    const mockFile = {
      mimetype: 'image/png',
      size: 1024,
      originalname: 'new.png',
      buffer: Buffer.from('img'),
    } as Express.Multer.File;

    await service.updateUserProfile(1, {}, mockFile);

    expect(attachmentsService.validateAvatar).toHaveBeenCalledWith(mockFile);
    expect(attachmentsService.saveAvatar).toHaveBeenCalledWith(1, mockFile);
  });

  it('getUserProfile - should return user with image', async () => {
    usersRepository.findOne.mockResolvedValue(mockUser);

    const result = await service.getUserProfile(1);

    expect(result.user.id).toBe(1);
    expect(result.user.image).toBe('/public/avatars/avatar.png');
  });

  it('getUserProfile - should throw UnauthorizedException if user does not exist', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserProfile(99)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
