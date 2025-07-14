import { Injectable } from '@nestjs/common';
import * as forge from 'node-forge';
import axios from 'axios';
import { response } from 'express';
import { error } from 'console';
import { json } from 'stream/consumers';
import * as fs from 'fs';
let key;
import { ConfigService } from '@nestjs/config';
function buildPemPublicKey(base64Key: string): string {
  const formatted = base64Key.match(/.{1,64}/g)?.join('\n') ?? base64Key;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}


@Injectable()
export class EnhanceService {
  constructor(private configService: ConfigService){}
  private readonly clientId = this.configService.get<string>('CLIENT_ID') || '';
 private readonly rawKey = this.configService.get<string>('CLIENT_SECRET') || '';
  private readonly clientSecret =buildPemPublicKey(this.rawKey);
   
  async generateIdToken() {
    const timestamp = Date.now();
    const payload = `client_id=${this.clientId}&timestamp=${timestamp}`;

    const publicKey = forge.pki.publicKeyFromPem(this.clientSecret);
    const encrypted = publicKey.encrypt(payload, 'RSAES-PKCS1-V1_5');
    key = forge.util.encode64(encrypted);
  }

  async authentication() {
    const requestBody = {
      client_id: this.clientId,
      id_token: key
    };
  
    try {
      const response = await axios.post(
        'https://yce-api-01.perfectcorp.com/s2s/v1.0/client/auth',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('API Authentication Concluded with success [EnhanceService].');
      const token_ = response.data.result.access_token
      return token_;
  
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          throw new Error(`Invalid authenticate, status: ${error.response.status}`);
        } else {
          throw new Error(`Error authenticate, status: ${error.response.status}`);
        }
      }
      throw new Error(`Unxpected Authentication Error: ${error}`);
    }
  }
 

  // Passo 1: Get the uploadUrl and file_id
  async requestUploadUrl(
    filename: string,
    filesize: number,
    auth_token: number,
  ): Promise<{
    status: number;
    result: {
      files: Array<{
        content_type: string;
        file_name: string;
        file_id: string;
        requests: Array<{
          headers: Record<string, string | number>;
          url: string;
          method: string;
        }>;
      }>;
    };
  }> {
    const requestBody = {
      files: [
        {
          content_type: 'image/jpg',
          file_name: filename,
          file_size: filesize
        }
      ]
    };
  
    try{
    const response = await axios.post(
      'https://yce-api-01.perfectcorp.com/s2s/v1.1/file/enhance',
      requestBody, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth_token}`
        }
      }
    );
     return response.data;
  } catch (error) {
    throw new Error(`[ENHANCE_SERVICE] Error requesting upload URL: ${error.message}`);
  }
    
   
  }
  
  // Passo 2: Send the image to the uploadUrl
  async uploadImage(uploadUrl: string, imageBuffer: Buffer, headers: Record<string, string | number>): Promise<void> {
    try{
    await axios.put(uploadUrl, imageBuffer, {
      headers: headers
    });
  }catch (error) {
    throw new Error(`[ENHANCE_SERVICE] Error uploading image: ${error.message}`);
  }
}
  
  async startEnhanceTask(fileId: string, auth_token: string): Promise<string> {
    const requestBody = {
      request_id: 0, // ou outro número se precisares diferenciar execuções
      payload: {
        file_sets: {
          src_ids: [fileId]
        },
        actions: [
          {
            id: 0,
            params: {
              scale: 1 // ou 2, ou 4
            }
          }
        ]
      }
    };
    try{
    const response = await axios.post(
      'https://yce-api-01.perfectcorp.com/s2s/v1.0/task/enhance',
      requestBody, 
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth_token}`
        }
      }
    );
      return response.data.result.task_id;
    }catch (error) {
      throw new Error(`[ENHANCE_SERVICE] Error starting enhance task: ${error.message}`);
    }
    
  }

  
// Passo 3: Polling to check the status of the task
  async pollEnhanceTask(taskId: string, accessToken: string): Promise<string> {
    const maxRetries = 10;
    let retries = 0;
  
    while (retries < maxRetries) {
      const response = await axios.get(
        'https://yce-api-01.perfectcorp.com/s2s/v1.0/task/enhance',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          params: {
            task_id: taskId
          }
        }
      );
  
      const result = response.data.result;
      console.log(`Polling status [${retries}]:`, result.status);
  
      if (result.status === 'success') {
        // Quando estiver pronto, devolve o URL final da imagem
        console.log("Sucsses the process its DONE, returning the URL")
        return result.results?.[0]?.data?.[0]?.url;
      }
  
      if (result.status === 'error') {
        throw new Error(`Tarefa falhou: ${result.error ?? 'erro desconhecido'}`);
      }
  
      // Waits for a while before the next poll
      const wait = 5000;
      await new Promise((res) => setTimeout(res, wait));
      retries++;
    }
  
    throw new Error('Timeout: Tarefa não foi concluída a tempo.');
  }
  
  
  
  async enhanceImageFlow(imageBuffer: Buffer, filename: string, filesize: number): Promise<any> {
    console.log("[ENHANCE_SERVICE]");
    try{
  await this.generateIdToken();
  const auth_token = await this.authentication();
    const response = await this.requestUploadUrl(filename, filesize,auth_token);
    const file_r = response.result.files[0];
   const file_id_r = file_r.file_id;
   const upload_url = file_r.requests[0].url;
   const request_headers = file_r.requests[0].headers;
   console.log("Let's upload the image");
  await this.uploadImage(upload_url,imageBuffer,request_headers );
  console.log("Done");
  console.log("Lets start the process");
    const taskId = await this.startEnhanceTask(file_id_r,auth_token);
    console.log("Poll status:");
    const result = await this.pollEnhanceTask(taskId, auth_token);
    const image = await axios.get(result, { responseType: 'arraybuffer'});
    return Buffer.from(image.data, 'binary');
  }
  catch (error) {
    throw new Error(`[ENHANCE_SERVICE] Error in enhanceImageFlow: ${error}`);
  }
  }
}