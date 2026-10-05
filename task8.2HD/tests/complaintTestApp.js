// Minimal Express app used only for Complaint module tests.
// MongoDB is mocked, so a live database is not required.

const express = require('express');

const complaintRoutes =
  require('../routes/complaintRoutes');

const errorHandler =
  require('../middleware/errorhandler');


const app = express();

app.use(express.json());


// Complaint API
app.use(
  '/api/complaints',
  complaintRoutes
);


// Central error handler
app.use(errorHandler);


module.exports = app;