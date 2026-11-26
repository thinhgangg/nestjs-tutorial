import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('article_favorites')
export class ArticleFavorite {
  @PrimaryColumn({ name: 'article_id' })
  articleId: number;

  @PrimaryColumn({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

