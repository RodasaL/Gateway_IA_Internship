import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { UploadedFileMeta, LinkFileMeta } from 'src/interfaces/interfaces';

@Injectable()
export class QueuesService {
    constructor(@InjectQueue('image-processing') private imagequeue: Queue,
@InjectQueue('video-processing') private videoqueue: Queue){}

    async addImageToQueue_enhance_api(data: UploadedFileMeta) { 
        await this.imagequeue.add('enhance-api', data);
    }
 
    async addImageToQueue_removebg_api(data: UploadedFileMeta) { 
        await this.imagequeue.add('remove-bg-api', data);
    }
   
    async addVideoToQueue_cut_video_api(data: UploadedFileMeta | LinkFileMeta) {  
        await this.videoqueue.add('cut-video-api', data);
    
}

}
