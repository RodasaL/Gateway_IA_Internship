import { Module } from '@nestjs/common';
import { ImageProcessor } from './image.processor';
import { BullModule } from '@nestjs/bull';
import { EnhanceModuleApi } from 'src/enhance_img/enhance.module';
import { RBackgroundApiModule } from 'src/r_background_api/r_background_api.module';
import { MinioModule } from 'src/minIO/minio.module';

@Module({
    imports: [ 
        BullModule.registerQueue({
            name: 'image-processing',
        }),
        EnhanceModuleApi,
        RBackgroundApiModule,
        MinioModule,
    ],
    providers: [ImageProcessor],
})
export class ImageProcessorModule {}
