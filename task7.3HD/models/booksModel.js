const mongoose = require('mongoose');

// Get the current year dynamically 
const currentYear = new Date().getFullYear();

const BookSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Book ID is required'],
    unique: true,
    index: true,
    // ID must start with 'b' followed by numbers, like 'b1' or 'b100'
    match: [/^b\d+$/, 'ID must follow the pattern "b" followed by digits (e.g., b100)']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    //Title shouldn't be empty or too long
    minlength: [2, 'Title must be at least 2 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    // Author name must be between 2 and 100 characters
    minlength: [2, 'Author name must be at least 2 characters long'],
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  year: {
    type: Number,
    required: [true, 'Publication year is required'],
    // Year is a whole number nodecimal
    validate: {
      validator: Number.isInteger,
      message: 'Year must be a whole integer'
    },
    min: [1000, 'Year must be at least 1000'],
    max: [currentYear, `Year cannot be in the future (max: ${currentYear})`]
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    trim: true,
    minlength: [3, 'Genre must be at least 3 characters long'],
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  summary: {
    type: String,
    required: [true, 'Summary is required'],
    trim: true,
    // at least 10 chars, max 1000
    minlength: [10, 'Summary must be at least 10 characters long'],
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  },
  price: {
    type: mongoose.Decimal128,
    required: [true, 'Price is required'],
    get: v => v?.toString(),
    // Custom validator to make sure price is between $0.01 and $1000 AUD
    validate: {
      validator: function(v) {
        if (!v) return false;
        const val = parseFloat(v.toString());
        return !isNaN(val) && val >= 0.01 && val <= 1000.00;
      },
      message: 'Price must be a valid number between 0.01 and 1000.00 AUD'
    }
  },
  currency: {
    type: String,
    required: true,
    default: 'AUD',
    enum: ['AUD'] //Only allow AUD currency
  }
}, {
  toJSON: { getters: true, virtuals: false, transform(_doc, ret) { delete ret.__v; return ret; } },
  toObject: { getters: true, virtuals: false }
});

module.exports = mongoose.model('Book', BookSchema);