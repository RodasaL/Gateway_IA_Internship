import { Module } from '@nestjs/common';
import { CutVideoService } from './cut_video.service';
import { MinioModule } from 'src/minIO/minio.module';

@Module({
  imports: [MinioModule],
  providers: [CutVideoService],
  exports: [CutVideoService]
})
export class CutVideoModule {}
