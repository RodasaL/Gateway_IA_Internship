import { Module } from '@nestjs/common';
import { EnhanceService } from './enhance.service';

@Module({
  providers: [EnhanceService],
  exports: [EnhanceService]
})
export class EnhanceModuleApi {}
