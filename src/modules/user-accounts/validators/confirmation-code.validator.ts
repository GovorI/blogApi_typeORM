import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { UsersSqlRepository } from '../infrastructure/users.sql-repository';

/**
 * Валидатор для проверки кода подтверждения email
 * Проверяет что:
 * - код существует в БД
 * - пользователь еще не подтвердил email
 * - срок действия кода не истек
 */
@ValidatorConstraint({ async: true })
@Injectable()
export class ConfirmationCodeConstraint
  implements ValidatorConstraintInterface
{
  constructor(private readonly usersRepository: UsersSqlRepository) {}

  async validate(code: any) {
    if (typeof code !== 'string' || !code.trim()) return false;

    const user = await this.usersRepository.findUserByConfirmationCode(code);
    if (!user) return false;
    if (user.deletedAt) return false;
    if (user.isEmailConfirmed) return false;
    if (!user.expirationCode) return false;

    const expiresAt = user.expirationCode.getTime();
    if (Number.isNaN(expiresAt)) return false;

    return expiresAt >= Date.now();
  }

  defaultMessage(args: ValidationArguments) {
    return 'The confirmation code is incorrect, expired or already applied';
  }
}

export function IsConfirmationCodeValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsConfirmationCodeValid',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: ConfirmationCodeConstraint,
    });
  };
}
