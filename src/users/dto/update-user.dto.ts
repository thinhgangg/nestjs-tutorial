import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../../auth/auth.constants';
import { MAX_BIO_LENGTH } from '../users.constants';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email?: string;

  @ApiPropertyOptional({ example: 'newusername' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_USERNAME_LENGTH)
  username?: string;

  @ApiPropertyOptional({
    example: 'NewPassword@123',
    minLength: MIN_PASSWORD_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password?: string;

  @ApiPropertyOptional({ example: 'My updated bio' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_BIO_LENGTH)
  bio?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file (JPEG, PNG, WebP <= 5MB)',
  })
  @IsOptional()
  avatar?: Express.Multer.File;
}

