import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { COMMENT_BODY_MAX_LENGTH } from '../comments.constants';

export class CreateCommentData {
  @ApiProperty({
    example: 'His name was my name too.',
    maxLength: COMMENT_BODY_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(COMMENT_BODY_MAX_LENGTH)
  body: string;
}

export class CreateCommentDto {
  @ApiProperty({ type: CreateCommentData })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateCommentData)
  comment: CreateCommentData;
}

