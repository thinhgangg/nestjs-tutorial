import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { RedisService } from '../../redis/redis.service';
import { BEARER_PREFIX } from '../auth.constants';

export interface JwtPayload {
  sub: number;
  email: string;
  jti: string;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const lang = I18nContext.current()?.lang;
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        this.i18n.t('common.auth.missing_token', { lang }),
      );
    }

    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);

    if (!payload || !payload.jti) {
      throw new UnauthorizedException(
        this.i18n.t('common.auth.invalid_token', { lang }),
      );
    }

    const isBlacklisted = await this.redisService.checkTokenBlacklisted(
      payload.jti,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException(
        this.i18n.t('common.auth.token_revoked', { lang }),
      );
    }

    request.user = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      return null;
    }
    return authHeader.slice(BEARER_PREFIX.length).trim();
  }
}
