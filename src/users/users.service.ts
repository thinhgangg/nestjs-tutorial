import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { AttachmentsService } from '../attachments/attachments.service';
import { SALT_ROUNDS } from '../auth/auth.constants';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly attachmentsService: AttachmentsService,
    private readonly i18n: I18nService,
  ) {}

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { email } });
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { username } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    const updatedUser = await this.findById(id);
    return updatedUser!;
  }

  async updateUserProfile(
    userId: number,
    dto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const lang = I18nContext.current()?.lang;
    const currentUser = await this.findById(userId);

    if (!currentUser) {
      throw new NotFoundException(
        this.i18n.t('common.auth.unauthorized', { lang }),
      );
    }

    if (dto.email && dto.email !== currentUser.email) {
      const isEmailTaken = await this.existsByEmail(dto.email);
      if (isEmailTaken) {
        throw new ConflictException(
          this.i18n.t('common.auth.email_exists', { lang }),
        );
      }
    }

    if (dto.username && dto.username !== currentUser.username) {
      const isUsernameTaken = await this.existsByUsername(dto.username);
      if (isUsernameTaken) {
        throw new ConflictException(
          this.i18n.t('common.user.username_exists', { lang }),
        );
      }
    }

    const updateData: Partial<User> = {};
    if (dto.email) {
      updateData.email = dto.email;
    }
    if (dto.username) {
      updateData.username = dto.username;
    }
    if (dto.bio !== undefined) {
      updateData.bio = dto.bio;
    }
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    if (Object.keys(updateData).length > 0) {
      await this.usersRepository.update(userId, updateData);
    }

    if (file) {
      await this.attachmentsService.saveAvatar(userId, file);
    }

    const updatedUser = await this.findById(userId);
    const image = await this.attachmentsService.getAvatarUrl(userId);

    return {
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        username: updatedUser!.username,
        bio: updatedUser!.bio,
        image,
      },
    };
  }

  async getUserProfile(userId: number) {
    const lang = I18nContext.current()?.lang;
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(
        this.i18n.t('common.auth.unauthorized', { lang }),
      );
    }

    const image = await this.attachmentsService.getAvatarUrl(userId);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        bio: user.bio,
        image,
      },
    };
  }
}
