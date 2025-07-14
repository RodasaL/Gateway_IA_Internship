import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', 
    methods: ['POST'],
  });
  const PORT = 3000;
  const HOST = '0.0.0.0';

  const config = new DocumentBuilder()
    .setTitle('Gateway API')
    .setDescription('API for the Gateway service')
    .setVersion('1.0')
    .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  await app.listen(PORT, HOST);
  console.log(`[GATEWAY] Online http://${HOST}:${PORT}`);
}
bootstrap();
