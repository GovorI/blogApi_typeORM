import { INestApplication } from '@nestjs/common';
import { CoreConfig } from '../core/core.config';

export function globalPrefixSetup(app: INestApplication) {
  const coreConfig = app.get<CoreConfig>(CoreConfig);
  app.setGlobalPrefix(coreConfig.globalPrefix);
}
