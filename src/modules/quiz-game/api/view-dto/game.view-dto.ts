import { answerStatuses } from '../../domain/answer.entity';
import { GameEntity, gameStatuses } from '../../domain/game.entity';
import { positionNumber } from '../../domain/player.entity';

export class GameViewDto {
  id: string;
  firstPlayerProgress: {
    answers: {
      questionId: string;
      answerStatus: answerStatuses;
      addedAt: Date;
    }[];
    player: {
      id: string | null;
      login: string | null;
    };
    score: number;
  };
  secondPlayerProgress: {
    answers: {
      questionId: string;
      answerStatus: answerStatuses;
      addedAt: Date;
    }[];
    player: {
      id: string | null;
      login: string | null;
    };
    score: number;
  } | null;
  questions:
    | {
        id: string;
        body: string;
      }[]
    | null;
  status: gameStatuses;
  pairCreatedDate: Date | null;
  startGameDate: Date | null;
  finishGameDate: Date | null;

  static mapToView(entity: GameEntity): GameViewDto {
    const viewDto: GameViewDto = {
      id: entity.gameId,
      firstPlayerProgress: {
        answers: entity.players
          .filter((p) => p.position === positionNumber.First)
          .flatMap((p) =>
            p.answers.map((a) => ({
              questionId: a.questionId,
              answerStatus: a.status,
              addedAt: a.addedAt,
            })),
          )
          .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime()),
        player: {
          id:
            entity.players.find((p) => p.position === positionNumber.First)
              ?.userId ?? null,
          login:
            entity.players.find((p) => p.position === positionNumber.First)
              ?.user.login ?? null,
        },
        score:
          entity.players.find((p) => p.position === positionNumber.First)
            ?.score ?? 0,
      },
      secondPlayerProgress: null,
      questions: null,
      status: entity.status,
      pairCreatedDate: entity.pairCreatedDate,
      startGameDate: entity.startGameDate,
      finishGameDate: entity.finishGameDate,
    };

    if (entity.status !== gameStatuses.PendingSecondPlayer) {
      viewDto.secondPlayerProgress = {
        answers: entity.players
          .filter((p) => p.position === positionNumber.Second)
          .flatMap((p) =>
            p.answers.map((a) => ({
              questionId: a.questionId,
              answerStatus: a.status,
              addedAt: a.addedAt,
            })),
          )
          .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime()),
        player: {
          id:
            entity.players.find((p) => p.position === positionNumber.Second)
              ?.userId ?? null,
          login:
            entity.players.find((p) => p.position === positionNumber.Second)
              ?.user.login ?? null,
        },
        score:
          entity.players.find((p) => p.position === positionNumber.Second)
            ?.score ?? 0,
      };

      // viewDto.questions = entity.questions.map((q) => ({
      //   id: q.questionId,
      //   body: q.question.body,
      viewDto.questions = [...entity.questions]
        .sort((a, b) => a.index - b.index)
        .map((q) => ({
          id: q.questionId,
          body: q.question.body,
        }));
      // secondPlayerProgress: {
      //   answers: entity.players
      //     .filter((p) => p.position === positionNumber.Second)
      //     .flatMap((p) =>
      //       p.answers.map((a) => ({
      //         questionId: a.questionId,
      //         answerStatus: a.status,
      //         addedAt: a.addedAt,
      //       })),
      //     ),
      //   player: {
      //     id:
      //       entity.players.find((p) => p.position === positionNumber.Second)
      //         ?.userId ?? null,
      //     login:
      //       entity.players.find((p) => p.position === positionNumber.Second)
      //         ?.user.login ?? null,
      //   },
      //   score:
      //     entity.players.find((p) => p.position === positionNumber.Second)
      //       ?.score ?? 0,
      // },
      // questions: entity.questions.map((q) => ({
      //   id: q.questionId,
      //   body: q.question.body,
      // })),
      // status: entity.status,
      // pairCreatedDate: entity.pairCreatedDate,
      // startGameDate: entity.startGameDate,
      // finishGameDate: entity.finishGameDate,
    }
    return viewDto;
  }
}
