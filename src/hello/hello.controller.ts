import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HelloService } from './hello.service';

@ApiTags('Hello')
@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @ApiOperation({ summary: 'Get localized hello message' })
  @ApiResponse({
    status: 200,
    description: 'Returns hello message based on locale',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  async getHello(): Promise<string> {
    return this.helloService.getHello();
  }
}
