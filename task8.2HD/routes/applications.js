const express = require('express');
const router = express.Router();

const Application = require('../models/Application');
const { adjustRoomOccupancy } = require('../src/controllers/roomController');

const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');


// ============================================================
// STUDENT - Submit a new application
// POST /api/applications
// ============================================================

router.post(
  '/',
  authMiddleware,
  roleMiddleware('student'),
  async (req, res, next) => {
    try {
      const {
        studentId,
        studentName,
        studentEmail,
        roomId,
        roomTitle
      } = req.body;

      if (
        !studentId ||
        !studentName ||
        !studentEmail ||
        !roomId ||
        !roomTitle
      ) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required.'
        });
      }

      // Student can only submit an application for their own account
      const loggedInUserId = req.user.userId || req.user.id;

      if (String(loggedInUserId) !== String(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only submit an application for your own account.'
        });
      }

      const existingActive = await Application.findOne({
        studentId,
        status: { $in: ['Pending', 'Approved'] }
      });

      if (existingActive) {
        return res.status(409).json({
          success: false,
          message: 'You already have an active application.'
        });
      }

      const newApplication = new Application({
        studentId,
        studentName,
        studentEmail,
        roomId,
        roomTitle
      });

      await newApplication.save();

      res.status(201).json(newApplication);

    } catch (err) {
      next(err);
    }
  }
);


// ============================================================
// ADMIN - Get all applications
// GET /api/applications
// ============================================================

router.get(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const applications = await Application
        .find()
        .sort({ createdAt: -1 });

      res.json(applications);

    } catch (err) {
      next(err);
    }
  }
);


// ============================================================
// ADMIN - Approve / Reject application
// PATCH /api/applications/:id
// ============================================================

router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const { status } = req.body;

      if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value.'
        });
      }

      const existing = await Application.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Application not found.'
        });
      }

      const previousStatus = existing.status;

      const updated = await Application.findByIdAndUpdate(
        req.params.id,
        {
          status,
          updatedAt: Date.now()
        },
        {
          new: true
        }
      );

      // Update room occupancy
      if (
        previousStatus !== 'Approved' &&
        status === 'Approved'
      ) {
        await adjustRoomOccupancy(updated.roomId, 1);

      } else if (
        previousStatus === 'Approved' &&
        status !== 'Approved'
      ) {
        await adjustRoomOccupancy(updated.roomId, -1);
      }

      res.json(updated);

    } catch (err) {
      next(err);
    }
  }
);


// ============================================================
// ADMIN - Delete application
// DELETE /api/applications/:id
// ============================================================

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const existing = await Application.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      // Decrement room occupancy if deleting approved application
      if (existing.status === 'Approved' && existing.roomId) {
        await adjustRoomOccupancy(existing.roomId, -1);
      }

      await Application.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Application deleted successfully'
      });

    } catch (err) {
      console.error('Error deleting application:', err);

      res.status(500).json({
        success: false,
        error: 'Server error deleting application'
      });
    }
  }
);


// ============================================================
// STUDENT / ADMIN - Get student's current application
// GET /api/applications/:studentId
// ============================================================

router.get(
  '/:studentId',
  authMiddleware,
  roleMiddleware('student', 'admin'),
  async (req, res, next) => {
    try {

      // Students can only view their own application
      if (
        req.user.role === 'student' &&
        String(req.user.userId || req.user.id) !==
        String(req.params.studentId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own application.'
        });
      }

      const application = await Application
        .findOne({
          studentId: req.params.studentId
        })
        .sort({ createdAt: -1 });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'No application found for this student.'
        });
      }

      res.json(application);

    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;