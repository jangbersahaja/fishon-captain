declare module "mp4box" {
  export interface MP4File {
    onReady: (info: MP4Info) => void;
    onError: (e: unknown) => void;
    appendBuffer(buffer: ArrayBuffer): void;
    flush(): void;
    extractSamples(
      trackId: number,
      firstSample: number,
      numSamples: number
    ): ArrayBuffer;
  }
  export function createFile(): MP4File;
  export interface MP4Info {
    duration: number;
    timescale: number;
    tracks: MP4Track[];
  }
  export interface MP4Track {
    id: number;
    type: string;
    movie_timescale: number;
    samples: MP4Sample[];
  }
  export interface MP4Sample {
    is_sync: boolean;
    cts: number;
  }
}
