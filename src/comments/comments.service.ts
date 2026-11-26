import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { Article } from '../articles/entities/article.entity';
import {
  AuthorProfile,
  ProfilesService,
} from '../profiles/profiles.service';
import { User } from '../users/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly profilesService: ProfilesService,
    private readonly i18n: I18nService,
  ) {}

  async addComment(
    slug: string,
    dto: CreateCommentDto,
    currentUserId: number,
  ) {
    const lang = I18nContext.current()?.lang;
    const article = await this.findArticleBySlug(slug);

    const author = await this.usersRepository.findOne({
      where: { id: currentUserId },
    });
    if (!author) {
      throw new NotFoundException(
        this.i18n.t('common.profile.not_found', { lang }),
      );
    }

    const newComment = this.commentsRepository.create({
      body: dto.comment.body,
      articleId: article.id,
      authorId: currentUserId,
      author,
    });

    const savedComment = await this.commentsRepository.save(newComment);
    const authorProfile = await this.profilesService.buildAuthorProfile(
      author,
      currentUserId,
    );

    return {
      comment: this.formatCommentPayload(savedComment, authorProfile),
    };
  }

  async getComments(slug: string, currentUserId?: number) {
    const article = await this.findArticleBySlug(slug);

    const comments = await this.commentsRepository.find({
      where: { articleId: article.id },
      relations: { author: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    if (comments.length === 0) {
      return { comments: [] };
    }

    const authorProfiles = await this.profilesService.buildAuthorProfiles(
      comments.map((comment) => comment.author),
      currentUserId,
    );

    return {
      comments: comments.map((comment) =>
        this.formatCommentPayload(
          comment,
          authorProfiles.get(comment.authorId)!,
        ),
      ),
    };
  }

  async deleteComment(slug: string, commentId: number, currentUserId: number) {
    const lang = I18nContext.current()?.lang;
    const article = await this.findArticleBySlug(slug);

    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, articleId: article.id },
    });

    if (!comment) {
      throw new NotFoundException(
        this.i18n.t('common.comment.not_found', { lang }),
      );
    }

    if (comment.authorId !== currentUserId) {
      throw new ForbiddenException(
        this.i18n.t('common.comment.forbidden', { lang }),
      );
    }

    await this.commentsRepository.remove(comment);
    return {
      message: this.i18n.t('common.comment.deleted', { lang }),
    };
  }

  private async findArticleBySlug(slug: string): Promise<Article> {
    const lang = I18nContext.current()?.lang;
    const article = await this.articlesRepository.findOne({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException(
        this.i18n.t('common.article.not_found', { lang }),
      );
    }

    return article;
  }

  private formatCommentPayload(comment: Comment, author: AuthorProfile) {
    return {
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.body,
      author,
    };
  }
}

