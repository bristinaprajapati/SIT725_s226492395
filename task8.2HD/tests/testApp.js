// A minimal Express app used only in tests.
// It mounts the real rooms router but skips the MongoDB connection,
// login pages, and everything else in server.js so the Room API
// can be tested in isolation with a mocked Room model.
const express = require('express');
const roomRoutes = require('../src/routes/rooms');
const errorHandler = require('../middleware/errorhandler');

const app = express();
app.use(express.json());
app.use('/api/rooms', roomRoutes);
app.use(errorHandler);

module.exports = app;