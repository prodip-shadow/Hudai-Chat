const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = (file) => {
  const options = {
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
  };

  const localFileUrl = `/uploads/${path.basename(file.path)}`;

  return new Promise((resolve, reject) => {
    const uploader = file.mimetype.startsWith('video')
      ? cloudinary.uploader.upload_large
      : cloudinary.uploader.upload;
    uploader(file.path, options, (error, result) => {
      if (error) {
        if (
          process.env.CLOUDINARY_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ) {
          return resolve({
            secure_url: localFileUrl,
            fallback: true,
            error: error.message,
          });
        }

        fs.unlink(file.path, () => {});
        return reject(error);
      }

      fs.unlink(file.path, () => {});
      resolve(result);
    });
  });
};

const multerMiddleware = multer({ dest: 'uploads/' }).single('media');

module.exports = {
  uploadFileToCloudinary,
  multerMiddleware,
};
