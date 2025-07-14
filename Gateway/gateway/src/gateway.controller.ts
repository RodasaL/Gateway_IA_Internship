import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { QueuesService } from './queues/queues.service';
import { MinioService } from './minIO/minio.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LinkFileMeta, UploadedFileMeta } from './interfaces/interfaces';


@ApiTags('Gateway')
@Controller()
export class GatewayController {
  constructor(
    private readonly QueuesService: QueuesService,
    private readonly minioService: MinioService,
    private configService: ConfigService,
  ) {}

  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Process a file or link with a specific "model_IA" ' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to be processed (optional)',
        },
        link: {
          type: 'string',
          description: 'Link to be processed (optional)',
        },
        model_IA: {
          type: 'string',
          enum: ['1', '2', '3'],
          description:
            'Model IA to be used for processing. 1 - Enhance Img API, 2 - Remove Background API, 3 - Cut Video API',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'File sent to processment' })
  @ApiResponse({
    status: 403,
    description: 'Invalid model_IA or missing file/link',
  })
  @ApiResponse({ status: 500, description: 'Error processing' })
  async processFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('model_IA') modelIA: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    let key = uuidv4();
    if(modelIA == '1' || modelIA == '2'){
      key = key + '.jpg';
    }else if(modelIA == '3'){
      key = key + '.mp4';
    }
    if (file){
      await this.minioService.uploadFile('original', key, file.buffer, file.mimetype);
      console.log(`[GATEWAY] /process received file=${file.originalname}`);
      //Sending to MinIO before enqueuing
      //It's necessary for the worker to access the file and not break the bulls [Memory Leak]
    }
    if(body.link){
      console.log(`[GATEWAY] /process received link=${body.link}`);
    }
    console.log(`[GATEWAY] /process received model_IA=${modelIA}`);
    
    try {
      
      const fileMeta = file ? {
        key,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      } : body.link ? {key, link: body.link } : null;
      if (!fileMeta) { return res.status(403).send({ error: '[GATEWAY] You need to send a file or a link.' }); }

      switch (modelIA) {
        case '1':
          if ('mimetype' in fileMeta) {
            await this.QueuesService.addImageToQueue_enhance_api(fileMeta as UploadedFileMeta);
          } else {
            return res.status(400).send({ error: 'Ficheiro obrigatório para enhance' });
          }
        break;

        case '2':
          if ('mimetype' in fileMeta) {
            await this.QueuesService.addImageToQueue_removebg_api(fileMeta as UploadedFileMeta);
          } else {
            return res.status(400).send({ error: 'Ficheiro obrigatório para removebg' });
         }
        break;

      case '3':
        await this.QueuesService.addVideoToQueue_cut_video_api(fileMeta as LinkFileMeta);
        break;

      default:
        return res.status(400).send({ error: 'model_IA inválido' });
    }

    
      // Enqueue the file for processing
      //File sent to processment
      res.send({ message: '[GATEWAY] File sent to processment',key: key});
    } catch (error) {
      console.error('[GATEWAY] Error /process:', error);
      res.status(500).send({ error: '[GATEWAY] Error processing file' });
    }
  }


//Deploy 
//Secure demonstration with ngrok or any other tunneling service
//Remember to change the minIO endpoint to the public one and the buckets privacy to private (optional)
 @Get('/status/:key')
@ApiOperation({ summary: 'Check the status of an image processing job' })
@ApiParam({ name: 'key', required: true, description: 'The unique key of the image processing job' })
async checkImageStatus(@Param('key') key: string) {
  console.log(`[STATUS] Long polling para imagem [${key}]`);

  const timeout = 35 * 60 * 1000; // 35 minutos
  const interval = 5000; // 5 segundos
  const start = Date.now();

  while (Date.now() - start < timeout) {
    // Verifica se falhou
    try {
      await this.minioService.statObject('status', `${key}.error`);
      return { status: 'error', message: 'O processamento falhou.' };
    } catch (_) {
      // continua
    }

    // Verifica se foi processado
    try {
      await this.minioService.statObject('processed', key);
      const url = await this.minioService.generatePresignedUrl('processed', key);
      return { status: 'done', url };
    } catch (err) {
      if (err.name !== 'NoSuchKey' && err.name !== 'NotFound') {
        console.error('[GATEWAY] [STATUS] Erro inesperado:', err.name, err.message);
        return { status: 'error', message: 'Erro inesperado a verificar MinIO.' };
      }
      
    }

    await new Promise(res => setTimeout(res, interval));
  }

  return { status: 'timeout', message: 'Tempo máximo de espera atingido.' };
}


@Get('/status/video/:key')
@ApiOperation({ summary: 'Check the status of a video processing job' })
@ApiParam({ name: 'key', required: true, description: 'The unique key of the video processing job' })
async checkVideoStatus(@Param('key') key: string) {
  console.log(`[STATUS VIDEO] Long polling para vídeo [${key}]`);

  const timeout = 35 * 60 * 1000;
  const interval = 5000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    // Verifica se falhou
    try {
      await this.minioService.statObject('status', `${key}.error`);
      return { status: 'error', message: 'O processamento falhou.' };
    } catch (_) {
      // continua
    }

    const urls: string[] = [];

    let allClipsReady = true;

    for (let i = 0; i < 3; i++) {
      const clipKey = `clip_${i + 1}_${key}`;
      try {
        await this.minioService.statObject('processed', clipKey);
        const url = await this.minioService.generatePresignedUrl('processed', clipKey);
        urls.push(url);
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.name === 'NotFound') {
          allClipsReady = false;
          break;
        }
        return { status: 'error', message: 'Erro inesperado a verificar MinIO.' };
      }
    }

    if (allClipsReady) {
      return { status: 'done', urls };
    }

    await new Promise(res => setTimeout(res, interval));
  }

  return { status: 'timeout', message: 'Tempo máximo de espera atingido.' };
}

  


  //Test Endpoint
  @Get('/home/test')
  @ApiOperation({ summary: 'Test endpoint to check if the gateway is operational' })
  getRoot(): string {
    console.log('[GATEWAY] GET /home/test');
    return 'Gateway operacional!';
  }

}