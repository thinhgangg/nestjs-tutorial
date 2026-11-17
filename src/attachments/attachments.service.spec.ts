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

  beforeEach(async () => {
    attachmentsRepository = {
      findOne: jest.fn(),
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

  it('saveAvatar - should throw BadRequestException if mimetype is invalid', async () => {
    const invalidFile = {
      mimetype: 'application/pdf',
      size: 1024,
      originalname: 'file.pdf',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.saveAvatar(1, invalidFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('saveAvatar - should throw BadRequestException if file exceeds max size', async () => {
    const largeFile = {
      mimetype: 'image/jpeg',
      size: 10 * 1024 * 1024,
      originalname: 'large.jpg',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.saveAvatar(1, largeFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('saveAvatar - should save file and return attachment record', async () => {
    attachmentsRepository.findOne.mockResolvedValue(null);

    const validFile = {
      mimetype: 'image/png',
      size: 1024,
      originalname: 'avatar.png',
      buffer: Buffer.from('image content'),
    } as Express.Multer.File;

    const result = await service.saveAvatar(1, validFile);

    expect(result.attachableId).toBe(1);
    expect(result.attachableType).toBe('User');
    expect(result.url).toContain('/public/avatars/');
  });

  it('getAvatarUrl - should return url if attachment exists', async () => {
    attachmentsRepository.findOne.mockResolvedValue({
      url: '/public/avatars/avatar.png',
    });

    const url = await service.getAvatarUrl(1);
    expect(url).toBe('/public/avatars/avatar.png');
  });

  it('getAvatarUrl - should return null if attachment does not exist', async () => {
    attachmentsRepository.findOne.mockResolvedValue(null);

    const url = await service.getAvatarUrl(99);
    expect(url).toBeNull();
  });
});
