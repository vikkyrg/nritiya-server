const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — mirrors the Admin upload limit

// Memory storage only: MongoDB is the permanent image store, never the filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('Only JPG, PNG and WEBP images are allowed.');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;
