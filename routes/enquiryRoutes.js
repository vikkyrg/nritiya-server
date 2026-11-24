const express = require('express');
const enquiryController = require('../controllers/enquiryController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public route for visitors to submit enquiries
router.post('/submit', enquiryController.submitEnquiry);

// Admin-protected routes
router.get('/', requireAdmin, enquiryController.getEnquiries);
router.get('/:id', requireAdmin, enquiryController.getEnquiryById);
router.patch('/:id/status', requireAdmin, enquiryController.updateEnquiryStatus);
router.delete('/:id', requireAdmin, enquiryController.deleteEnquiry);

module.exports = router;
