import convert from "heic-convert";

declare module "heic-convert" {
  function convert(options: {
    buffer: Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  }): Promise<Uint8Array>;
  export default convert;
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
const BOX_CONTAINERS = new Set([
  "meta",
  "iprp",
  "ipco",
  "moov",
  "trak",
  "mdia",
  "minf",
  "stbl",
  "dinf",
  "edts",
  "udta",
]);
const PIXEL_LIMIT = 25_000_000;

function brand(buffer: Buffer, offset: number): string {
  return buffer
    .toString("latin1", offset, offset + 4)
    .replace(/\0/g, "")
    .trim();
}

export function isHeifContainer(buffer: Buffer): boolean {
  if (buffer.length < 12 || buffer.toString("latin1", 4, 8) !== "ftyp")
    return false;
  const boxSize = buffer.readUInt32BE(0);
  if (boxSize < 16 || boxSize > buffer.length) return false;
  const major = brand(buffer, 8);
  const brands = [major];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4)
    brands.push(brand(buffer, offset));
  if (brands.some((item) => item === "avif" || item === "avis")) return false;
  return HEIF_BRANDS.has(major);
}

function walkBoxes(
  buffer: Buffer,
  start: number,
  end: number,
  visit: (type: string, offset: number, size: number, header: number) => void,
) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) return;
      const large = buffer.readBigUInt64BE(offset + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) return;
      size = Number(large);
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) return;
    visit(type, offset, size, header);
    if (BOX_CONTAINERS.has(type)) {
      const child = type === "meta" ? offset + header + 4 : offset + header;
      if (child < offset + size) walkBoxes(buffer, child, offset + size, visit);
    }
    offset += size;
  }
}

function exceedsPixelLimit(buffer: Buffer): boolean {
  let tooBig = false;
  walkBoxes(buffer, 0, buffer.length, (type, offset, size, header) => {
    if (type !== "ispe" || size < header + 12) return;
    const width = buffer.readUInt32BE(offset + header + 4);
    const height = buffer.readUInt32BE(offset + header + 8);
    if (width > 0 && height > 0 && width * height > PIXEL_LIMIT) tooBig = true;
  });
  return tooBig;
}

export async function rasterizeUpload(buffer: Buffer): Promise<Buffer> {
  if (!isHeifContainer(buffer)) return buffer;
  if (exceedsPixelLimit(buffer)) throw new Error("invalidImage");
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  try {
    const jpeg = await convert({
      buffer: bytes,
      format: "JPEG",
      quality: 0.92,
    });
    if (!jpeg?.byteLength) throw new Error("invalidImage");
    return Buffer.from(jpeg);
  } catch (error) {
    if (error instanceof Error && error.message === "invalidImage") throw error;
    throw new Error("invalidImage");
  }
}
