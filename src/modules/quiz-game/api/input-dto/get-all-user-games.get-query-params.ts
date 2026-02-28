import { BaseQueryParams } from '../../../../core/dto/base.query-params.input-dto';
import { IsEnum } from 'class-validator';

export enum GamesSortBy {
  pairCreatedDate = 'pairCreatedDate',
  status = 'status',
}

export class GetAllUserGamesGetQueryParams extends BaseQueryParams {
  @IsEnum(GamesSortBy)
  sortBy?: GamesSortBy = GamesSortBy.pairCreatedDate;
}
