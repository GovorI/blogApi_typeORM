import { CommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/users.repository';

export class RegistrationConfirmationCommand {
  constructor(public code: string) {}
}

@CommandHandler(RegistrationConfirmationCommand)
export class RegistrationConfirmationUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(command: RegistrationConfirmationCommand) {
    const user = await this.usersRepository.findUserByConfirmationCode(
      command.code,
    );
    if (!user) {
      return; // DTO validator should catch, double-checking here
    }

    user.isEmailConfirmed = true;
    user.confirmCode = null;
    user.expirationCode = null;

    await this.usersRepository.save(user);
  }
}
