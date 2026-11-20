import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
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
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an article' })
  @ApiResponse({ status: 201, description: 'Article created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createArticle(
    @Body() dto: CreateArticleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.createArticle(dto, req.user.sub);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feed of articles from followed users' })
  @ApiResponse({ status: 200, description: 'Feed retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFeed(@Query() query: QueryFeedDto, @Req() req: AuthenticatedRequest) {
    return this.articlesService.getFeed(query, req.user.sub);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get most recent articles globally' })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  listArticles(
    @Query() query: QueryArticlesDto,
    @Req() req: OptionalAuthenticatedRequest,
  ) {
    return this.articlesService.listArticles(query, req.user?.sub);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get an article by slug' })
  @ApiResponse({ status: 200, description: 'Article retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  getArticle(
    @Param('slug') slug: string,
    @Req() req: OptionalAuthenticatedRequest,
  ) {
    return this.articlesService.getArticleBySlug(slug, req.user?.sub);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an article' })
  @ApiResponse({ status: 200, description: 'Article updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  updateArticle(
    @Param('slug') slug: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.updateArticle(slug, dto, req.user.sub);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an article' })
  @ApiResponse({ status: 200, description: 'Article deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  deleteArticle(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.deleteArticle(slug, req.user.sub);
  }

  @Post(':slug/favorite')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Favorite an article' })
  @ApiResponse({ status: 200, description: 'Article favorited successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  favoriteArticle(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.favoriteArticle(slug, req.user.sub);
  }

  @Delete(':slug/favorite')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfavorite an article' })
  @ApiResponse({ status: 200, description: 'Article unfavorited successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  unfavoriteArticle(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.unfavoriteArticle(slug, req.user.sub);
  }
}

