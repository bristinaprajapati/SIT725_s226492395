const express = require('express');
const router = express.Router();
const timestampController = require('../controllers/timestampController');

// POST /api/click
router.post('/click', timestampController.handleClick);

module.exports = router;