import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { I18nContext, I18nService } from 'nestjs-i18n';
import * as path from 'path';
import { In, Repository } from 'typeorm';
import {
  ALLOWED_IMAGE_TYPES,
  ATTACHABLE_TYPE_USER,
  AVATAR_DIR,
  AVATAR_URL_PREFIX,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSION,
} from './attachments.constants';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    private readonly i18n: I18nService,
  ) {}

  validateAvatar(file: Express.Multer.File): void {
    const lang = I18nContext.current()?.lang;

    const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    const isMagicBytesValid = this.checkImageMagicBytes(file.buffer);
    if (!isTypeAllowed || !isMagicBytesValid) {
      throw new BadRequestException(
        this.i18n.t('common.attachment.invalid_type', { lang }),
      );
    }

    const isSizeAllowed = file.size <= MAX_FILE_SIZE;
    if (!isSizeAllowed) {
      throw new BadRequestException(
        this.i18n.t('common.attachment.file_too_large', { lang }),
      );
    }
  }

  async saveAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<Attachment> {
    this.validateAvatar(file);

    const uploadDir = path.join(process.cwd(), AVATAR_DIR);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = MIME_TO_EXTENSION[file.mimetype] || '.png';
    const uniqueFileName = `${randomUUID()}${fileExtension}`;
    const destinationPath = path.join(uploadDir, uniqueFileName);

    fs.writeFileSync(destinationPath, file.buffer);

    const existingAttachment = await this.attachmentsRepository.findOne({
      where: { attachableType: ATTACHABLE_TYPE_USER, attachableId: userId },
    });

    const oldUrl = existingAttachment?.url;

    try {
      let savedAttachment: Attachment;
      if (existingAttachment) {
        existingAttachment.url = `${AVATAR_URL_PREFIX}/${uniqueFileName}`;
        existingAttachment.fileName = file.originalname;
        existingAttachment.fileType = file.mimetype;
        existingAttachment.fileSize = file.size;

        savedAttachment =
          await this.attachmentsRepository.save(existingAttachment);
      } else {
        const newAttachment = this.attachmentsRepository.create({
          id: randomUUID(),
          attachableType: ATTACHABLE_TYPE_USER,
          attachableId: userId,
          url: `${AVATAR_URL_PREFIX}/${uniqueFileName}`,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
        });

        savedAttachment = await this.attachmentsRepository.save(newAttachment);
      }

      if (oldUrl && oldUrl !== savedAttachment.url) {
        this.deletePhysicalFile(oldUrl);
      }

      return savedAttachment;
    } catch {
      this.deletePhysicalFile(`${AVATAR_URL_PREFIX}/${uniqueFileName}`);
      throw new InternalServerErrorException(
        'Failed to save avatar attachment',
      );
    }
  }

  async getAvatarUrl(userId: number): Promise<string | null> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { attachableType: ATTACHABLE_TYPE_USER, attachableId: userId },
    });
    return attachment ? attachment.url : null;
  }

  async getAvatarUrls(userIds: number[]): Promise<Map<number, string>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const uniqueUserIds = [...new Set(userIds)];
    const attachments = await this.attachmentsRepository.find({
      where: {
        attachableType: ATTACHABLE_TYPE_USER,
        attachableId: In(uniqueUserIds),
      },
    });

    return new Map(
      attachments.map((attachment) => [
        attachment.attachableId,
        attachment.url,
      ]),
    );
  }

  private checkImageMagicBytes(buffer?: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }
    // WebP: RIFF ... WEBP
    const MIN_WEBP_LENGTH = 12;
    if (
      buffer.length >= MIN_WEBP_LENGTH &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return true;
    }
    return false;
  }

  private deletePhysicalFile(url: string): void {
    const fileName = path.basename(url);
    const filePath = path.join(process.cwd(), AVATAR_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
}
