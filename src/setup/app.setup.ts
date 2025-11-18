import { pipesSetup } from './pipes.setup';
import { INestApplication } from '@nestjs/common';
import { globalPrefixSetup } from './global-prefix.setup';
import { swaggerSetup } from './swagger.setup';
import { enableCorsSetup } from './enable-cors.setup';
import { exceptionsFilterSetup } from './exceptions-filter.setup';
import { CoreConfig } from '../core/core.config';
import { cookieSetup } from './cookieSetup';

export function appSetup(app: INestApplication) {
  const coreConfig = app.get<CoreConfig>(CoreConfig);

  cookieSetup(app)
  if (coreConfig.isSwaggerEnabled) {
    swaggerSetup(app);
  }
  globalPrefixSetup(app);
  enableCorsSetup(app);
  pipesSetup(app);
  exceptionsFilterSetup(app);
}
