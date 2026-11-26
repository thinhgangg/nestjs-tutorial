import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';

export interface AuthorUser {
  id: number;
  username: string;
  bio: string | null;
}

export interface AuthorProfile {
  username: string;
  bio: string | null;
  image: string | null;
  following: boolean;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    private readonly usersService: UsersService,
    private readonly attachmentsService: AttachmentsService,
    private readonly i18n: I18nService,
  ) {}

  async getProfile(username: string, currentUserId?: number) {
    const lang = I18nContext.current()?.lang;
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('common.profile.not_found', { lang }),
      );
    }

    let isFollowing = false;
    if (currentUserId) {
      isFollowing = await this.followsRepository.exists({
        where: { followerId: currentUserId, followingId: user.id },
      });
    }

    const image = await this.attachmentsService.getAvatarUrl(user.id);
    return this.buildProfileResponse(user, image, isFollowing);
  }

  async followUser(username: string, currentUserId: number) {
    const lang = I18nContext.current()?.lang;
    const targetUser = await this.usersService.findByUsername(username);

    if (!targetUser) {
      throw new NotFoundException(
        this.i18n.t('common.profile.not_found', { lang }),
      );
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        this.i18n.t('common.profile.cannot_follow_self', { lang }),
      );
    }

    await this.followsRepository
      .createQueryBuilder()
      .insert()
      .into(Follow)
      .values({
        followerId: currentUserId,
        followingId: targetUser.id,
      })
      .orIgnore()
      .execute();

    const image = await this.attachmentsService.getAvatarUrl(targetUser.id);
    return this.buildProfileResponse(targetUser, image, true);
  }

  async unfollowUser(username: string, currentUserId: number) {
    const lang = I18nContext.current()?.lang;
    const targetUser = await this.usersService.findByUsername(username);

    if (!targetUser) {
      throw new NotFoundException(
        this.i18n.t('common.profile.not_found', { lang }),
      );
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        this.i18n.t('common.profile.cannot_unfollow_self', { lang }),
      );
    }

    await this.followsRepository.delete({
      followerId: currentUserId,
      followingId: targetUser.id,
    });

    const image = await this.attachmentsService.getAvatarUrl(targetUser.id);
    return this.buildProfileResponse(targetUser, image, false);
  }

  async buildAuthorProfile(
    author: AuthorUser,
    currentUserId?: number,
  ): Promise<AuthorProfile> {
    const [isFollowing, image] = await Promise.all([
      currentUserId && currentUserId !== author.id
        ? this.followsRepository.exists({
            where: { followerId: currentUserId, followingId: author.id },
          })
        : Promise.resolve(false),
      this.attachmentsService.getAvatarUrl(author.id),
    ]);

    return this.formatAuthorProfile(author, image, isFollowing);
  }

  async buildAuthorProfiles(
    authors: AuthorUser[],
    currentUserId?: number,
  ): Promise<Map<number, AuthorProfile>> {
    if (authors.length === 0) {
      return new Map();
    }

    const uniqueAuthors = new Map<number, AuthorUser>();
    for (const author of authors) {
      uniqueAuthors.set(author.id, author);
    }
    const authorIds = [...uniqueAuthors.keys()];

    const [userFollows, avatarUrlMap] = await Promise.all([
      currentUserId
        ? this.followsRepository.find({
            select: { followingId: true },
            where: {
              followerId: currentUserId,
              followingId: In(authorIds),
            },
          })
        : Promise.resolve([]),
      this.attachmentsService.getAvatarUrls(authorIds),
    ]);

    const followingAuthorIds = new Set(
      userFollows.map((follow) => follow.followingId),
    );

    const profileMap = new Map<number, AuthorProfile>();
    for (const [authorId, author] of uniqueAuthors) {
      profileMap.set(
        authorId,
        this.formatAuthorProfile(
          author,
          avatarUrlMap.get(authorId) ?? null,
          followingAuthorIds.has(authorId),
        ),
      );
    }

    return profileMap;
  }

  private formatAuthorProfile(
    user: { username: string; bio: string | null },
    image: string | null,
    isFollowing: boolean,
  ): AuthorProfile {
    return {
      username: user.username,
      bio: user.bio,
      image,
      following: isFollowing,
    };
  }

  private buildProfileResponse(
    user: { username: string; bio: string | null },
    image: string | null,
    isFollowing: boolean,
  ) {
    return {
      profile: this.formatAuthorProfile(user, image, isFollowing),
    };
  }
}
