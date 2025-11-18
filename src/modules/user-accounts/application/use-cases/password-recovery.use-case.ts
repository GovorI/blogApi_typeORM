import { CommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';
import { EmailService } from '../../../notifications/email.service';
import { UsersConfig } from '../../config/users.config';

export class PasswordRecoveryCommand {
  constructor(public readonly email: string) {}
}

@CommandHandler(PasswordRecoveryCommand)
export class PasswordRecoveryUseCase {
  constructor(
    private readonly usersRepository: UsersSqlRepository,
    private readonly emailService: EmailService,
    private readonly usersConfig: UsersConfig,
  ) {}

  async execute(command: PasswordRecoveryCommand) {
    const user = await this.usersRepository.findByEmail(command.email);
    if (!user) {
      return;
    }

    const code = randomUUID();
    const expiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordRecoveryCode = code;
    user.passwordRecoveryExpiration = expiration;
    console.log('password recovery code: ', code);

    await this.usersRepository.save(user);
    if (!this.usersConfig.isAutomaticallyConfirmed) {
      await this.emailService.sendPasswordRecoveryEmail(command.email, code);
    }
  }
}
