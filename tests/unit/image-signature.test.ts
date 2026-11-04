import { describe, expect, it } from "vitest";

import { isAllowedImageBytes } from "@/lib/account/image-signature";

describe("avatar signatures", () => {
  it("accepts real png, jpeg, and webp headers", () => {
    expect(isAllowedImageBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isAllowedImageBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(
      isAllowedImageBytes(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe(true);
  });

  it("rejects text, gif, and a broken webp header", () => {
    expect(isAllowedImageBytes(new TextEncoder().encode("<script>"))).toBe(false);
    expect(isAllowedImageBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBe(false);
    expect(
      isAllowedImageBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0, 0])),
    ).toBe(false);
  });
});
