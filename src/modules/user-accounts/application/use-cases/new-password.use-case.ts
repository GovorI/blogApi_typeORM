import { CommandHandler } from '@nestjs/cqrs';
import { CryptoService } from '../crypto-service';
import { UsersRepository } from '../../infrastructure/users.repository';

export class NewPasswordCommand {
  constructor(
    public readonly recoveryCode: string,
    public readonly newPassword: string,
  ) {}
}

@CommandHandler(NewPasswordCommand)
export class NewPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async execute(command: NewPasswordCommand) {
    const user = await this.usersRepository.findUserByPasswordRecoveryCode(
      command.recoveryCode,
    );
    if (!user) {
      return;
    }
    if (!user.passwordRecoveryCodeExpiration) return false;

    const expiresAt = new Date(user.passwordRecoveryCodeExpiration).getTime();
    if (Number.isNaN(expiresAt)) return false;

    const passwordHash: string = await this.cryptoService.createPassHash(
      command.newPassword,
    );
    user.passwordRecoveryCode = null;
    user.passwordRecoveryCodeExpiration = null;
    user.passwordHash = passwordHash;
    await this.usersRepository.save(user);
  }
}
