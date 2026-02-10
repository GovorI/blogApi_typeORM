import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { DomainException } from '../../../core/exceptions/domain-exceptions';
import { DomainExceptionCode } from '../../../core/exceptions/domain-exception-codes';

@Entity('QuizQuestions')
export class QuestionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  body: string;

  @Column({ type: 'text', array: true })
  correctAnswers: string[];

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  updatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

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
