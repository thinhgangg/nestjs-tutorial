import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MAX_FILE_SIZE } from '../attachments/attachments.constants';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('User')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserProfile(req.user.sub);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiOperation({ summary: 'Update current user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  updateCurrentUser(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(jpeg|png|webp)$/i }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.usersService.updateUserProfile(req.user.sub, dto, file);
  }
}
