import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { GameEntity } from './game.entity';
import { QuestionEntity } from './question.entity';

@Entity('GameQuestion')
@Unique(['gameId', 'questionId'])
export class GameQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  //todo порядковый номер вопроса в игре
  //(сортировать для выдачи по asc)
  @Column({ type: 'int' })
  index: number;

  @Column({ type: 'uuid' })
  gameId: string;

  @ManyToOne(() => GameEntity)
  @JoinColumn({ name: 'gameId' })
  quizGame: GameEntity;

  @Column({ type: 'uuid' })
  questionId: string;

  @ManyToOne(() => QuestionEntity)
  @JoinColumn({ name: 'questionId' })
  question: QuestionEntity;
}
