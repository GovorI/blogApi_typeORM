import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  keyPrefix?: string;
  max?: number;
  windowMs?: number;
  extractKeyFromContext?: (context: { request: any; ip: string }) => string;
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions = {}) => {
  return SetMetadata(RATE_LIMIT_KEY, options);
};
