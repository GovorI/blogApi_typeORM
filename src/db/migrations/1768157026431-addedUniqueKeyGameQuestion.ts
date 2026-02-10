import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedUniqueKeyGameQuestion1768157026431
  implements MigrationInterface
{
  name = 'AddedUniqueKeyGameQuestion1768157026431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" ADD CONSTRAINT "UQ_3c18cc83102d1cc544bccfbfdd3" UNIQUE ("gameId", "questionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" DROP CONSTRAINT "UQ_3c18cc83102d1cc544bccfbfdd3"`,
    );
  }
}
