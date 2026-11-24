const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    studentAge: {
      type: Number,
      default: null,
    },
    preferredBranch: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Converted', 'Closed'],
      default: 'New',
    },
  },
  {
    timestamps: true,
  }
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ fullName: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('Enquiry', enquirySchema);
