const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    altText: { type: String, default: '' },
    // Raw image bytes. MongoDB persists this as BSON Binary.
    imageData: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    filename: { type: String, default: '' },
    size: { type: Number, default: 0 },
    order: { type: Number, default: 1 },
    status: { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true }
);

galleryImageSchema.index({ order: 1 });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
