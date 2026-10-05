const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  roomId: { type: String, required: true },
  roomTitle: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
applicationSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['Pending', 'Approved'] } }
  }
);
module.exports = mongoose.model('Application', applicationSchema);