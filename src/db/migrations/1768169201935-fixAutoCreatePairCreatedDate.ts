import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAutoCreatePairCreatedDate1768169201935 implements MigrationInterface {
    name = 'FixAutoCreatePairCreatedDate1768169201935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "QuizGame" ALTER COLUMN "pairCreatedDate" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "QuizGame" ALTER COLUMN "pairCreatedDate" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "QuizGame" ALTER COLUMN "pairCreatedDate" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "QuizGame" ALTER COLUMN "pairCreatedDate" SET NOT NULL`);
    }

}
