import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CutVideoService } from 'src/cut_video/cut_video.service';
import { MinioService } from 'src/minIO/minio.service';
import { Readable } from 'stream';

@Processor('video-processing')
export class VideoProcessor {
  constructor(
    private readonly CutVideoService: CutVideoService,
    private readonly minioService: MinioService,
  ) {}

  private async buildFileFromMinio(key: string, mimetype: string): Promise<Express.Multer.File> {
    const stream = await this.minioService.downloadFile('original', key);
    const chunks: Buffer[] = [];
    try{
    for await (const chunk of stream as Readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    return {
      buffer,
      mimetype,
      originalname: key,
      size: buffer.length,
    } as Express.Multer.File;
  } catch (error) {
    console.error('[VIDEO PROCESSOR] Error building file from MinIO:', error);
    throw new Error(`[VIDEO PROCESSOR] Error building file from MinIO: ${error.message}`);  
  
  }
}

  private async uploadToMinioBuckets(key: string, result: Buffer, mimetype: string) {
    try{
    await this.minioService.uploadFile('processed', key, result, mimetype);
    } catch (error) {
      console.error('[VIDEO PROCESSOR] Error uploading to MinIO:', error);
      throw new Error(`[VIDEO PROCESSOR] Error uploading to MinIO: ${error.message}`);
    }
  }

    
  private detectVideoType(url: string): number {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 2;
    if (url.includes('drive.google.com')) return 3;
    if (url.includes('vimeo.com')) return 4;
    if (url.includes('streamyard.com')) return 5;
    if (url.includes('tiktok.com')) return 6;
    if (url.includes('twitter.com')) return 7;
    if (url.includes('rumble.com')) return 8;
    if (url.includes('twitch.tv')) return 9;
    if (url.includes('loom.com')) return 10;
    if (url.includes('facebook.com')) return 11;
    if (url.includes('linkedin.com')) return 12;
    return 1;
  }

  @Process('cut-video-api')
  async cutvideo_api(job: Job) {
    let {
      key,
      mimetype,
      link,
    } = job.data;
    try{
    let videoUrl: string;
    let videoType: number;
    let ext: string | undefined;

    if (link) {
      console.log("[VIDEO PROCESSOR] Cutting video API [LINK]");
      videoUrl = link;
      videoType = this.detectVideoType(link);
      ext = videoType === 1 ? 'mp4' : undefined;
      mimetype = 'video/mp4'; // Default mimetype for video
  }else{
    console.log("[VIDEO PROCESSOR] Cutting video API [FILE]");
    if (!key || !mimetype) {
      console.error("[VIDEO PROCESSOR] Key or mimetype is missing");
      return;
    }
      videoUrl = await this.minioService.generatePresignedUrl('original', key);
      console.log("[VIDEO PROCESSOR] MINIO Presigned URL:", videoUrl);
      videoType = 1;
      ext = 'mp4';

    
}
    const payload_api: any = {
      lang: 'en', //para ja a api so funciona com videos em ingles
      preferLength: [2,3], //define o tamanho dos videos entre 30s e 90s
      videoUrl,
      videoType,
      maxClipNumber: 3, //maximo de clips a devolver
      subtitleSwitch: 0, //0 para sem legendas, 1 para legendas
      headlineSwitch: 0, //0 para sem headline, 1 para headline
      projectName: key,
      };
      if (ext) payload_api.ext = ext; //se o video for Type 1, adiciona a extensao ao payload
     
      const  projectId  = await this.CutVideoService.sendVideo_api(payload_api);//returns pooling ID
      console.log(`[VIDEO PROCESSOR] Projeto Vizard created with ID: ${projectId}`);

      await this.CutVideoService.pollVizardUntilReady(projectId, key);
}catch(err){
  console.error("[VIDEO PROCESSOR] Error processing video at the API", err);
  await this.minioService.uploadFile('status', `${key}.error`, Buffer.from('Error processing video at the API'), 'text/plain');  
}
  }
}

