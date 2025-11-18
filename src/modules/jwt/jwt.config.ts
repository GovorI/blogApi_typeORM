import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { configValidationUtility } from '../../core/utils/config-validation.utility';

@Injectable()
export class JwtConfig {
  constructor(private configService: ConfigService<any, true>) {
    this.secret =
      this.configService.get<string>('JWT_SECRET') || 'default_secret_key';
    this.accessTokenExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );
    this.refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    configValidationUtility.validateConfig(this);
  }

  @IsNotEmpty({
    message:
      'Set Env variable JWT_SECRET for JWT token signing, example: my-super-secret-key',
  })
  @IsString()
  secret: string;

  @IsNotEmpty({
    message:
      'Set Env variable JWT_ACCESS_EXPIRES_IN for JWT access token expiration, example: 1h, 24h, 7d',
  })
  @IsString()
  accessTokenExpiresIn: string;

  @IsNotEmpty({
    message:
      'Set Env variable JWT_REFRESH_EXPIRES_IN for JWT refresh token expiration, example: 1h, 24h, 7d',
  })
  @IsString()
  refreshTokenExpiresIn: string;
}
