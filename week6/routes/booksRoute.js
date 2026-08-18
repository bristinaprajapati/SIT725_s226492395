const express = require('express');
const router = express.Router();
const Controllers = require('../controllers');

// Define routes for books
router.get('/', Controllers.bookController.getAllBooks);
router.get('/:id', Controllers.bookController.getBookById);

module.exports = router;