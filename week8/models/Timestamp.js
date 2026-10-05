const mongoose = require('mongoose');

const TimestampSchema = new mongoose.Schema({
  clickedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Timestamp', TimestampSchema);