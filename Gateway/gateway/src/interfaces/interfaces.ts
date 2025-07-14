// File Types Gateway
export interface UploadedFileMeta {
  key: string;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface LinkFileMeta {
  key: string;
  link: string;
}

export type FileMeta = UploadedFileMeta | LinkFileMeta;

// Payload Vizard APY (CUT VIDEO SERVICE)
export interface VizardCreatePayload {
  lang: 'en';
  preferLength: [number, number];
  videoUrl: string;
  videoType: number;
  maxClipNumber: number;
  subtitleSwitch: 0 | 1;
  headlineSwitch: 0 | 1;
  projectName: string;
  ext?: string;
}
