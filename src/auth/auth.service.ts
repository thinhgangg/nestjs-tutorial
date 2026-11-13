import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import {
  DEFAULT_TTL_SECONDS,
  DUMMY_BCRYPT_HASH,
  MS_PER_SECOND,
  PG_UNIQUE_VIOLATION,
  SALT_ROUNDS,
} from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
  ) {}

  async register(dto: RegisterDto) {
    const lang = I18nContext.current()?.lang;
    const normalizedEmail = dto.email.trim().toLowerCase();

    const isEmailExists = await this.usersService.existsByEmail(normalizedEmail);
    if (isEmailExists) {
      throw new ConflictException(
        this.i18n.t('common.auth.email_exists', { lang }),
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService
      .createUser({
        email: normalizedEmail,
        username: dto.username,
        password: hashedPassword,
      })
      .catch((error: { code?: string }) => {
        if (error?.code === PG_UNIQUE_VIOLATION) {
          throw new ConflictException(
            this.i18n.t('common.auth.email_exists', { lang }),
          );
        }
        throw new InternalServerErrorException('Failed to create user');
      });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const lang = I18nContext.current()?.lang;
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    const passwordHash = user ? user.password : DUMMY_BCRYPT_HASH;
    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t('common.auth.invalid_credentials', { lang }),
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: DEFAULT_TTL_SECONDS,
    });

    return { accessToken };
  }

  async logout(jti: string, exp?: number) {
    const lang = I18nContext.current()?.lang;
    const nowInSeconds = Math.floor(Date.now() / MS_PER_SECOND);
    const ttl = exp ? Math.max(exp - nowInSeconds, 1) : DEFAULT_TTL_SECONDS;

    await this.redisService.setBlacklistToken(jti, ttl);
    return { message: this.i18n.t('common.auth.logged_out', { lang }) };
  }

  async getCurrentUser(userId: number) {
    const lang = I18nContext.current()?.lang;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('common.auth.unauthorized', { lang }),
      );
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }
}
