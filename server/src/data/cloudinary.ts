import { config } from "../config.js";
import { CloudinarySignedUpload } from "../integrations/cloudinary/cloudinary-signed-upload.js";

export function getCloudinaryUploadSigner(): CloudinarySignedUpload {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_FOLDER } = config;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_UPLOAD_FOLDER) {
    return new CloudinarySignedUpload();
  }
  return new CloudinarySignedUpload({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
    uploadFolder: CLOUDINARY_UPLOAD_FOLDER,
  });
}
