import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        
        // Upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });
        
        // Remove the locally saved temporary file after successful upload
        fs.unlinkSync(localFilePath)
        return response;
        
    } catch (err) {
        console.log("Cloudinary upload error:", err);
        
        // Remove the locally saved temporary file as operation failed
        // But only if the file path exists
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath)
        }
        return null;
    }
}

function extractPublicIdFromUrl(url) {
  const urlParts = url.split('/');
  const versionIndex = urlParts.findIndex(part => part.startsWith('v'));

  const pathWithExtension = urlParts.slice(versionIndex + 1).join('/');
  const publicId = pathWithExtension.substring(0, pathWithExtension.lastIndexOf('.'));

  return publicId;
}

const deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) return false;
    const publicId = extractPublicIdFromUrl(fileUrl);

    const response = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
    });

    // console.log("File deleted from cloudinary successfully :)", response);
    // return response.result === 'ok' || response.result === 'not found';

    if(!response.result || response.result === 'not found') {
      return false;
    }

    return true;
  } catch (err) {
    console.log("Cloudinary deletion error:", err);
    return false;
  }
}

export { uploadOnCloudinary, deleteFromCloudinary }