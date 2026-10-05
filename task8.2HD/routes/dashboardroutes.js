const express = require('express');

const router = express.Router();

const dashboardController = require('../controllers/dashboardcontroller');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

router.get(
  '/stats',
  authMiddleware,
  roleMiddleware('admin'),
  dashboardController.getDashboardStats
);

router.get(
  '/trends',
  authMiddleware,
  roleMiddleware('admin'),
  dashboardController.getDashboardTrends
);

router.get(
  '/student',
  authMiddleware,
  roleMiddleware('student'),
  dashboardController.getStudentDashboard
);

module.exports = router;