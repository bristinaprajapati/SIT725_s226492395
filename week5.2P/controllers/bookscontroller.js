const bookService = require('../services/booksService');

exports.getAllBooks = async (_req, res, next) => {
  try {
    const items = await bookService.getAllBooks();
    res.status(200).json({
      statusCode: 200,
      data: items,
      message: 'Books retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};

exports.getBookById = async (req, res, next) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ statusCode: 404, message: 'Book not found' });
    }
    res.status(200).json({
      statusCode: 200,
      data: book,
      message: 'Book retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
};
