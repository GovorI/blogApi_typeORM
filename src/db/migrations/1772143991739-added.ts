import { MigrationInterface, QueryRunner } from 'typeorm';

export class Added1772143991739 implements MigrationInterface {
  name = 'Added1772143991739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Answer" DROP CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7"`,
    );
    await queryRunner.query(`ALTER TABLE "QuizGame" ADD "winnerId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "Answer" ADD CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE NO ACTION ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Answer" DROP CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7"`,
    );
    await queryRunner.query(`ALTER TABLE "QuizGame" DROP COLUMN "winnerId"`);
    await queryRunner.query(
      `ALTER TABLE "Answer" ADD CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
