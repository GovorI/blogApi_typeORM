import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedQuizGameEntities1767972361244 implements MigrationInterface {
  name = 'AddedQuizGameEntities1767972361244';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."Answer_status_enum" AS ENUM('Correct', 'Incorrect')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Answer" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."Answer_status_enum" NOT NULL, "body" text NOT NULL, "questionId" uuid NOT NULL, "playerId" uuid NOT NULL, "addedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4d437db1a849fc5c36e25c55daf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Player_position_enum" AS ENUM('1', '2')`,
    );
    await queryRunner.query(
      `CREATE TABLE "Player" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "gameId" uuid NOT NULL, "position" "public"."Player_position_enum" NOT NULL, "score" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c390d9968607986a5f038e3305e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "GameQuestion" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "index" integer NOT NULL, "gameId" uuid NOT NULL, "questionId" uuid NOT NULL, CONSTRAINT "PK_edebb5e5f6304e0b6505d614894" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."QuizGame_status_enum" AS ENUM('PendingSecondPlayer', 'Active', 'Finished')`,
    );
    await queryRunner.query(
      `CREATE TABLE "QuizGame" ("gameId" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."QuizGame_status_enum" NOT NULL DEFAULT 'PendingSecondPlayer', "pairCreatedDate" TIMESTAMP NOT NULL DEFAULT now(), "startGameDate" TIMESTAMP, "finishGameDate" TIMESTAMP, CONSTRAINT "PK_31669b1cd1146affa7a75a0fd4f" PRIMARY KEY ("gameId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "Answer" ADD CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Player" ADD CONSTRAINT "FK_9be207182e9cd0809fe0d8f7302" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Player" ADD CONSTRAINT "FK_8d382155f20c03f32151b2bb003" FOREIGN KEY ("gameId") REFERENCES "QuizGame"("gameId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" ADD CONSTRAINT "FK_e62e1be2636656586ef3af4489b" FOREIGN KEY ("gameId") REFERENCES "QuizGame"("gameId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" ADD CONSTRAINT "FK_0e6dc7cd831eb81c54e2bb98bbb" FOREIGN KEY ("questionId") REFERENCES "QuizQuestions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" DROP CONSTRAINT "FK_0e6dc7cd831eb81c54e2bb98bbb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GameQuestion" DROP CONSTRAINT "FK_e62e1be2636656586ef3af4489b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Player" DROP CONSTRAINT "FK_8d382155f20c03f32151b2bb003"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Player" DROP CONSTRAINT "FK_9be207182e9cd0809fe0d8f7302"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Answer" DROP CONSTRAINT "FK_c5c016e67d22320aca9f56c61b7"`,
    );
    await queryRunner.query(`DROP TABLE "QuizGame"`);
    await queryRunner.query(`DROP TYPE "public"."QuizGame_status_enum"`);
    await queryRunner.query(`DROP TABLE "GameQuestion"`);
    await queryRunner.query(`DROP TABLE "Player"`);
    await queryRunner.query(`DROP TYPE "public"."Player_position_enum"`);
    await queryRunner.query(`DROP TABLE "Answer"`);
    await queryRunner.query(`DROP TYPE "public"."Answer_status_enum"`);
  }
}
