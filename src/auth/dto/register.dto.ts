import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../auth.constants';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(MAX_EMAIL_LENGTH)
  email: string;

  @ApiProperty({ example: 'nguyenvana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_USERNAME_LENGTH)
  username: string;

  @ApiProperty({ example: 'Password@123456', minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(MAX_PASSWORD_LENGTH)
  password: string;
}
