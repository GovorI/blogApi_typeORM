import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuizQuestionsTable1766015113935 implements MigrationInterface {
  name = 'AddQuizQuestionsTable1766015113935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "QuizQuestions" ("id" uuid NOT NULL, "body" character varying(500) NOT NULL, "correctAnswers" text array NOT NULL, "published" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP, "deletedAt" TIMESTAMP, CONSTRAINT "PK_da996a025cd02877083c47ea971" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "QuizQuestions"`);
  }
}
