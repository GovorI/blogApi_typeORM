import {
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { Extension } from '../core/exceptions/domain-exceptions';
import { ValidationException } from '../core/domain/domain.exception';

export const errorFormatter = (
  errors: ValidationError[],
  errorMessage?: any,
): Extension[] => {
  const errorsForResponse = errorMessage || [];
  const fieldErrorMap = new Map<string, string>();
  for (const error of errors) {
    if (!error.constraints && error.children?.length) {
      errorFormatter(error.children, errorsForResponse);
    } else if (error.constraints) {
      const constrainKeys = Object.keys(error.constraints);

      // Take only the first error message for each field to avoid duplicates
      if (!fieldErrorMap.has(error.property) && constrainKeys.length > 0) {
        const firstConstraintKey = constrainKeys[0];
        const message = error.constraints[firstConstraintKey];
        fieldErrorMap.set(error.property, message);

        const errorMsg = new Extension(message, error.property);
        errorsForResponse.push(errorMsg);
      }
    }
  }

  return errorsForResponse;
};

export function pipesSetup(app: INestApplication) {
  //Глобальный пайп для валидации и трансформации входящих данных.
  //На следующем занятии рассмотрим подробнее
  app.useGlobalPipes(
    new ValidationPipe({
      //class-transformer создает экземпляр dto
      //соответственно применятся значения по-умолчанию
      //и методы классов dto
      transform: true,
      stopAtFirstError: false, // Allow all validation errors to be collected
      whitelist: false, // Don't strip properties to allow default values
      forbidNonWhitelisted: false, // Don't throw error for unknown properties
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const formattedErrors = errorFormatter(errors);
        throw new ValidationException('Validation failed', formattedErrors);
      },
    }),
  );
}
