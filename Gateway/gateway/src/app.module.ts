import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import {EnhanceModuleApi } from './enhance_img/enhance.module';
import { RBackgroundApiModule } from './r_background_api/r_background_api.module';
import { CutVideoModule } from './cut_video/cut_video.module';
import { MinioModule } from './minIO/minio.module';
import { QueuesModule } from './queues/queues.module';
import { ImageProcessorModule } from './processor/image.processor/image.processor.module';
import { VideoProcessorModule } from './processor/video.processor/video.processor.module';
import { BullBoardModule } from './bull-board/bull-board.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [EnhanceModuleApi,RBackgroundApiModule,CutVideoModule,MinioModule, QueuesModule,ImageProcessorModule,VideoProcessorModule, BullBoardModule,ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',}),
  ],
  controllers: [GatewayController],
  providers: [],
})
export class AppModule {}
