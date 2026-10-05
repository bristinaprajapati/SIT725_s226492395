const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const timestampRoutes = require('./routes/timestampRoutes');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/timestamps';
mongoose.connect(mongoURL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Routes
app.use('/api', timestampRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});