import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let redisService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('register - should create a new user', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
    });

    const result = await service.register({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password@123456',
    });

    expect(result.email).toBe('test@example.com');
    expect(usersService.createUser).toHaveBeenCalled();
  });

  it('register - should throw ConflictException if email exists', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
    });

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

  it('logout - should save token to redis blacklist', async () => {
    const result = await service.logout('mock-jwt-token');

    expect(redisService.setBlacklistToken).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Logged out successfully' });
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
});

