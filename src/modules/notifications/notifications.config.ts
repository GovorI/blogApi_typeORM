import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { configValidationUtility } from '../../core/utils/config-validation.utility';

@Injectable()
export class NotificationsConfig {
  constructor(private configService: ConfigService<any, true>) {
    this.mailHost =
      this.configService.get<string>('MAIL_HOST') || 'smtp.mail.ru';
    this.mailPort = this.configService.get<string>('MAIL_PORT')
      ? parseInt(this.configService.get<string>('MAIL_PORT'), 10)
      : 465;
    this.mailSecure = configValidationUtility.convertToBoolean(
      this.configService.get<string>('MAIL_SECURE') ?? 'true',
    ) as boolean;
    this.mailUser = this.configService.get<string>('MAIL_USER') || '';
    this.mailPass = this.configService.get<string>('MAIL_PASS') || '';
    this.mailFrom =
      this.configService.get<string>('MAIL_FROM') ||
      this.mailUser ||
      'no-reply@example.com';
    this.mailTlsRejectUnauthorized = configValidationUtility.convertToBoolean(
      this.configService.get<string>('MAIL_TLS_REJECT_UNAUTHORIZED') ?? 'false',
    ) as boolean;

    configValidationUtility.validateConfig(this);
  }

  @IsNotEmpty({
    message:
      'Set Env variable MAIL_HOST for email server host, example: smtp.gmail.com',
  })
  @IsString()
  mailHost: string;

  @IsNumber(
    {},
    {
      message:
        'Set Env variable MAIL_PORT for email server port, example: 587, 465',
    },
  )
  mailPort: number;

  @IsBoolean({
    message:
      'Set Env variable MAIL_SECURE for email server secure connection, example: true, false',
  })
  mailSecure: boolean;

  @IsNotEmpty({
    message: 'Set Env variable MAIL_USER for email authentication username',
  })
  @IsString()
  mailUser: string;

  @IsNotEmpty({
    message: 'Set Env variable MAIL_PASS for email authentication password',
  })
  @IsString()
  mailPass: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message:
        'Set Env variable MAIL_FROM for sender email address, example: no-reply@example.com',
    },
  )
  mailFrom: string;

  @IsBoolean({
    message:
      'Set Env variable MAIL_TLS_REJECT_UNAUTHORIZED for TLS certificate validation, example: true, false',
  })
  mailTlsRejectUnauthorized: boolean;
}
