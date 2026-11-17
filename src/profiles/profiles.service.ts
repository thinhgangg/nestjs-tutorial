import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { UsersService } from '../users/users.service';
import { Follow } from './entities/follow.entity';

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

    return {
      profile: {
        username: user.username,
        bio: user.bio,
        image,
        following: isFollowing,
      },
    };
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

    const isAlreadyFollowing = await this.followsRepository.exists({
      where: { followerId: currentUserId, followingId: targetUser.id },
    });

    if (!isAlreadyFollowing) {
      const follow = this.followsRepository.create({
        followerId: currentUserId,
        followingId: targetUser.id,
      });
      await this.followsRepository.save(follow);
    }

    const image = await this.attachmentsService.getAvatarUrl(targetUser.id);

    return {
      profile: {
        username: targetUser.username,
        bio: targetUser.bio,
        image,
        following: true,
      },
    };
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

    return {
      profile: {
        username: targetUser.username,
        bio: targetUser.bio,
        image,
        following: false,
      },
    };
  }
}

