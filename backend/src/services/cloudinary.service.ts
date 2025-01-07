import cloudinary from '../config/cloudinary.config';

export const uploadFile = async (
  fileBuffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      )
      .end(fileBuffer);
  });
};

export const updateFileUrl = async (publicId: string) => {
  return cloudinary.url(publicId, { secure: true });
};

export const deleteFile = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'auto' = 'auto'
) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
