const bookService = require('../services/booksService');

// Whitelist of allowed schema fields for safe-write requests
const ALLOWED_FIELDS = ['id', 'title', 'author', 'year', 'genre', 'summary', 'price', 'currency'];

// Helper function to detect any extra fields in the request body
function hasUnknownFields(payload) {
  const keys = Object.keys(payload);
  return keys.filter(key => !ALLOWED_FIELDS.includes(key));
}

// GET /api/books - Retrieve all book records
exports.getAllBooks = async (_req, res, next) => {
  try {
    const items = await bookService.getAllBooks();
    res.status(200).json({ statusCode: 200, data: items, message: 'Books retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id - Retrieve a single book record by ID
exports.getBookById = async (req, res, next) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ statusCode: 404, message: 'Book not found' });
    }
    res.status(200).json({ statusCode: 200, data: book, message: 'Book retrieved successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/books - Create a new book record with safe-write enforcement
exports.createBook = async (req, res, next) => {
  try {
    const payload = req.body || {};

    // Reject request if extra fields outside the whitelist are sent
    const unknownKeys = hasUnknownFields(payload);
    if (unknownKeys.length > 0) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: `Unknown field(s) rejected: ${unknownKeys.join(', ')}`
      });
    }

    // Return 409 Conflict if a book with this ID already exists
    if (payload.id) {
      const existing = await bookService.getBookById(payload.id);
      if (existing) {
        return res.status(409).json({
          statusCode: 409,
          error: 'Conflict',
          message: `Book with ID "${payload.id}" already exists`
        });
      }
    }

    // Save book record; schema validation runs on save
    const newBook = await bookService.createBook(payload);
    res.status(201).json({
      statusCode: 201,
      data: newBook,
      message: 'Book created successfully'
    });
  } catch (err) {
    // Return 400 Bad Request on Mongoose validation failure
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(err.errors).map(e => e.message).join('; ')
      });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'Duplicate ID error'
      });
    }
    next(err);
  }
};

// PUT /api/books/:id - Update an existing book record
exports.updateBook = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const targetId = req.params.id;

    // Return 404 Not Found if target record does not exist
    const existing = await bookService.getBookById(targetId);
    if (!existing) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: `Book with ID "${targetId}" not found`
      });
    }

    // Enforce ID immutability: reject attempt to change ID via payload
    if (payload.id && payload.id !== targetId) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'The "id" field is immutable and cannot be modified'
      });
    }

    // Reject request if extra fields outside the whitelist are sent
    const unknownKeys = hasUnknownFields(payload);
    if (unknownKeys.length > 0) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: `Unknown field(s) rejected: ${unknownKeys.join(', ')}`
      });
    }

    // Perform update in service
    const updatedBook = await bookService.updateBook(targetId, payload);
    res.status(200).json({
      statusCode: 200,
      data: updatedBook,
      message: 'Book updated successfully'
    });
  } catch (err) {
    // Return 400 Bad Request on Mongoose validation failure
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: Object.values(err.errors).map(e => e.message).join('; ')
      });
    }
    next(err);
  }
};