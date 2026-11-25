import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateCommentData {
  @ApiProperty({ example: 'His name was my name too.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
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

