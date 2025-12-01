import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { configValidationUtility } from './utils/config-validation.utility';

export enum Environments {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TESTING = 'testing',
}

@Injectable()
export class CoreConfig {
  constructor(private configService: ConfigService<any, true>) {
    console.log('NODE_ENV:', process.env.NODE_ENV);

    this.port = Number(this.configService.get<string>('PORT')) || 3000;
    this.env = this.configService.get<string>('NODE_ENV');
    this.globalPrefix =
      this.configService.get<string>('GLOBAL_PREFIX') || 'api';

    this.isSwaggerEnabled = configValidationUtility.convertToBoolean(
      this.configService.get<string>('IS_SWAGGER_ENABLED'),
    ) as boolean;

    this.includeTestingModule = configValidationUtility.convertToBoolean(
      this.configService.get<string>('INCLUDE_TESTING_MODULE'),
    ) as boolean;

    this.postresHost = this.configService.get<string>('POSTGRES_HOST');
    this.postresPort =
      Number(this.configService.get<string>('POSTGRES_PORT')) || 5432;
    this.postresUser = this.configService.get<string>('POSTGRES_USER');
    this.postresPassword = this.configService.get<string>('POSTGRES_PASSWORD');
    this.postresDatabase = this.configService.get<string>('POSTGRES_DATABASE');

    this.sendInternalServerErrorDetails =
      configValidationUtility.convertToBoolean(
        this.configService.get<string>('SEND_INTERNAL_SERVER_ERROR_DETAILS'),
      ) as boolean;

    configValidationUtility.validateConfig(this);
  }

  @IsNumber(
    {},
    {
      message: 'Set Env variable PORT, example: 3000',
    },
  )
  port: number;

  @IsEnum(Environments, {
    message:
      'Ser correct NODE_ENV value, available values: ' +
      configValidationUtility.getEnumValues(Environments).join(', '),
  })
  env: string;

  @IsBoolean({
    message:
      'Set Env variable IS_SWAGGER_ENABLED to enable/disable Swagger, example: true, available values: true, false',
  })
  isSwaggerEnabled: boolean;

  @IsBoolean({
    message:
      'Set Env variable INCLUDE_TESTING_MODULE to enable/disable Dangerous for production TestingModule, example: true, available values: true, false, 0, 1',
  })
  includeTestingModule: boolean;

  @IsBoolean({
    message:
      'Set Env variable SEND_INTERNAL_SERVER_ERROR_DETAILS to enable/disable Dangerous for production internal server error details (message, etc), example: true, available values: true, false, 0, 1',
  })
  sendInternalServerErrorDetails: boolean;

  @IsNotEmpty({
    message:
      'Set Env variable GLOBAL_PREFIX for API global prefix, example: api',
  })
  globalPrefix: string;

  @IsNumber(
    {},
    {
      message: 'Set Env variable POSTGRES_PORT, example: 5432',
    },
  )
  postresPort: number;

  @IsNotEmpty({
    message: 'Set Env variable POSTGRES_HOST, example: localhost',
  })
  postresHost: string;

  @IsNotEmpty({
    message: 'Set Env variable POSTGRES_USER, example: postgres',
  })
  postresUser: string;

  @IsNotEmpty({
    message: 'Set Env variable POSTGRES_PASSWORD, example: 12345',
  })
  postresPassword: string;

  @IsNotEmpty({
    message:
      'Set Env variable POSTGRES_DATABASE, example: bloggers-platform-sql',
  })
  postresDatabase: string;
}
