export type TopUserRawRow = {
  userId: string;
  login: string;
  gamesCount: string | number;
  sumScore: string | number;
  avgScore: string | number;
  winsCount: string | number;
  lossesCount: string | number;
  drawsCount: string | number;
};

export class TopUserViewDto {
  sumScore: number;
  avgScores: number;
  gamesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  player: { id: string; login: string };

  static mapToView(raw: TopUserRawRow): TopUserViewDto {
    return {
      sumScore: Number(raw.sumScore) || 0,
      avgScores: Math.round(Number(raw.avgScore || 0) * 100) / 100,
      gamesCount: Number(raw.gamesCount) || 0,
      winsCount: Number(raw.winsCount) || 0,
      lossesCount: Number(raw.lossesCount) || 0,
      drawsCount: Number(raw.drawsCount) || 0,
      player: {
        id: raw.userId,
        login: raw.login,
      },
    };
  }
}
