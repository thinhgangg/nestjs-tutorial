import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let redisService: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      existsByEmail: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      createUser: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };
    redisService = {
      setBlacklistToken: jest.fn(),
    };
    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: I18nService, useValue: i18nService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('register - should create a new user with lowercase email', async () => {
    usersService.existsByEmail.mockResolvedValue(false);
    usersService.createUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
    });

    const result = await service.register({
      email: 'Test@Example.com',
      username: 'testuser',
      password: 'Password@123456',
    });

    expect(result.email).toBe('test@example.com');
    expect(usersService.existsByEmail).toHaveBeenCalledWith('test@example.com');
    expect(usersService.createUser).toHaveBeenCalled();
  });

  it('register - should throw ConflictException if email exists', async () => {
    usersService.existsByEmail.mockResolvedValue(true);

    await expect(
      service.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password@123456',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('login - should return accessToken when credentials are valid', async () => {
    const hashedPassword = await bcrypt.hash('Password@123456', 10);
    usersService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: hashedPassword,
    });

    const result = await service.login({
      email: 'test@example.com',
      password: 'Password@123456',
    });

    expect(result).toEqual({ accessToken: 'mock-jwt-token' });
  });

  it('login - should throw UnauthorizedException when user not found', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'wrong@example.com',
        password: 'Password@123456',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logout - should save jti to redis blacklist', async () => {
    const result = await service.logout('mock-jti');

    expect(redisService.setBlacklistToken).toHaveBeenCalledWith(
      'mock-jti',
      3600,
    );
    expect(result).toEqual({ message: 'common.auth.logged_out' });
  });

  it('getCurrentUser - should return user info', async () => {
    usersService.findById.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
    });

    const result = await service.getCurrentUser(1);
    expect(result.id).toBe(1);
  });

  it('getCurrentUser - should throw UnauthorizedException if user was deleted', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(service.getCurrentUser(999)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
