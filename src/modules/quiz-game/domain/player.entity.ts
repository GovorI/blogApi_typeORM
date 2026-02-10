import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../user-accounts/domain/user.entity';
import { GameEntity } from './game.entity';
import { AnswerEntity } from './answer.entity';

export enum positionNumber {
  First = 1,
  Second = 2,
}

@Entity('Player')
export class PlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  gameId: string;

  @Column({ type: 'enum', enum: positionNumber })
  position: positionNumber;

  @OneToMany(() => AnswerEntity, (answer) => answer.player)
  answers: AnswerEntity[];

  @Column({ type: 'int', default: 0 })
  score: number;

  @ManyToOne(() => GameEntity)
  @JoinColumn({ name: 'gameId' })
  quizGame: GameEntity;
}
