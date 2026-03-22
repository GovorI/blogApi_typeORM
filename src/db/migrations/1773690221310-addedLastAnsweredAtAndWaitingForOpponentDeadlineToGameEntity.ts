import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedLastAnsweredAtAndWaitingForOpponentDeadlineToGameEntity1773690221310 implements MigrationInterface {
    name = 'AddedLastAnsweredAtAndWaitingForOpponentDeadlineToGameEntity1773690221310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "QuizGame" ADD "lastAnsweredAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "QuizGame" ADD "waitingForOpponentDeadline" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "QuizGame" DROP COLUMN "waitingForOpponentDeadline"`);
        await queryRunner.query(`ALTER TABLE "QuizGame" DROP COLUMN "lastAnsweredAt"`);
    }

}
