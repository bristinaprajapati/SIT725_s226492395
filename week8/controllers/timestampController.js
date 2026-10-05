const Timestamp = require('../models/Timestamp');

exports.handleClick = async (req, res) => {
  try {
    const newClick = new Timestamp();
    await newClick.save();
    res.json({ clickedAt: newClick.clickedAt });
  } catch (err) {
    res.status(500).json({ message: 'Failed to store timestamp' });
  }
};