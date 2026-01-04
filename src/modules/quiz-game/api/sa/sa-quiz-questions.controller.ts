import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BasicAuthGuard } from '../../../user-accounts/guards/basic/basic-auth.guard';
import { PaginatedViewDto } from '../../../../core/dto/base.paginated.view-dto';
import { QuizQuestionViewDto } from '../view-dto/quiz-question.view-dto';
import {
  CreateQuizQuestionInputDto,
  PublishQuizQuestionInputDto,
  UpdateQuizQuestionInputDto,
} from '../input-dto/quiz-question.input-dto';
import { GetSaQuizQuestionsQueryParams } from './sa-quiz-questions.get-query-params.input-dto';
import { CommandBus } from '@nestjs/cqrs';
import { QuizQuestionsQueryRepository } from '../../infrastructure/quiz-questions.query-repository';
import { CreateQuizQuestionCommand } from '../../application/use-cases/create-quiz-question.use-case';
import { DeleteQuizQuestionCommand } from '../../application/use-cases/delete-quiz-question.use-case';
import { UpdateQuizQuestionCommand } from '../../application/use-cases/update-quiz-question.use-case';
import { SetPublishStatusQuizQuestionCommand } from '../../application/use-cases/set-publish-status-quiz-question.use-case';

@ApiTags('QuizQuestions')
@Controller('sa/quiz/questions')
export class SaQuizQuestionsController {
  constructor(
    private readonly quizQuestionsQueryRepository: QuizQuestionsQueryRepository,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(BasicAuthGuard)
  @ApiOperation({ summary: 'Returns all questions with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'List of questions with pagination' })
  async getAll(
    @Query() query: GetSaQuizQuestionsQueryParams,
  ): Promise<PaginatedViewDto<QuizQuestionViewDto[]>> {
    return this.quizQuestionsQueryRepository.getAll(query);
  }

  @Post()
  @UseGuards(BasicAuthGuard)
  @ApiOperation({ summary: 'Create question' })
  @ApiBody({ type: CreateQuizQuestionInputDto })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  async create(
    @Body() dto: CreateQuizQuestionInputDto,
  ): Promise<QuizQuestionViewDto> {
    const id: string = await this.commandBus.execute(
      new CreateQuizQuestionCommand(dto),
    );
    return this.quizQuestionsQueryRepository.getByIdOrNotFoundFail(id);
  }

  @Delete(':id')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new DeleteQuizQuestionCommand(id));
  }

  @Put(':id')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Update question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiBody({ type: UpdateQuizQuestionInputDto })
  @ApiResponse({ status: 204, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuizQuestionInputDto,
  ): Promise<void> {
    return this.commandBus.execute(new UpdateQuizQuestionCommand(id, dto));
  }

  @Put(':id/publish')
  @UseGuards(BasicAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Publish/unpublish question' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiBody({ type: PublishQuizQuestionInputDto })
  @ApiResponse({ status: 204, description: 'Publish status updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishQuizQuestionInputDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new SetPublishStatusQuizQuestionCommand(id, dto.published),
    );
  }
}
