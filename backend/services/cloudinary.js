const cloudinary = require("cloudinary").v2;
const config = require("../config");

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

/**
 * Check if Cloudinary is properly configured
 */
function isCloudinaryConfigured() {
  return !!(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);
}

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The folder name in Cloudinary
 * @param {string} filename - Optional filename for the public_id
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
async function uploadBuffer(buffer, folder = config.cloudinaryFolder, filename = null) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET");
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image",
    };

    if (filename) {
      uploadOptions.public_id = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a file from multer to Cloudinary
 * @param {Object} file - The multer file object (with buffer for memory storage)
 * @param {string} subfolder - Optional subfolder (e.g., 'products', 'users', 'reviews')
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
async function uploadFile(file, subfolder = "") {
  if (!file || !file.buffer) {
    throw new Error("No file or file buffer provided");
  }

  const folder = subfolder
    ? `${config.cloudinaryFolder}/${subfolder}`
    : config.cloudinaryFolder;

  const filename = file.originalname
    ? `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    : null;

  return uploadBuffer(file.buffer, folder, filename);
}

/**
 * Delete an image from Cloudinary by URL
 * @param {string} imageUrl - The Cloudinary URL of the image
 */
async function deleteImage(imageUrl) {
  if (!imageUrl || !isCloudinaryConfigured()) {
    return;
  }

  try {
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return;

    const publicIdWithExtension = urlParts.slice(uploadIndex + 1).join("/");
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // Remove extension

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("[Cloudinary] Failed to delete image:", error.message);
  }
}

/**
 * Get a Cloudinary instance for advanced usage
 */
function getCloudinary() {
  return cloudinary;
}

module.exports = {
  isCloudinaryConfigured,
  uploadBuffer,
  uploadFile,
  deleteImage,
  getCloudinary,
};
