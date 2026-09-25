import sharp from "sharp";
// Decode and re-encode, stripping metadata; cap stored media for the demo store.
export async function chatImage(file: File): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error("fileTooLarge");
  const pipeline = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 25000000,
    failOn: "error",
  });
  const meta = await pipeline.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages ?? 1) > 1
  )
    throw new Error("invalidImage");
  const data = await pipeline
    .rotate()
    .resize({
      width: 960,
      height: 960,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 70 })
    .toBuffer();
  if (data.length > 256 * 1024) throw new Error("fileTooLarge");
  return "data:image/jpeg;base64," + data.toString("base64");
}
