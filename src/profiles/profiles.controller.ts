import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedRequest,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  type OptionalAuthenticatedRequest,
  OptionalJwtAuthGuard,
} from '../auth/guards/optional-jwt-auth.guard';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get profile of a user' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getProfile(
    @Param('username') username: string,
    @Req() req: OptionalAuthenticatedRequest,
  ) {
    return this.profilesService.getProfile(username, req.user?.sub);
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 200, description: 'Followed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  followUser(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.profilesService.followUser(username, req.user.sub);
  }

  @Delete(':username/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 200, description: 'Unfollowed successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unfollowUser(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.profilesService.unfollowUser(username, req.user.sub);
  }
}

