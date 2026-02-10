import { GameViewDto } from '../../api/view-dto/game.view-dto';
import { CommandHandler } from '@nestjs/cqrs';
import { GameQueryRepository } from '../../infrastructure/game.query-repository';

export class GetGameByIdCommand {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
  ) {}
}

@CommandHandler(GetGameByIdCommand)
export class GetGameByIdUseCase {
  constructor(private readonly gameQueryRepository: GameQueryRepository) {}

  async execute(command: GetGameByIdCommand): Promise<GameViewDto> {
    return this.gameQueryRepository.getGameById(command.gameId, command.userId);
  }
}
