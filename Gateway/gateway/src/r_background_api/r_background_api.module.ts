import { Module } from '@nestjs/common';
import { RBackgroundApiService } from './r_background_api.service';

@Module({
  providers: [RBackgroundApiService],
  exports: [RBackgroundApiService]
})
export class RBackgroundApiModule {}
