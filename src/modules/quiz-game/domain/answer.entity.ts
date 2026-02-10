import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlayerEntity } from './player.entity';

export enum answerStatuses {
  Correct = 'Correct',
  Incorrect = 'Incorrect',
}

@Entity('Answer')
export class AnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: answerStatuses })
  status: answerStatuses;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'uuid', nullable: false })
  playerId: string;

  //todo отсортировать в Asc чтобы выдавались в порядке
  // как пльзователь отвечал на вопросы
  @CreateDateColumn()
  addedAt: Date;

  @ManyToOne(() => PlayerEntity, { onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: PlayerEntity;
}
