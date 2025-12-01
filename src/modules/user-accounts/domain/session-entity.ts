import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user-entity';

@Entity('Sessions')
export class SessionEntity {
  @PrimaryColumn('uuid')
  id: string;
  @Column({ type: 'uuid' })
  userId: string;
  @Column({ type: 'uuid' })
  deviceId: string;
  @Column({ type: 'varchar' })
  deviceName: string;
  @Column({ type: 'varchar' })
  ip: string;
  @Column({ type: 'timestamp' })
  iat: Date;
  @Column({ type: 'timestamp' })
  exp: Date;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  updateDates(iat: number, exp: number): void {
    this.iat = new Date(iat * 1000);
    this.exp = new Date(exp * 1000);
    this.updatedAt = new Date();
  }

  isExpired(): boolean {
    return this.exp.getTime() < Date.now();
  }
}
