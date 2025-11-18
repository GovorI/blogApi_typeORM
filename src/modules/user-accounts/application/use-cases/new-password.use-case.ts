import { CommandHandler } from '@nestjs/cqrs';
import { CryptoService } from '../crypto-service';
import { UsersSqlRepository } from '../../infrastructure/users.sql-repository';

export class NewPasswordCommand {
  constructor(
    public readonly recoveryCode: string,
    public readonly newPassword: string,
  ) {}
}

@CommandHandler(NewPasswordCommand)
export class NewPasswordUseCase {
  constructor(
    private readonly usersRepository: UsersSqlRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async execute(command: NewPasswordCommand) {
    const user = await this.usersRepository.findUserByPasswordRecoveryCode(
      command.recoveryCode,
    );
    if (!user) {
      return;
    }
    if (!user.passwordRecoveryExpiration) return false;

    const expiresAt = new Date(user.passwordRecoveryExpiration).getTime();
    if (Number.isNaN(expiresAt)) return false;

    const passwordHash: string = await this.cryptoService.createPassHash(
      command.newPassword,
    );
    user.passwordRecoveryCode = null;
    user.passwordRecoveryExpiration = null;
    user.passwordHash = passwordHash;
    await this.usersRepository.save(user);
  }
}
