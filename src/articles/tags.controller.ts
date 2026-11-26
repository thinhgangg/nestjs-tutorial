import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Get tags list' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  getTags() {
    return this.articlesService.getTags();
  }
}

