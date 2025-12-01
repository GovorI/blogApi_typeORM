import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SessionEntity } from './session-entity';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Entity('Users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;
  @Column({ type: 'varchar', unique: true })
  login: string;
  @Column({ type: 'varchar', unique: true })
  email: string;
  @Column({ type: 'varchar' })
  passwordHash: string;
  @Column({ default: false })
  isEmailConfirmed: boolean;
  @Column({ type: 'varchar', nullable: true })
  confirmCode: string | null;
  @Column({ type: 'timestamp', nullable: true })
  expirationCode: Date | null;
  @Column({ type: 'varchar', nullable: true })
  passwordRecoveryCode: string | null;
  @Column({ type: 'timestamp', nullable: true })
  passwordRecoveryCodeExpiration: Date | null;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => SessionEntity, (session) => session.user)
  sessions: SessionEntity[];

  makeDeleted(): void {
    if (this.deletedAt !== null) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Entity already deleted',
      });
    }
    this.deletedAt = new Date();
  }
}
