import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConnectionGameCommand } from '../application/use-cases/connection-game.use-case';
import { UserContextDto } from '../../user-accounts/guards/dto/user-context.dto';
import { ExtractUserFromRequest } from '../../user-accounts/guards/decorators/extract-user-from-request';
import { JwtAuthGuard } from '../../user-accounts/guards/bearer/jwt-auth.guard';
import { GetCurrentUserUnfinishedGameCommand } from '../application/use-cases/get-current-user-unfinished-game.use-case';
import { GameViewDto } from './view-dto/game.view-dto';
import { GetGameByIdCommand } from '../application/use-cases/get-game-by-id.use-case';
import { SetAnswerCommand } from '../application/use-cases/set-answer.use-case';
import { SetAnswerInputDto } from './input-dto/set-answer.input-dto';
import { AnswerViewDto } from './view-dto/answer.view-dto';
import { GetAllUserGamesGetQueryParams } from './input-dto/get-all-user-games.get-query-params';
import { GameQueryRepository } from '../infrastructure/game.query-repository';
import { PaginatedViewDto } from '../../../core/dto/base.paginated.view-dto';
import { UserStatisticViewDto } from './view-dto/user-statustic.view-dto';

@Controller('pair-game-quiz')
export class QuizGameController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly gameQueryRepo: GameQueryRepository,
  ) {}

  @Get('pairs/my')
  @UseGuards(JwtAuthGuard)
  async getAllUserGames(
    @ExtractUserFromRequest() user: UserContextDto,
    @Query() queryParams: GetAllUserGamesGetQueryParams,
  ): Promise<PaginatedViewDto<GameViewDto[]>> {
    const res = await this.gameQueryRepo.getAllUserGames(user.id, queryParams);
    console.log('all user games', res);
    return res;
  }

  @Get('users/my-statistic')
  @UseGuards(JwtAuthGuard)
  async getUserStatistic(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<UserStatisticViewDto> {
    return this.gameQueryRepo.getUserStatistic(user.id);
  }

  @Get('pairs/my-current')
  @UseGuards(JwtAuthGuard)
  async getCurrentUnfinishedUserGame(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    return this.commandBus.execute(
      new GetCurrentUserUnfinishedGameCommand(user.id),
    );
  }

  @Get('pairs/:id')
  @UseGuards(JwtAuthGuard)
  async getGameById(
    @Param('id', ParseUUIDPipe) id: string,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    return this.commandBus.execute(new GetGameByIdCommand(id, user.id));
  }

  @Post('pairs/connection')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async createGameConnection(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    return this.commandBus.execute(new ConnectionGameCommand(user.id));
  }

  @Post('pairs/my-current/answers')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async setAnswer(
    @ExtractUserFromRequest() user: UserContextDto,
    @Body() dto: SetAnswerInputDto,
  ): Promise<AnswerViewDto> {
    return this.commandBus.execute(new SetAnswerCommand(user.id, dto.answer));
  }
}
