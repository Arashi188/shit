import { describe, expect, it } from "vitest";
import { CloudinaryNotConfiguredError, CloudinarySignedUpload } from "./cloudinary-signed-upload.js";

describe("Cloudinary signed upload integration", () => {
  it("signs the exact timestamp and folder fields without returning the API secret", () => {
    const signer = new CloudinarySignedUpload({
      cloudName: "test-cloud", apiKey: "public-key", apiSecret: "private-test-secret", uploadFolder: "catalog/assets",
    });
    const result = signer.signUpload(1_800_000_000);
    expect(result).toEqual({
      cloudName: "test-cloud", apiKey: "public-key", timestamp: 1_800_000_000,
      folder: "catalog/assets", signature: "f0134f701f7b88dddf66b64aa9c21ac48037827b",
    });
    expect(JSON.stringify(result)).not.toContain("private-test-secret");
  });

  it("refuses to issue signatures when Cloudinary credentials are absent", () => {
    expect(() => new CloudinarySignedUpload().signUpload(1_800_000_000)).toThrow(CloudinaryNotConfiguredError);
  });
});
