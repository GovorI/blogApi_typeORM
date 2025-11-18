import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNumber } from 'class-validator';
import { configValidationUtility } from '../../../core/utils/config-validation.utility';

@Injectable()
export class RateLimiterConfig {
  constructor(private configService: ConfigService<any, true>) {
    const maxString = this.configService.get<string>('RATE_LIMIT_MAX') ?? '5';
    const windowMsString =
      this.configService.get<string>('RATE_LIMIT_WINDOW_MS') ?? '10000';

    this.max = Number.isFinite(parseInt(maxString, 10))
      ? parseInt(maxString, 10)
      : 5;

    this.windowMs = Number.isFinite(parseInt(windowMsString, 10))
      ? parseInt(windowMsString, 10)
      : 10_000;

    configValidationUtility.validateConfig(this);
  }

  @IsNumber(
    {},
    {
      message:
        'Set Env variable RATE_LIMIT_MAX for maximum requests per window, example: 5',
    },
  )
  max: number;

  @IsNumber(
    {},
    {
      message:
        'Set Env variable RATE_LIMIT_WINDOW_MS for rate limit window in milliseconds, example: 10000',
    },
  )
  windowMs: number;
}
