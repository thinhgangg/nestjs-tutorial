import request from 'supertest';
import { COMMENT_BODY_MAX_LENGTH } from '../src/comments/comments.constants';
import { Comment } from '../src/comments/entities/comment.entity';
import { User } from '../src/users/entities/user.entity';
import {
  createFakeAccessToken,
  createFakeArticle,
  createFakeAvatar,
  createFakeComment,
  createFakeFollow,
  createFakeUser,
  resetFactorySequence,
} from './factories/test-data.factory';
import { createTestApp, E2eTestContext } from './helpers/test-app.helper';
import {
  clearTestRedis,
  truncateDatabase,
} from './helpers/test-database.helper';

describe('CommentsController (e2e - C2 coverage)', () => {
  let ctx: E2eTestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await truncateDatabase(ctx.dataSource);
    await clearTestRedis(ctx.redis);
    resetFactorySequence();
  });

  afterAll(async () => {
    if (ctx?.app) {
      await ctx.app.close();
    }
  });

  describe('POST /api/articles/:slug/comments', () => {
    describe('Authentication guard (JwtAuthGuard) conditions', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .send({ comment: { body: 'Unauthorized comment' } })
          .expect(401);

        expect(response.body.message).toBe('Missing access token');
      });

      it('should return 401 when Authorization header does not use Bearer scheme', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', 'Basic dXNlcjpwYXNz')
          .send({ comment: { body: 'Wrong scheme' } })
          .expect(401);

        expect(response.body.message).toBe('Missing access token');
      });

      it('should return 401 when JWT token is malformed', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', 'Bearer not-a-valid-jwt')
          .send({ comment: { body: 'Invalid token' } })
          .expect(401);

        expect(response.body.message).toBe('Invalid or expired access token');
      });

      it('should return 401 when JWT token is expired', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author, {
          expiresIn: -10,
        });

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Expired token' } })
          .expect(401);

        expect(response.body.message).toBe('Invalid or expired access token');
      });

      it('should return 401 when JWT payload is missing jti claim', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author, {
          jti: null,
        });

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'No jti claim' } })
          .expect(401);

        expect(response.body.message).toBe('Invalid or expired access token');
      });

      it('should return 401 when JWT token has been revoked in Redis blacklist', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token, jti } = await createFakeAccessToken(
          ctx.jwtService,
          author,
        );
        await ctx.redisService.setBlacklistToken(jti!, 300);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Revoked token' } })
          .expect(401);

        expect(response.body.message).toBe('Token has been revoked');
      });
    });

    describe('DTO validation (CreateCommentDto) conditions', () => {
      it('should return 400 when comment wrapper object is missing', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({})
          .expect(400);
      });

      it('should return 400 when comment field is not an object', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: 'plain-string' })
          .expect(400);
      });

      it('should return 400 when comment.body is missing', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: {} })
          .expect(400);
      });

      it('should return 400 when comment.body is not a string', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 12345 } })
          .expect(400);
      });

      it('should return 400 when comment.body is empty or whitespace-only', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: '     ' } })
          .expect(400);
      });

      it('should return 400 when comment.body exceeds COMMENT_BODY_MAX_LENGTH', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            comment: { body: 'a'.repeat(COMMENT_BODY_MAX_LENGTH + 1) },
          })
          .expect(400);
      });

      it('should return 201 when comment.body equals exact COMMENT_BODY_MAX_LENGTH boundary', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);
        const maxBody = 'a'.repeat(COMMENT_BODY_MAX_LENGTH);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: maxBody } })
          .expect(201);

        expect(response.body.comment.body).toHaveLength(
          COMMENT_BODY_MAX_LENGTH,
        );
      });
    });

    describe('Business logic & persistence conditions', () => {
      it('should return 404 when target article slug does not exist (en & vi)', async () => {
        const user = await createFakeUser(ctx.dataSource);
        const { token } = await createFakeAccessToken(ctx.jwtService, user);

        const enRes = await request(ctx.app.getHttpServer())
          .post('/api/articles/non-existent-slug/comments')
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Hello' } })
          .expect(404);
        expect(enRes.body.message).toBe('Article not found');

        const viRes = await request(ctx.app.getHttpServer())
          .post('/api/articles/non-existent-slug/comments?lang=vi')
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Xin chào' } })
          .expect(404);
        expect(viRes.body.message).toBe('Không tìm thấy bài viết');
      });

      it('should return 404 when authenticated user no longer exists in database', async () => {
        const articleAuthor = await createFakeUser(ctx.dataSource);
        const deletedUser = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, articleAuthor);
        const { token } = await createFakeAccessToken(
          ctx.jwtService,
          deletedUser,
        );
        await ctx.dataSource.getRepository(User).delete(deletedUser.id);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Ghost user comment' } })
          .expect(404);

        expect(response.body.message).toBe('Profile not found');
      });

      it('should create comment, trim body, strip extra fields, return null image when user has no avatar, and persist in DB', async () => {
        const articleAuthor = await createFakeUser(ctx.dataSource);
        const commenter = await createFakeUser(ctx.dataSource, {
          username: 'commenter_no_avatar',
          bio: 'No avatar bio',
        });
        const article = await createFakeArticle(ctx.dataSource, articleAuthor);
        const { token } = await createFakeAccessToken(
          ctx.jwtService,
          commenter,
        );

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            comment: {
              body: '   Trimmed comment body   ',
              extraUnknownField: 'should-be-stripped',
            },
          })
          .expect(201);

        expect(response.body.comment).toMatchObject({
          body: 'Trimmed comment body',
          author: {
            username: 'commenter_no_avatar',
            bio: 'No avatar bio',
            image: null,
            following: false,
          },
        });
        expect(typeof response.body.comment.id).toBe('number');
        expect(response.body.comment.createdAt).toBeDefined();
        expect(response.body.comment.updatedAt).toBeDefined();

        const saved = await ctx.dataSource
          .getRepository(Comment)
          .findOneBy({ id: response.body.comment.id });
        expect(saved).not.toBeNull();
        expect(saved?.body).toBe('Trimmed comment body');
        expect(saved?.articleId).toBe(article.id);
        expect(saved?.authorId).toBe(commenter.id);
      });

      it('should create comment and include author avatar URL when user has an avatar attachment', async () => {
        const author = await createFakeUser(ctx.dataSource, {
          username: 'author_with_avatar',
        });
        await createFakeAvatar(
          ctx.dataSource,
          author.id,
          '/public/avatars/author-avatar.png',
        );
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const response = await request(ctx.app.getHttpServer())
          .post(`/api/articles/${article.slug}/comments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ comment: { body: 'Comment with avatar' } })
          .expect(201);

        expect(response.body.comment.author).toEqual({
          username: 'author_with_avatar',
          bio: author.bio,
          image: '/public/avatars/author-avatar.png',
          following: false,
        });
      });
    });
  });

  describe('GET /api/articles/:slug/comments', () => {
    it('should return 404 when article slug does not exist', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/articles/unknown-article-slug/comments')
        .expect(404);

      expect(response.body.message).toBe('Article not found');
    });

    it('should return empty comments array when article has no comments', async () => {
      const author = await createFakeUser(ctx.dataSource);
      const article = await createFakeArticle(ctx.dataSource, author);

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .expect(200);

      expect(response.body).toEqual({ comments: [] });
    });

    it('should return comments ordered by createdAt DESC, id DESC with avatars, excluding other articles, and following=false for guest', async () => {
      const authorA = await createFakeUser(ctx.dataSource, {
        username: 'author_a',
      });
      const authorB = await createFakeUser(ctx.dataSource, {
        username: 'author_b',
      });
      await createFakeAvatar(
        ctx.dataSource,
        authorA.id,
        '/public/avatars/a.png',
      );

      const targetArticle = await createFakeArticle(ctx.dataSource, authorA);
      const otherArticle = await createFakeArticle(ctx.dataSource, authorA);

      const olderTime = new Date('2026-01-01T10:00:00.000Z');
      const tiedTime = new Date('2026-01-02T10:00:00.000Z');

      const c1 = await createFakeComment(ctx.dataSource, targetArticle, authorA, {
        body: 'Older comment',
        createdAt: olderTime,
      });
      const c2 = await createFakeComment(ctx.dataSource, targetArticle, authorB, {
        body: 'Tied first inserted',
        createdAt: tiedTime,
      });
      const c3 = await createFakeComment(ctx.dataSource, targetArticle, authorA, {
        body: 'Tied second inserted',
        createdAt: tiedTime,
      });
      await createFakeComment(ctx.dataSource, otherArticle, authorB, {
        body: 'Other article comment',
      });

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${targetArticle.slug}/comments`)
        .expect(200);

      expect(response.body.comments).toHaveLength(3);
      expect(response.body.comments.map((c: { id: number }) => c.id)).toEqual([
        c3.id,
        c2.id,
        c1.id,
      ]);
      expect(response.body.comments[0]).toMatchObject({
        id: c3.id,
        body: 'Tied second inserted',
        author: {
          username: 'author_a',
          image: '/public/avatars/a.png',
          following: false,
        },
      });
      expect(response.body.comments[1]).toMatchObject({
        id: c2.id,
        body: 'Tied first inserted',
        author: {
          username: 'author_b',
          image: null,
          following: false,
        },
      });
    });

    it('should return accurate author.following flags for authenticated user', async () => {
      const viewer = await createFakeUser(ctx.dataSource, {
        username: 'viewer_user',
      });
      const followedAuthor = await createFakeUser(ctx.dataSource, {
        username: 'followed_author',
      });
      const unfollowedAuthor = await createFakeUser(ctx.dataSource, {
        username: 'unfollowed_author',
      });
      await createFakeFollow(ctx.dataSource, viewer.id, followedAuthor.id);

      const article = await createFakeArticle(ctx.dataSource, followedAuthor);
      await createFakeComment(ctx.dataSource, article, followedAuthor, {
        body: 'From followed author',
      });
      await createFakeComment(ctx.dataSource, article, unfollowedAuthor, {
        body: 'From unfollowed author',
      });
      await createFakeComment(ctx.dataSource, article, viewer, {
        body: 'From viewer self',
      });

      const { token } = await createFakeAccessToken(ctx.jwtService, viewer);

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const byUsername = new Map<string, boolean>(
        response.body.comments.map(
          (item: { author: { username: string; following: boolean } }) => [
            item.author.username,
            item.author.following,
          ],
        ),
      );

      expect(byUsername.get('followed_author')).toBe(true);
      expect(byUsername.get('unfollowed_author')).toBe(false);
      expect(byUsername.get('viewer_user')).toBe(false);
    });

    it('should fall back to guest mode (following=false) when OptionalJwtAuthGuard receives invalid token', async () => {
      const viewer = await createFakeUser(ctx.dataSource);
      const author = await createFakeUser(ctx.dataSource);
      await createFakeFollow(ctx.dataSource, viewer.id, author.id);

      const article = await createFakeArticle(ctx.dataSource, author);
      await createFakeComment(ctx.dataSource, article, author, {
        body: 'Comment body',
      });

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(200);

      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].author.following).toBe(false);
    });

    it('should fall back to guest mode (following=false) when OptionalJwtAuthGuard receives token without jti', async () => {
      const viewer = await createFakeUser(ctx.dataSource);
      const author = await createFakeUser(ctx.dataSource);
      await createFakeFollow(ctx.dataSource, viewer.id, author.id);

      const article = await createFakeArticle(ctx.dataSource, author);
      await createFakeComment(ctx.dataSource, article, author, {
        body: 'Comment body',
      });
      const { token } = await createFakeAccessToken(ctx.jwtService, viewer, {
        jti: null,
      });

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].author.following).toBe(false);
    });

    it('should fall back to guest mode (following=false) when OptionalJwtAuthGuard receives revoked token', async () => {
      const viewer = await createFakeUser(ctx.dataSource);
      const author = await createFakeUser(ctx.dataSource);
      await createFakeFollow(ctx.dataSource, viewer.id, author.id);

      const article = await createFakeArticle(ctx.dataSource, author);
      await createFakeComment(ctx.dataSource, article, author, {
        body: 'Comment body',
      });
      const { token, jti } = await createFakeAccessToken(
        ctx.jwtService,
        viewer,
      );
      await ctx.redisService.setBlacklistToken(jti!, 300);

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].author.following).toBe(false);
    });
  });

  describe('DELETE /api/articles/:slug/comments/:id', () => {
    describe('Authentication & param validation conditions', () => {
      it('should return 401 when unauthenticated', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const comment = await createFakeComment(ctx.dataSource, article, author);

        await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
          .expect(401);
      });

      it('should return 401 when token is invalid', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const comment = await createFakeComment(ctx.dataSource, article, author);

        await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });

      it('should return 401 when token is revoked in Redis', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const comment = await createFakeComment(ctx.dataSource, article, author);
        const { token, jti } = await createFakeAccessToken(
          ctx.jwtService,
          author,
        );
        await ctx.redisService.setBlacklistToken(jti!, 300);

        await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      });

      it('should return 400 when comment id param is not an integer (ParseIntPipe)', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/not-a-number`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });
    });

    describe('Business logic, authorization & persistence conditions', () => {
      it('should return 404 when article slug does not exist', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const response = await request(ctx.app.getHttpServer())
          .delete('/api/articles/non-existent-slug/comments/1')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);

        expect(response.body.message).toBe('Article not found');
      });

      it('should return 404 when comment id does not exist (en & vi)', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const enRes = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/99999`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
        expect(enRes.body.message).toBe('Comment not found');

        const viRes = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/99999?lang=vi`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
        expect(viRes.body.message).toBe('Không tìm thấy bình luận');
      });

      it('should return 404 and keep comment intact when comment belongs to a different article', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const articleA = await createFakeArticle(ctx.dataSource, author);
        const articleB = await createFakeArticle(ctx.dataSource, author);
        const commentOnB = await createFakeComment(
          ctx.dataSource,
          articleB,
          author,
        );
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const response = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${articleA.slug}/comments/${commentOnB.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);

        expect(response.body.message).toBe('Comment not found');

        const stillExists = await ctx.dataSource
          .getRepository(Comment)
          .findOneBy({ id: commentOnB.id });
        expect(stillExists).not.toBeNull();
      });

      it('should return 403 and keep comment intact when user is not the comment author', async () => {
        const articleAuthor = await createFakeUser(ctx.dataSource);
        const commentAuthor = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, articleAuthor);
        const comment = await createFakeComment(
          ctx.dataSource,
          article,
          commentAuthor,
        );
        const { token: articleAuthorToken } = await createFakeAccessToken(
          ctx.jwtService,
          articleAuthor,
        );

        const response = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
          .set('Authorization', `Bearer ${articleAuthorToken}`)
          .expect(403);

        expect(response.body.message).toBe(
          'You are not allowed to delete this comment',
        );

        const stillExists = await ctx.dataSource
          .getRepository(Comment)
          .findOneBy({ id: comment.id });
        expect(stillExists).not.toBeNull();
      });

      it('should delete only the target comment and return 200 when current user is the comment author', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const targetComment = await createFakeComment(
          ctx.dataSource,
          article,
          author,
          { body: 'To be deleted' },
        );
        const otherComment = await createFakeComment(
          ctx.dataSource,
          article,
          author,
          { body: 'Should stay' },
        );
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const response = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${targetComment.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Comment deleted successfully',
        });

        const deleted = await ctx.dataSource
          .getRepository(Comment)
          .findOneBy({ id: targetComment.id });
        const remaining = await ctx.dataSource
          .getRepository(Comment)
          .findOneBy({ id: otherComment.id });

        expect(deleted).toBeNull();
        expect(remaining).not.toBeNull();
      });

      it('should return localized Vietnamese success message when deleting with ?lang=vi', async () => {
        const author = await createFakeUser(ctx.dataSource);
        const article = await createFakeArticle(ctx.dataSource, author);
        const comment = await createFakeComment(ctx.dataSource, article, author);
        const { token } = await createFakeAccessToken(ctx.jwtService, author);

        const response = await request(ctx.app.getHttpServer())
          .delete(`/api/articles/${article.slug}/comments/${comment.id}?lang=vi`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toEqual({
          message: 'Xoá bình luận thành công',
        });
      });
    });
  });
});

