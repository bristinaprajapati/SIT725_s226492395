const express = require('express');

const router = express.Router();

const complaintController = require('../controllers/complaintController');

const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');


// ============================================================
// STUDENT - Submit complaint
// POST /api/complaints
// ============================================================

router.post(
  '/',
  authMiddleware,
  roleMiddleware('student'),
  complaintController.createComplaint
);


// ============================================================
// ADMIN - Get all complaints
// GET /api/complaints
// ============================================================

router.get(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  complaintController.getAllComplaints
);


// ============================================================
// STUDENT - Get own complaints
// GET /api/complaints/student/:studentId
// ============================================================

router.get(
  '/student/:studentId',
  authMiddleware,
  roleMiddleware('student', 'admin'),
  complaintController.getStudentComplaints
);


// ============================================================
// STUDENT / ADMIN - Get single complaint
// GET /api/complaints/:id
// ============================================================

router.get(
  '/:id',
  authMiddleware,
  roleMiddleware('student', 'admin'),
  complaintController.getComplaintById
);


// ============================================================
// ADMIN - Update complaint status
// PATCH /api/complaints/:id/status
// ============================================================

router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware('admin'),
  complaintController.updateComplaintStatus
);


module.exports = router;