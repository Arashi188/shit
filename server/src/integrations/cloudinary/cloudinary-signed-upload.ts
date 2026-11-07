import { createHash } from "node:crypto";

export type CloudinarySettings = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadFolder: string;
};

export type SignedUploadParameters = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export interface ImageUploadSigner {
  signUpload(timestamp?: number): SignedUploadParameters;
}

export class CloudinaryNotConfiguredError extends Error {
  constructor() { super("Cloudinary upload signing is not configured"); }
}

export class CloudinarySignedUpload implements ImageUploadSigner {
  constructor(private readonly settings?: CloudinarySettings) {}

  signUpload(timestamp = Math.floor(Date.now() / 1000)): SignedUploadParameters {
    const settings = this.settings;
    if (!settings?.cloudName || !settings.apiKey || !settings.apiSecret || !settings.uploadFolder) {
      throw new CloudinaryNotConfiguredError();
    }
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Error("Invalid upload timestamp");
    const signedFields = { folder: settings.uploadFolder, timestamp };
    const toSign = Object.entries(signedFields).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`).join("&");
    const signature = createHash("sha1").update(`${toSign}${settings.apiSecret}`).digest("hex");
    return { cloudName: settings.cloudName, apiKey: settings.apiKey, ...signedFields, signature };
  }
}
