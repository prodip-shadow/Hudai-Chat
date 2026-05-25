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
  let resourceType = 'raw';
  if (file.mimetype.startsWith('image')) {
    resourceType = 'image';
  } else if (file.mimetype.startsWith('video')) {
    resourceType = 'video';
  }
  const options = {
    resource_type: resourceType,
  };

  if (resourceType === 'raw') {
    const fileExt = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, fileExt)
      .replace(/[^a-zA-Z0-9-_]/g, '_');
    options.public_id = `${cleanName}-${Date.now()}${fileExt}`;
  }

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const multerMiddleware = multer({ storage: storage }).single('media');

module.exports = {
  uploadFileToCloudinary,
  multerMiddleware,
};
