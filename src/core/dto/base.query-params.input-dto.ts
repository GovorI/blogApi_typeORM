import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, Max, Min } from 'class-validator';

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

//базовый класс для query параметров с пагинацией
//значения по-умолчанию применятся автоматически при настройке глобального ValidationPipe в main.ts
export class BaseQueryParams {
  //для трансформации в number
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  pageNumber: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(50)
  pageSize: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    // Преобразуем значение в верхний регистр перед валидацией
    // чтобы поддерживать оба варианта: 'asc'/'desc' и 'ASC'/'DESC'
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  })
  @IsEnum(SortDirection)
  sortDirection: SortDirection = SortDirection.Desc;

  calculateSkip() {
    return (this.pageNumber - 1) * this.pageSize;
  }
}
