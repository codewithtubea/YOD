const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const WEBP = [0x52, 0x49, 0x46, 0x46];

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function isAllowedImageBytes(bytes: Uint8Array) {
  if (startsWith(bytes, PNG)) return true;
  if (startsWith(bytes, JPEG)) return true;
  return (
    startsWith(bytes, WEBP) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}
