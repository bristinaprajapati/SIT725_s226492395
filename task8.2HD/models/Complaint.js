const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      trim: true
    },

    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },

    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [5, 'Complaint must contain at least 5 characters'],
      maxlength: [500, 'Complaint cannot exceed 500 characters']
    },

    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);