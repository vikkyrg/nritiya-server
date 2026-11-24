const Enquiry = require('../models/Enquiry');

const VALID_STATUSES = ['New', 'Contacted', 'Converted', 'Closed'];

/**
 * Public: Submit a new enquiry
 * POST /api/enquiries/submit
 */
exports.submitEnquiry = async (req, res) => {
  try {
    const { fullName, email, phone, studentAge, preferredBranch, message } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return res.status(400).json({ message: 'Please provide a valid phone number (7-15 digits).' });
    }

    let parsedAge = null;
    if (studentAge !== undefined && studentAge !== null && studentAge !== '') {
      parsedAge = Number(studentAge);
      if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return res.status(400).json({ message: 'Please provide a valid student age.' });
      }
    }

    const enquiry = new Enquiry({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      studentAge: parsedAge,
      preferredBranch: preferredBranch ? preferredBranch.trim() : '',
      message: message ? message.trim() : '',
      status: 'New',
    });

    await enquiry.save();

    res.status(201).json({
      message: 'Enquiry submitted successfully. We will get back to you shortly!',
      enquiry: {
        _id: enquiry._id,
        fullName: enquiry.fullName,
        email: enquiry.email,
        phone: enquiry.phone,
        status: enquiry.status,
        createdAt: enquiry.createdAt,
      },
    });
  } catch (error) {
    console.error('Error submitting enquiry:', error);
    res.status(500).json({ message: 'Failed to submit enquiry. Please try again later.' });
  }
};

/**
 * Admin: Get paginated enquiries with search and filter
 * GET /api/admin/enquiries
 */
exports.getEnquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      branch = '',
      sort = 'newest',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }

    if (branch && branch.trim()) {
      filter.preferredBranch = branch.trim();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { preferredBranch: searchRegex },
      ];
    }

    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

    const [enquiries, total, statsResult] = await Promise.all([
      Enquiry.find(filter).sort(sortOrder).skip(skip).limit(limitNum),
      Enquiry.countDocuments(filter),
      Enquiry.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = {
      total: 0,
      New: 0,
      Contacted: 0,
      Converted: 0,
      Closed: 0,
    };

    let totalAll = 0;
    statsResult.forEach((item) => {
      if (stats[item._id] !== undefined) {
        stats[item._id] = item.count;
      }
      totalAll += item.count;
    });
    stats.total = totalAll;

    res.json({
      enquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ message: 'Failed to fetch enquiries.' });
  }
};

/**
 * Admin: Get enquiry by ID
 * GET /api/admin/enquiries/:id
 */
exports.getEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' });
    }
    res.json(enquiry);
  } catch (error) {
    console.error('Error fetching enquiry details:', error);
    res.status(500).json({ message: 'Failed to fetch enquiry details.' });
  }
};

/**
 * Admin: Update enquiry status
 * PATCH /api/admin/enquiries/:id/status
 */
exports.updateEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' });
    }

    res.json({
      message: 'Enquiry status updated successfully.',
      enquiry,
    });
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    res.status(500).json({ message: 'Failed to update enquiry status.' });
  }
};

/**
 * Admin: Delete enquiry
 * DELETE /api/admin/enquiries/:id
 */
exports.deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const enquiry = await Enquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found.' });
    }

    res.json({ message: 'Enquiry deleted successfully.', id });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ message: 'Failed to delete enquiry.' });
  }
};
