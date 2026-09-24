const express = require('express');
const router = express.Router();
const Controllers = require('../controllers');

// Define routes for books
router.get('/', Controllers.bookController.getAllBooks);
router.get('/:id', Controllers.bookController.getBookById);

// routes added for creating and updating books
router.post('/', Controllers.bookController.createBook);
router.put('/:id', Controllers.bookController.updateBook);

module.exports = router;