import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TooManyRequestsException } from '../domain/domain.exception';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimiterConfig } from '../../modules/user-accounts/config/rate-limiter.config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
    private readonly rateLimiterConfig: RateLimiterConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || 'unknown';

    const key = rateLimitOptions.extractKeyFromContext
      ? rateLimitOptions.extractKeyFromContext({ request, ip })
      : `${rateLimitOptions.keyPrefix || 'default'}:${ip}`;

    const max = rateLimitOptions.max ?? this.rateLimiterConfig.max;
    const windowMs =
      rateLimitOptions.windowMs ?? this.rateLimiterConfig.windowMs;

    const isLimited = this.rateLimiter.isLimited(key, max, windowMs);

    if (isLimited) {
      throw new TooManyRequestsException();
    }

    return true;
  }
}
