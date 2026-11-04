export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const AVATAR_SIZE = 512;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedAvatarType(type: string) {
  return ALLOWED_TYPES.has(type);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("That image could not be prepared."));
      },
      "image/webp",
      quality,
    );
  });
}

export async function resizeAvatar(file: File): Promise<Blob> {
  if (!isAllowedAvatarType(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("Choose an image under 8 MB.");
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const edge = Math.min(sourceWidth, sourceHeight);

  if (edge < 1) throw new Error("That image could not be read.");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the image.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (sourceWidth - edge) / 2,
    (sourceHeight - edge) / 2,
    edge,
    edge,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > AVATAR_MAX_BYTES && quality > 0.55) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error("That image is still too large. Try a simpler photo.");
  }

  return blob;
}
