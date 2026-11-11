import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HelloService } from './hello.service';

@ApiTags('Hello')
@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @ApiOperation({ summary: 'Get localized hello message' })
  @ApiQuery({ name: 'lang', required: false, enum: ['en', 'vi'] })
  @ApiResponse({
    status: 200,
    description: 'Returns hello message based on locale',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.helloService.getHello();
  }
}
