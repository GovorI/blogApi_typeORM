import { CommandHandler } from '@nestjs/cqrs';
import { RegistrationInputDto } from '../../api/input-dto/registration.input-dto';
import { ValidationException } from '../../../../core/domain/domain.exception';
import { Extension } from '../../../../core/exceptions/domain-exceptions';
import { randomUUID } from 'crypto';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';
import { CryptoService } from '../crypto-service';
import { UsersConfig } from '../../config/users.config';
import { EmailService } from '../../../notifications/email.service';
import { UserEntity } from '../../domain/user-entity';

export class RegistrationCommand {
  constructor(
    public dto: RegistrationInputDto,
    public ip: string | undefined,
  ) {}
}

@CommandHandler(RegistrationCommand)
export class RegistrationUseCase {
  constructor(
    private readonly usersRepository: UsersSqlRepository,
    private readonly cryptoService: CryptoService,
    private readonly usersConfig: UsersConfig,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: RegistrationCommand) {
    const [existingUserByLogin, existingUserByEmail] = await Promise.all([
      this.usersRepository.findByLogin(command.dto.login),
      this.usersRepository.findByEmail(command.dto.email),
    ]);

    const extensions: Extension[] = [];
    if (existingUserByLogin) {
      extensions.push(new Extension('Login already exists', 'login'));
    }
    if (existingUserByEmail) {
      extensions.push(new Extension('Email already exists', 'email'));
    }
    if (extensions.length) {
      throw new ValidationException('Validation failed', extensions);
    }

    const passwordHash = await this.cryptoService.createPassHash(
      command.dto.password,
    );

    const confirmCode = randomUUID();
    const expirationCode = new Date(Date.now() + 600000);

    const newUser = new UserEntity({
      login: command.dto.login,
      email: command.dto.email,
      passwordHash,
      createdAt: new Date(),
      isEmailConfirmed: this.usersConfig.isAutomaticallyConfirmed,
      deletedAt: null,
      confirmCode,
      expirationCode,
    });

    await this.usersRepository.save(newUser);

    // Only send confirmation email if manual confirmation is required
    if (!this.usersConfig.isAutomaticallyConfirmed) {
      await this.emailService
        .sendConfirmationEmail(command.dto.email, confirmCode)
        .catch((error) => {
          console.error('Failed to send confirmation email:', error);
        });
    }
  }
}
