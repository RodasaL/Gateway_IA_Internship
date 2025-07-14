// bull-board.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as express from 'express';

@Injectable()
export class BullBoardService implements OnModuleInit {
  constructor(
    @InjectQueue('image-processing') private imageQueue: Queue,
    @InjectQueue('video-processing') private videoQueue: Queue,
  ) {}

  onModuleInit() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        new (require('@bull-board/api/bullAdapter').BullAdapter)(this.imageQueue),
        new (require('@bull-board/api/bullAdapter').BullAdapter)(this.videoQueue),
      ],
      serverAdapter,
    });

    const app = express();
    app.use('/admin/queues', serverAdapter.getRouter());

    app.listen(3001, () => {
      console.log('🚀 Bull Board online: http://localhost:3001/admin/queues');
    });
  }
}
