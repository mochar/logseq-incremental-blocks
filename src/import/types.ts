
export const importFormats = ['audio', 'video', 'youtube', 'html'] as const;
export declare type ImportFormat = typeof importFormats[number];

export interface Article {
  content: string,
  readableContent: string
}
