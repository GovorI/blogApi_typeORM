import { InjectRepository } from '@nestjs/typeorm';
import { GameQuestionEntity } from '../domain/game-question.entity';
import { EntityManager, Repository } from 'typeorm';

export class GameQuestionsRepository {
  constructor(
    @InjectRepository(GameQuestionEntity)
    private readonly repo: Repository<GameQuestionEntity>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<GameQuestionEntity> {
    return manager ? manager.getRepository(GameQuestionEntity) : this.repo;
  }

  // async createGameQuestions(
  //   gameId: string,
  //   questions: string[],
  //   manager?: EntityManager,
  // ): Promise<void> {
  //   const gameQuestions = questions.map((question, index) => ({
  //     index: index + 1,
  //     gameId,
  //     questionId: question,
  //   }));
  //   await this.getRepo(manager).save(gameQuestions);
  // }

  save(
    entity: GameQuestionEntity[],
    manager?: EntityManager,
  ): Promise<GameQuestionEntity[]> {
    return this.getRepo(manager).save(entity);
  }

  getGameQuestions(gameId: string) {
    return this.repo.find({
      where: { gameId },
      order: { index: 'ASC' },
    });
  }
}
