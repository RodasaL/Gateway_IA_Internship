import { Module } from '@nestjs/common';
import { VideoProcessor } from './video.processor';
import { BullModule } from '@nestjs/bull';
import { CutVideoModule } from 'src/cut_video/cut_video.module';
import { MinioModule } from 'src/minIO/minio.module';

@Module({imports: [ 
        BullModule.registerQueue({
            name: 'video-processing',
        }),
        CutVideoModule,
        MinioModule,
    ],
    providers: [VideoProcessor],
})
export class VideoProcessorModule {}
