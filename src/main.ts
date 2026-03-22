import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appSetup } from './setup/app.setup';
import { useContainer } from 'class-validator';
import { CoreConfig } from './core/core.config';
import { JwtConfig } from './modules/jwt/jwt.config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const coreConfig = app.get<CoreConfig>(CoreConfig);
  const jwtConfig = app.get<JwtConfig>(JwtConfig);
  // Enable DI in class-validator so custom validators can inject services/models
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  appSetup(app);
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');

  logger.log(`App is running on: ${coreConfig.port}`);
  logger.log(`accessTokenExpiresIn: ${jwtConfig.accessTokenExpiresIn}`);
  logger.log(`refreshTokenExpiresIn: ${jwtConfig.refreshTokenExpiresIn}`);
  await app.listen(coreConfig.port);
}

bootstrap();
