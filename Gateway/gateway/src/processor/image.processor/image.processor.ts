import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { EnhanceService } from 'src/enhance_img/enhance.service';
import { RBackgroundApiService } from 'src/r_background_api/r_background_api.service';
import { MinioService } from 'src/minIO/minio.service';
import { Readable } from 'stream';

@Processor('image-processing')
export class ImageProcessor {
  constructor(
    private readonly enhanceService: EnhanceService,
    private readonly rBackgroundApiService: RBackgroundApiService,
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
      console.error('[IMAGE PROCESSOR] Error building file from MinIO:', error);
      throw new Error(`[IMAGE PROCESSOR] Error building file from MinIO: ${error.message}`);
    }
  }

  private async uploadToMinioBuckets(file: Express.Multer.File, key: string, result: Buffer) {
    //console.log('MINIO EXEC');
    try{
    await this.minioService.uploadFile('processed', key, result, file.mimetype);
    } catch (error) {
      console.error('[IMAGE PROCESSOR] Error uploading to MinIO:', error);
      throw new Error(`[IMAGE PROCESSOR] Error uploading to MinIO: ${error.message}`);
    }
  }


  @Process('remove-bg-api')
  async handleRemoveBgApi(job: Job) {
    console.log('REMOVE BG API IMAGE:[IMAGE PROCESSOR]');
    const { key, mimetype } = job.data;
    try{
    const file = await this.buildFileFromMinio(key, mimetype);
    const result = await this.rBackgroundApiService.removeback(file.buffer, file.originalname, file.size);
    await this.uploadToMinioBuckets(file, key, result);
    } catch (error) {
      console.error('[IMAGE PROCESSOR] Error processing remove-bg-api job:', error);
      await this.minioService.uploadFile('status', `${key}.error`, Buffer.from('Error processing remove-bg-api job'),'text/plain');
      throw new Error(
        `[IMAGE PROCESSOR] Error processing remove-bg-api job: ${error.message}`  
    );
    }
  }

  @Process('enhance-api')
  async handleEnhance(job: Job) {
    console.log('ENHANCE IMAGE API:[IMAGE PROCESSOR]');
    const { key, mimetype } = job.data;
    try{
    const file = await this.buildFileFromMinio(key, mimetype);
    const result = await this.enhanceService.enhanceImageFlow(file.buffer, file.originalname, file.size);
    await this.uploadToMinioBuckets(file, key, result);
    }catch (error) {
      console.error('[IMAGE PROCESSOR] Error processing enhance-api job:', error);
      await this.minioService.uploadFile('status', `${key}.error`, Buffer.from('Error processing enhance-api job'),'text/plain');
      throw new Error(
        `[IMAGE PROCESSOR] Error processing enhance-api job: ${error.message}`
    );
    }
  }
}