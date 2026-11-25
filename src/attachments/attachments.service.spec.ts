import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from './attachments.service';
import { Attachment } from './entities/attachment.entity';

jest.mock('fs', () => {
  const actualFs = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let attachmentsRepository: Record<string, jest.Mock>;
  let i18nService: Record<string, jest.Mock>;

  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const validWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBP'),
  ]);

  beforeEach(async () => {
    attachmentsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'mock-uuid', ...entity }),
      ),
    };
    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: getRepositoryToken(Attachment),
          useValue: attachmentsRepository,
        },
        {
          provide: I18nService,
          useValue: i18nService,
        },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  describe('validateAvatar', () => {
    it('should pass for valid png file', () => {
      const file = {
        mimetype: 'image/png',
        size: 1024,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).not.toThrow();
    });

    it('should pass for valid jpeg file', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: validJpegBuffer,
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).not.toThrow();
    });

    it('should pass for valid webp file', () => {
      const file = {
        mimetype: 'image/webp',
        size: 1024,
        buffer: validWebpBuffer,
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).not.toThrow();
    });

    it('should throw BadRequestException if mimetype is invalid', () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1024,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if magic bytes do not match image format', () => {
      const file = {
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake png text content'),
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds max size', () => {
      const file = {
        mimetype: 'image/png',
        size: 10 * 1024 * 1024,
        buffer: validPngBuffer,
      } as Express.Multer.File;

      expect(() => service.validateAvatar(file)).toThrow(BadRequestException);
    });
  });

  describe('saveAvatar', () => {
    it('should save file and return attachment record', async () => {
      attachmentsRepository.findOne.mockResolvedValue(null);

      const validFile = {
        mimetype: 'image/png',
        size: 1024,
        originalname: 'avatar.png',
        buffer: validPngBuffer,
      } as Express.Multer.File;

      const result = await service.saveAvatar(1, validFile);

      expect(result.attachableId).toBe(1);
      expect(result.attachableType).toBe('User');
      expect(result.url).toContain('/public/avatars/');
    });

    it('should update existing attachment if already exists', async () => {
      const existing = {
        id: 'old-uuid',
        attachableId: 1,
        attachableType: 'User',
        url: '/public/avatars/old.png',
      };
      attachmentsRepository.findOne.mockResolvedValue(existing);

      const validFile = {
        mimetype: 'image/jpeg',
        size: 2048,
        originalname: 'new-avatar.jpg',
        buffer: validJpegBuffer,
      } as Express.Multer.File;

      const result = await service.saveAvatar(1, validFile);

      expect(result.attachableId).toBe(1);
      expect(attachmentsRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAvatarUrl', () => {
    it('should return url if attachment exists', async () => {
      attachmentsRepository.findOne.mockResolvedValue({
        url: '/public/avatars/avatar.png',
      });

      const url = await service.getAvatarUrl(1);
      expect(url).toBe('/public/avatars/avatar.png');
    });

    it('should return null if attachment does not exist', async () => {
      attachmentsRepository.findOne.mockResolvedValue(null);

      const url = await service.getAvatarUrl(99);
      expect(url).toBeNull();
    });
  });

  describe('getAvatarUrls', () => {
    it('should return empty map without querying when userIds is empty', async () => {
      const map = await service.getAvatarUrls([]);

      expect(map.size).toBe(0);
      expect(attachmentsRepository.find).not.toHaveBeenCalled();
    });

    it('should return a map of userId to avatar url', async () => {
      attachmentsRepository.find.mockResolvedValue([
        { attachableId: 1, url: '/public/avatars/a1.png' },
        { attachableId: 2, url: '/public/avatars/a2.png' },
      ]);

      const map = await service.getAvatarUrls([1, 2, 1]);

      expect(attachmentsRepository.find).toHaveBeenCalledTimes(1);
      expect(map.get(1)).toBe('/public/avatars/a1.png');
      expect(map.get(2)).toBe('/public/avatars/a2.png');
    });
  });
});
