import { Module } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'redis',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'image-processing',
    },
  {
    name: 'video-processing',
  }),
  ],
  providers: [QueuesService],
  exports: [QueuesService]
})
export class QueuesModule {}
