import { Module } from '@nestjs/common';
import { BullBoardService } from './bull-board.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue(
      {name: 'image-processing'},
      {name: 'video-processing'},
),
  ],
  providers: [BullBoardService],
  exports: [BullBoardService]

})
export class BullBoardModule {}
