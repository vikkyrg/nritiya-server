const express = require('express');
const { requireAdmin, optionalAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const galleryController = require('../controllers/galleryController');

const router = express.Router();

// Public: website gallery list + raw image bytes served from MongoDB.
router.get('/', optionalAdmin, galleryController.listGallery);
router.get('/:id/image', galleryController.getImageData);

// Admin: full gallery management (JWT protected, multipart uploads in memory).
router.post('/', requireAdmin, upload.single('image'), galleryController.createGalleryImage);
router.put('/:id', requireAdmin, upload.single('image'), galleryController.updateGalleryImage);
router.delete('/:id', requireAdmin, galleryController.deleteGalleryImage);
router.post('/:id/reorder', requireAdmin, galleryController.reorderGalleryImage);

module.exports = router;
