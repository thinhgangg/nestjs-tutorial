import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Article } from '../../src/articles/entities/article.entity';
import { ATTACHABLE_TYPE_USER } from '../../src/attachments/attachments.constants';
import { Attachment } from '../../src/attachments/entities/attachment.entity';
import { Comment } from '../../src/comments/entities/comment.entity';
import { Follow } from '../../src/profiles/entities/follow.entity';
import { User } from '../../src/users/entities/user.entity';

let sequence = 0;

function nextSeq(): number {
  sequence += 1;
  return sequence;
}

export function resetFactorySequence(): void {
  sequence = 0;
}

export async function createFakeUser(
  dataSource: DataSource,
  overrides: Partial<Pick<User, 'email' | 'username' | 'password' | 'bio'>> = {},
): Promise<User> {
  const seq = nextSeq();
  const userRepo = dataSource.getRepository(User);
  const hashedPassword = await bcrypt.hash(
    overrides.password ?? 'TestPassword@123',
    4,
  );

  const user = userRepo.create({
    email: overrides.email ?? `user${seq}@example.com`,
    username: overrides.username ?? `user_${seq}`,
    password: hashedPassword,
    bio: overrides.bio !== undefined ? overrides.bio : `Bio for user ${seq}`,
  });

  return userRepo.save(user);
}

export async function createFakeAccessToken(
  jwtService: JwtService,
  user: Pick<User, 'id' | 'email'>,
  options: { jti?: string | null; expiresIn?: number } = {},
): Promise<{ token: string; jti: string | null }> {
  const jti = options.jti === undefined ? randomUUID() : options.jti;
  const payload: Record<string, unknown> = {
    sub: user.id,
    email: user.email,
  };
  if (jti !== null) {
    payload.jti = jti;
  }

  const token = await jwtService.signAsync(payload, {
    expiresIn: options.expiresIn ?? 3600,
  });

  return { token, jti };
}

export async function createFakeAvatar(
  dataSource: DataSource,
  userId: number,
  url?: string,
): Promise<Attachment> {
  const seq = nextSeq();
  const attachmentRepo = dataSource.getRepository(Attachment);
  const attachment = attachmentRepo.create({
    id: randomUUID(),
    attachableType: ATTACHABLE_TYPE_USER,
    attachableId: userId,
    url: url ?? `/public/avatars/fake-avatar-${seq}.png`,
    fileName: `avatar-${seq}.png`,
    fileType: 'image/png',
    fileSize: 2048,
  });

  return attachmentRepo.save(attachment);
}

export async function createFakeFollow(
  dataSource: DataSource,
  followerId: number,
  followingId: number,
): Promise<Follow> {
  const followRepo = dataSource.getRepository(Follow);
  const follow = followRepo.create({
    followerId,
    followingId,
  });

  return followRepo.save(follow);
}

export async function createFakeArticle(
  dataSource: DataSource,
  author: User,
  overrides: Partial<
    Pick<Article, 'slug' | 'title' | 'description' | 'body'>
  > = {},
): Promise<Article> {
  const seq = nextSeq();
  const articleRepo = dataSource.getRepository(Article);
  const article = articleRepo.create({
    slug: overrides.slug ?? `fake-article-${seq}-${randomUUID().slice(0, 8)}`,
    title: overrides.title ?? `Fake Article Title ${seq}`,
    description: overrides.description ?? `Fake article description ${seq}`,
    body: overrides.body ?? `Fake article body content ${seq}`,
    authorId: author.id,
    author,
    tags: [],
  });

  return articleRepo.save(article);
}

export async function createFakeComment(
  dataSource: DataSource,
  article: Article,
  author: User,
  overrides: Partial<Pick<Comment, 'body' | 'createdAt'>> = {},
): Promise<Comment> {
  const seq = nextSeq();
  const commentRepo = dataSource.getRepository(Comment);
  const comment = commentRepo.create({
    body: overrides.body ?? `Fake comment body ${seq}`,
    articleId: article.id,
    article,
    authorId: author.id,
    author,
    ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
  });

  const saved = await commentRepo.save(comment);

  if (overrides.createdAt) {
    await commentRepo.update(saved.id, { createdAt: overrides.createdAt });
    saved.createdAt = overrides.createdAt;
  }

  return saved;
}

