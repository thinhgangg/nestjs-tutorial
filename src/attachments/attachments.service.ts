import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { I18nContext, I18nService } from 'nestjs-i18n';
import * as path from 'path';
import { Repository } from 'typeorm';
import {
  ALLOWED_IMAGE_TYPES,
  AVATAR_DIR,
  AVATAR_URL_PREFIX,
  MAX_FILE_SIZE,
} from './attachments.constants';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    private readonly i18n: I18nService,
  ) {}

  async saveAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<Attachment> {
    const lang = I18nContext.current()?.lang;

    const isTypeAllowed = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
    if (!isTypeAllowed) {
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

    const uploadDir = path.join(process.cwd(), AVATAR_DIR);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const uniqueFileName = `${randomUUID()}${fileExtension}`;
    const destinationPath = path.join(uploadDir, uniqueFileName);

    fs.writeFileSync(destinationPath, file.buffer);

    const existingAttachment = await this.attachmentsRepository.findOne({
      where: { attachableType: 'User', attachableId: userId },
    });

    if (existingAttachment) {
      this.deletePhysicalFile(existingAttachment.url);

      existingAttachment.url = `${AVATAR_URL_PREFIX}/${uniqueFileName}`;
      existingAttachment.fileName = file.originalname;
      existingAttachment.fileType = file.mimetype;
      existingAttachment.fileSize = file.size;

      return this.attachmentsRepository.save(existingAttachment);
    }

    const newAttachment = this.attachmentsRepository.create({
      id: randomUUID(),
      attachableType: 'User',
      attachableId: userId,
      url: `${AVATAR_URL_PREFIX}/${uniqueFileName}`,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    });

    return this.attachmentsRepository.save(newAttachment);
  }

  async getAvatarUrl(userId: number): Promise<string | null> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { attachableType: 'User', attachableId: userId },
    });
    return attachment ? attachment.url : null;
  }

  private deletePhysicalFile(url: string): void {
    const fileName = path.basename(url);
    const filePath = path.join(process.cwd(), AVATAR_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
}
