declare module "heic-convert" {
  function convert(options: {
    buffer: Uint8Array;
    format: "JPEG";
    quality?: number;
  }): Promise<Uint8Array>;
  export default convert;
}
