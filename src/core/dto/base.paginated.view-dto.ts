//класс view модели для запросов за списком с пагинацией
import { Expose, Type } from 'class-transformer';

export abstract class PaginatedViewDto<T> {
  @Expose()
  @Type(() => Number)
  pagesCount: number;

  @Expose()
  @Type(() => Number)
  page: number;

  @Expose()
  @Type(() => Number)
  pageSize: number;

  @Expose()
  @Type(() => Number)
  totalCount: number;

  @Expose()
  abstract items: T;

  //статический метод-утилита для мапинга
  public static mapToView<T>(data: {
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    items: T;
  }): PaginatedViewDto<T> {
    return {
      pagesCount: Math.ceil(data.totalCount / data.pageSize),
      page: data.pageNumber,
      pageSize: data.pageSize,
      totalCount: data.totalCount,
      items: data.items,
    };
  }
}
