const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

export function isAcceptedImage(file: { type: string; name: string }): boolean {
  const type = file.type.toLowerCase();
  if (IMAGE_TYPES.has(type)) return true;
  if (type && type !== "application/octet-stream") return false;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}
