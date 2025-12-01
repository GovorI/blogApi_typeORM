import { UnauthorizedException as DomainUnauthorizedException } from '../../../../core/domain';
import { CommandHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../infrastructure/users.query-repository';
import { JwtService } from '../jwt-service';
import { JwtPayload } from '../../domain/jwt-payload.interface';

export class GetMeCommand {
  constructor(public accessToken: string) {}
}

@CommandHandler(GetMeCommand)
export class GetMeUseCase {
  constructor(
    private jwtService: JwtService,
    private usersQueryRepository: UsersQueryRepository,
  ) {}

  async execute(
    command: GetMeCommand,
  ): Promise<{ email: string; login: string; userId: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyToken(command.accessToken);
    } catch {
      throw new DomainUnauthorizedException();
    }

    const userId: string | undefined = payload?.sub;
    if (!userId) {
      throw new DomainUnauthorizedException();
    }

    return await this.usersQueryRepository.getMe(userId);
  }
}
