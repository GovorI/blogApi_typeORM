import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerEntity } from './player.entity';
import { GameQuestionEntity } from './game-question.entity';

export enum gameStatuses {
  PendingSecondPlayer = 'PendingSecondPlayer',
  Active = 'Active',
  Finished = 'Finished',
}

@Entity('QuizGame')
export class GameEntity {
  @PrimaryGeneratedColumn('uuid')
  gameId: string;

  @Column({
    type: 'enum',
    enum: gameStatuses,
    default: gameStatuses.PendingSecondPlayer,
  })
  status: gameStatuses;

  @OneToMany(
    () => GameQuestionEntity,
    (gameQuestion) => gameQuestion.quizGame,
    { cascade: true },
  )
  questions: GameQuestionEntity[];

  @Column({ type: 'timestamp', nullable: true, default: null })
  pairCreatedDate: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  startGameDate: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  finishGameDate: Date | null;

  @OneToMany(() => PlayerEntity, (player) => player.quizGame)
  players: PlayerEntity[];
}
