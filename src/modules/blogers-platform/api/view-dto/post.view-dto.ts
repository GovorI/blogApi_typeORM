import { NewestLikeInfo } from '../../domain/post-entity';

// Определяем структуру для лайков, которую будем использовать
class ExtendedLikesInfo {
  dislikesCount: number;
  likesCount: number;
  myStatus: 'Like' | 'Dislike' | 'None';
  newestLikes: NewestLikeInfo[];
}

// СОЗДАЕМ КОНТРАКТ: это простое описание объекта с данными, которые нужны для маппинга.
// Это больше не доменная сущность, а просто "сырые данные" для отображения.
export type PostViewModelData = {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: ExtendedLikesInfo;
};

export class PostViewDto {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  createdAt: Date;
  extendedLikesInfo: ExtendedLikesInfo;

  // ИЗМЕНЯЕМ СИГНАТУРУ: теперь метод принимает не доменную сущность, а объект, соответствующий нашему контракту.
  static mapToView(data: PostViewModelData): PostViewDto {
    const dto = new PostViewDto();

    dto.id = data.id;
    dto.title = data.title;
    dto.shortDescription = data.shortDescription;
    dto.content = data.content;
    dto.blogId = data.blogId;
    dto.blogName = data.blogName;
    dto.createdAt = data.createdAt;
    // Логика стала проще, так как `data` уже содержит `extendedLikesInfo` в нужном формате.
    dto.extendedLikesInfo = data.extendedLikesInfo;

    return dto;
  }
}
