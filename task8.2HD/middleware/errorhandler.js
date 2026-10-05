const errorHandler = (err, req, res, next) => {
  console.error('Server Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(
      (error) => error.message
    );

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID'
    });
  }

  // Duplicate MongoDB record
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists'
    });
  }

  // JWT errors
  if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError'
  ) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;