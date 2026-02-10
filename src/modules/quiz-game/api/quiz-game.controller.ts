import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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

@Controller('pair-game-quiz/pairs')
export class QuizGameController {
  constructor(private readonly commandBus: CommandBus) {}

  @Get('my-current')
  @UseGuards(JwtAuthGuard)
  async getCurrentUnfinishedUserGame(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    const res = await this.commandBus.execute(
      new GetCurrentUserUnfinishedGameCommand(user.id),
    );
    console.log('my current game', res);
    return res;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getGameById(
    @Param('id', ParseUUIDPipe) id: string,
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    const res = await this.commandBus.execute(
      new GetGameByIdCommand(id, user.id),
    );
    console.log('game by id', res);
    return res;
  }

  @Post('connection')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async createGameConnection(
    @ExtractUserFromRequest() user: UserContextDto,
  ): Promise<GameViewDto> {
    return this.commandBus.execute(new ConnectionGameCommand(user.id));
  }

  @Post('my-current/answers')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async setAnswer(
    @ExtractUserFromRequest() user: UserContextDto,
    @Body() dto: SetAnswerInputDto,
  ): Promise<AnswerViewDto> {
    return this.commandBus.execute(new SetAnswerCommand(user.id, dto.answer));
  }
}
