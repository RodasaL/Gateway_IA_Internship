import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


@Injectable()
export class MinioService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger("MINIO_SERVICE");

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_PUBLIC_URL, // URL  MinIO
      credentials: {
        accessKeyId: this.configService.get<string>('MINIO_ROOT_USER') || 'minio',
        secretAccessKey:  this.configService.get<string>('MINIO_ROOT_PASSWORD') || 'minio123',
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(bucket: string, key: string, buffer: Buffer, mime: string) {
    this.logger.log(`Sending "${key}" for the bucket "${bucket}"`);
    try{
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      }),
    );
   // this.logger.log(`URL externa: ${process.env.MINIO_PUBLIC_URL}/${bucket}/${key}`);
    this.logger.log(`✔ Uploaded with success "${bucket}/${key}"`);
  }catch(err){
    this.logger.error('Error uploading to MinIO',err);
    throw new Error('Error uploading to MinIO');
  }
  }

  async downloadFile(bucket: string, key: string): Promise<Readable> {
    this.logger.log(`Downloading "${key}" original from "${bucket}"`);
    try{
    const result = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return result.Body as Readable;
  }catch(err){
    this.logger.error('Error downloading from MinIO',err);
    throw new Error('Error downloading from MinIO');
  }
  }

  async listFiles(bucket: string) {
    const result = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
      }),
    );
    return result.Contents;
  }

  async deleteFile(bucket: string, key: string) {
    try{
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    this.logger.log(`File "${key}" deleted from bucket "${bucket}"`);
  }catch(err){
    this.logger.error('Error deleting file from MinIO', err);
    throw new Error('Error deleting file from MinIO');
  }
}

 
async generatePresignedUrl(bucket: string, key: string, expirySeconds = 600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: expirySeconds });
    this.logger.log(`✔ Presigned URL for "${bucket}/${key}"`);
   // this.logger.log(`Presigned URL: ${url}`);
 
    return url;
  } catch (err) {
    this.logger.error('Error generating presigned URL', err);
    throw new Error('Error generating presigned URL  [MinIO]');
  }
}

async statObject(bucket: string, key: string) {
  await this.s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

}