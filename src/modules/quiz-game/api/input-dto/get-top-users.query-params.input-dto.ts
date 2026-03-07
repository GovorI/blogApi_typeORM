import {
  BaseQueryParams,
  SortDirection,
} from '../../../../core/dto/base.query-params.input-dto';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TopUsersSortBy {
  avgScores = 'avgScores',
  sumScore = 'sumScore',
  winsCount = 'winsCount',
  lossesCount = 'lossesCount',
}

const DEFAULT_SORT: string[] = ['avgScores desc', 'sumScore desc'];
const ALLOWED_FIELDS = new Set<string>(Object.values(TopUsersSortBy));

export class GetTopUsersQueryParams extends BaseQueryParams {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return DEFAULT_SORT;

    const raw = Array.isArray(value) ? value : [value];

    const result = raw
      .map((v) => String(v).trim())
      .filter(Boolean)
      .map((v) => v.replace(/\s+/, ' ')) // сводим множественные пробелы к одному
      .map((v) => {
        const [field, dir = 'desc'] = v.split(' ');
        const d = dir.toLowerCase() === 'asc' ? 'asc' : 'desc';
        return `${field} ${d}`;
      })
      .filter((token) => {
        const [field] = token.split(' ');
        return ALLOWED_FIELDS.has(field);
      });

    return result.length ? result : DEFAULT_SORT;
  })
  sort: string[] = DEFAULT_SORT;

  getSortTuples(): Array<{ by: TopUsersSortBy; dir: SortDirection }> {
    return this.sort.map((token) => {
      const [by, dir] = token.split(' ');
      return {
        by: by as TopUsersSortBy,
        dir:
          dir.toUpperCase() === 'ASC' ? SortDirection.Asc : SortDirection.Desc,
      };
    });
  }
}
