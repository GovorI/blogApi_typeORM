import { NewestLikeInfo } from '../../domain/post-entity';
import { LikeStatuses } from '../../dto/like-status.dto';

/**
 * Структура данных для информации о лайках поста
 */
export interface ExtendedLikesInfo {
  dislikesCount: number;
  likesCount: number;
  myStatus: LikeStatuses;
  newestLikes: NewestLikeInfo[];
}

/**
 * DTO для представления поста в API
 * QueryBuilder должен возвращать данные с алиасами, совпадающими с этими полями
 */
export class PostViewDto {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: ExtendedLikesInfo;
}
