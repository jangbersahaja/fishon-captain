declare module "heic-convert" {
  interface ConvertOptions {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality: number; // 0-1 for JPEG
  }

  function convert(options: ConvertOptions): Promise<Buffer>;

  export default convert;
}
