import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

const BEARER_PREFIX = 'Bearer ';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    email: string;
    exp?: number;
  };
  token: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const isBlacklisted = await this.redisService.checkTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const payload = await this.jwtService.verifyAsync(token).catch(() => null);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    request.user = payload;
    request.token = token;
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
