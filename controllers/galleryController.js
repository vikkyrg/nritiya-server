const mongoose = require('mongoose');
const GalleryImage = require('../models/GalleryImage');

const VALID_STATUSES = ['active', 'hidden'];

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

/** Shapes a document for API responses: imageData becomes a browser-usable image URL. */
function toResponse(doc, req) {
  return {
    _id: doc._id,
    title: doc.title,
    altText: doc.altText,
    order: doc.order,
    status: doc.status,
    filename: doc.filename,
    size: doc.size,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    imageData: `${baseUrl(req)}/api/gallery/${doc._id}/image`,
  };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/** Public visitors only see active images; a signed-in admin sees everything. */
exports.listGallery = async (req, res) => {
  const filter = req.admin ? {} : { status: 'active' };
  const docs = await GalleryImage.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .select('-imageData'); // never ship the binary buffers in listings
  res.json(docs.map((doc) => toResponse(doc, req)));
};

/** Serves the stored binary image directly from MongoDB. */
exports.getImageData = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  const doc = await GalleryImage.findById(id).select('imageData contentType');
  if (!doc || !doc.imageData) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  res.set('Content-Type', doc.contentType || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(doc.imageData);
};

exports.createGalleryImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'An image file is required.' });
  }
  const { title = '', altText, order, status } = req.body;

  const finalStatus = status === undefined || status === '' ? 'active' : status;
  if (!VALID_STATUSES.includes(finalStatus)) {
    return res.status(400).json({ message: "Status must be 'active' or 'hidden'." });
  }

  let parsedOrder = Number(order);
  if (!Number.isFinite(parsedOrder) || parsedOrder < 1) {
    const last = await GalleryImage.findOne({}).sort({ order: -1 }).select('order').lean();
    parsedOrder = (last ? last.order : 0) + 1;
  }

  const doc = await GalleryImage.create({
    title: String(title).trim(),
    altText: String(altText !== undefined ? altText : title).trim(),
    imageData: req.file.buffer,
    contentType: req.file.mimetype,
    filename: req.file.originalname,
    size: req.file.size,
    order: parsedOrder,
    status: finalStatus,
  });
  res.status(201).json(toResponse(doc, req));
};

exports.updateGalleryImage = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  const doc = await GalleryImage.findById(id);
  if (!doc) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }

  const { title, altText, order, status } = req.body;
  if (title !== undefined) doc.title = String(title).trim();
  if (altText !== undefined) doc.altText = String(altText).trim();
  if (order !== undefined) {
    const parsedOrder = Number(order);
    if (!Number.isFinite(parsedOrder) || parsedOrder < 1) {
      return res.status(400).json({ message: 'Order must be a positive number.' });
    }
    doc.order = parsedOrder;
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status must be 'active' or 'hidden'." });
    }
    doc.status = status;
  }

  // Replace the stored binary only when a new file was uploaded.
  if (req.file) {
    doc.imageData = req.file.buffer;
    doc.contentType = req.file.mimetype;
    doc.filename = req.file.originalname;
    doc.size = req.file.size;
  }

  await doc.save();
  res.json(toResponse(doc, req));
};

exports.deleteGalleryImage = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  const doc = await GalleryImage.findByIdAndDelete(id);
  if (!doc) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  res.json({ _id: id });
};

/**
 * Moves an image to a new position and renumbers every record 1..n so the
 * website gallery order stays contiguous. Returns the renumbered list.
 */
exports.reorderGalleryImage = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }
  const requestedOrder = Number((req.body || {}).order);
  if (!Number.isFinite(requestedOrder)) {
    return res.status(400).json({ message: 'A valid order number is required.' });
  }

  const items = await GalleryImage.find({})
    .sort({ order: 1, createdAt: 1 })
    .select('_id order');
  const index = items.findIndex((item) => String(item._id) === String(id));
  if (index === -1) {
    return res.status(404).json({ message: 'Gallery image not found.' });
  }

  const [moved] = items.splice(index, 1);
  const insertAt = Math.min(Math.max(requestedOrder, 1), items.length + 1) - 1;
  items.splice(insertAt, 0, moved);

  await GalleryImage.bulkWrite(
    items.map((item, position) => ({
      updateOne: { filter: { _id: item._id }, update: { $set: { order: position + 1 } } },
    }))
  );

  const updated = await GalleryImage.find({})
    .sort({ order: 1, createdAt: 1 })
    .select('-imageData');
  res.json(updated.map((doc) => toResponse(doc, req)));
};
