import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { MinioService } from 'src/minIO/minio.service';
import { ConfigService } from '@nestjs/config';
import { VizardCreatePayload } from '../interfaces/interfaces';




@Injectable()
export class CutVideoService {
 constructor(private readonly MinioService: MinioService,
  private configService: ConfigService,
 ) {}

private async uploadClipsToMinIO(videos: { videoUrl: string }[], key: string) {
  try{
  for (let i = 0; i < videos.length; i++) {
    const clip = videos[i];
    const res = await axios.get(clip.videoUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(res.data);
    const clipKey = `clip_${i + 1}_${key}`;
    await this.MinioService.uploadFile("processed",clipKey, buffer, 'video/mp4');
    console.log(`[CutVideoService] Clip ${i + 1} guardado como ${clipKey}`);
  }
  } catch (error) {
    console.error(`[CutVideoService] Error uploading clips to MinIO: ${error.message}`);
    throw new Error(`Failed to upload clips to MinIO: ${error.message}`);
  }
}




async pollVizardUntilReady(projectId: string, key: string): Promise<void> {
  const interval = 30000;
  const maxRetries = 50;
  let attempts = 0;

  while (attempts < maxRetries) {
    attempts++;
    console.log(`[VIZARD POLLING] Try ${attempts} for project ${projectId}`);

    try {
      const response = await axios.get(
        `https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/query/${projectId}`,
        {
          headers: {
            VIZARDAI_API_KEY: this.configService.get<string>('VIZARD_API_KEY'),
          },
        },
      );

      const data = response.data;

      if (data.code === 2000 && data.videos?.length > 0) {
        console.log(`[CutVideoService] ${data.videos.length} clips done [${projectId}]`);
        await this.uploadClipsToMinIO(data.videos, key);
        return;
      }

      // Espera antes de tentar outra vez
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (err) {
      console.error(`[CutVideoService] Polling error: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error(`[CutVideoService] Max polling attempts reached for project ${projectId}`);
}



  async sendVideo_api(payload: VizardCreatePayload):Promise<string>{
     try {
      const response = await axios.post(
        'https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/create',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'VIZARDAI_API_KEY': this.configService.get<string>('VIZARD_API_KEY'),
          },
        }
      );
      const { projectId } = response.data; 
      if (!projectId) {
        throw new Error('ID of the process not found in the response of the API');
      }
      
      return projectId; 
      } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    console.error('[CutVideoService] Error Vizard API:', message);
    throw new Error(`[CutVideoService] Failed to send the video to Vizard API: ${message}`);
  }
  }

  }

