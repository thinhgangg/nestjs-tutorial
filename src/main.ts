import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const SWAGGER_PATH = 'api/docs';

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS Tutorial API')
    .setDescription('NestJS Training Guideline API documentation')
    .setVersion('1.0')
    .addBearerAuth() // Chuẩn bị sẵn cho xác thực JWT ở PR 2
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(
    `📑 Swagger Documentation available at: http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
