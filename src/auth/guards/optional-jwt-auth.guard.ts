import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { BEARER_PREFIX } from '../auth.constants';
import { JwtPayload } from './jwt-auth.guard';

export interface OptionalAuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<OptionalAuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      return true;
    }

    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);

    if (!payload || !payload.jti) {
      return true;
    }

    const isBlacklisted = await this.redisService
      .checkTokenBlacklisted(payload.jti)
      .catch(() => true);

    if (!isBlacklisted) {
      request.user = payload;
    }

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

