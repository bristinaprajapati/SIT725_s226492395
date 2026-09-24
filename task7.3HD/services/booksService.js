const Book = require('../models/booksModel');

// Retrieve all books from MongoDB
async function getAllBooks() {
  return await Book.find({}).lean({ getters: true });
}

// Find a single book by its custom string 'id'
async function getBookById(id) {
  return await Book.findOne({ id: id }).lean({ getters: true });
}

// Create a new book entry in MongoDB
async function createBook(bookData) {
  const newBook = new Book(bookData);
  return await newBook.save();
}

// schema validation 
async function updateBook(id, updateData) {
  return await Book.findOneAndUpdate(
    { id: id },
    { $set: updateData },
    { new: true, runValidators: true, context: 'query' }
  ).lean({ getters: true });
}

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook
};