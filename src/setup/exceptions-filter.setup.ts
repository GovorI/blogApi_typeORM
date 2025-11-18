import { INestApplication } from '@nestjs/common';
import { DomainHttpExceptionsFilter } from '../core/exceptions/filters/domain-exception.filter';
import { AllHttpExceptionsFilter } from '../core/exceptions/filters/all-exceptions.filter';
import { CoreConfig } from '../core/core.config';

export function exceptionsFilterSetup(app: INestApplication) {
  const coreConfig = app.get<CoreConfig>(CoreConfig);
  app.useGlobalFilters(
    new AllHttpExceptionsFilter(coreConfig),
    new DomainHttpExceptionsFilter(),
  );
}
