import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CoreConfig } from '../core/core.config';

export function swaggerSetup(app: INestApplication) {
  const coreConfig = app.get<CoreConfig>(CoreConfig);
  const config = new DocumentBuilder()
    .setTitle('BLOGGER API')
    .addBearerAuth()
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(coreConfig.globalPrefix, app, document, {
    customSiteTitle: 'Blogger Swagger',
  });
}
