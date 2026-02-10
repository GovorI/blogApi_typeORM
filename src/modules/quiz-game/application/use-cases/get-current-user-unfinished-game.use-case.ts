import { GameQueryRepository } from '../../infrastructure/game.query-repository';
import { CommandHandler } from '@nestjs/cqrs';

export class GetCurrentUserUnfinishedGameCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(GetCurrentUserUnfinishedGameCommand)
export class GetCurrentUserUnfinishedGame {
  constructor(private readonly gameQueryRepository: GameQueryRepository) {}

  async execute(command: GetCurrentUserUnfinishedGameCommand) {
    return this.gameQueryRepository.getCurrentUnfinishedGame(command.userId);
  }
}
