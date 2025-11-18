import { CommandHandler } from '@nestjs/cqrs';
import { EmailResendingInputDto } from '../../api/input-dto/email-resending.input-dto';
import { randomUUID } from 'crypto';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';
import { UsersConfig } from '../../config/users.config';
import { EmailService } from '../../../notifications/email.service';

export class RegistrationEmailResendingCommand {
  constructor(
    public dto: EmailResendingInputDto,
    public ip: string | undefined,
  ) {}
}

@CommandHandler(RegistrationEmailResendingCommand)
export class RegistrationEmailResendingUseCase {
  constructor(
    private usersRepository: UsersSqlRepository,
    private usersConfig: UsersConfig,
    private emailService: EmailService,
  ) {}

  async execute(command: RegistrationEmailResendingCommand) {
    const user = await this.usersRepository.findByEmail(command.dto.email);
    if (!user) {
      // Возвращаем успех, даже если пользователь не найден, чтобы не раскрывать информацию
      return;
    }
    if (user.isEmailConfirmed) {
      // Если email уже подтвержден, просто возвращаем успех
      return;
    }
    const confirmCode = randomUUID();
    const expirationCode = new Date(Date.now() + 60000);
    user.confirmCode = confirmCode;
    user.expirationCode = expirationCode;
    await this.usersRepository.save(user);

    if (!this.usersConfig.isAutomaticallyConfirmed) {
      await this.emailService
        .sendConfirmationEmail(command.dto.email, confirmCode)
        .catch((error) => {
          console.log(error);
        });
    }
  }
}
