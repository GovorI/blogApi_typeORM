import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { UsersSqlRepository } from '../infrastructure/users.sql-repository';
import { UsersConfig } from '../config/users.config';

/**
 * Валидатор для проверки email при переотправке кода подтверждения
 * Проверяет что:
 * - пользователь с таким email существует
 * - email еще не подтвержден
 * - пользователь не удален
 */
@ValidatorConstraint({ async: true })
@Injectable()
export class EmailValidator implements ValidatorConstraintInterface {
  constructor(
    private readonly usersRepository: UsersSqlRepository,
    private readonly usersConfig: UsersConfig,
  ) {}

  async validate(email: any) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return false;
    if (user.deletedAt) return false;
    if (this.usersConfig.isAutomaticallyConfirmed) return true; //todo лучше выполнять эту логику в usecase?
    if (user.isEmailConfirmed) return false;
    return true;
  }

  defaultMessage(): string {
    return 'Email must belong to a registered user and not be confirmed';
  }
}

export function IsEmailValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsEmailValid',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: EmailValidator,
    });
  };
}
