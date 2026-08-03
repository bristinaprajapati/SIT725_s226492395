const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/neighborshareDB');

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB!');
});

// Schema definition matching seed.js
const ListingSchema = new mongoose.Schema({
    title: String,
    category: String,
    condition_rating: String,
    description: String,
    image: String
});

const Listing = mongoose.model('Listing', ListingSchema);

// REST API endpoint to retrieve all listings from MongoDB
app.get('/api/listings', async (req, res) => {
    try {
        const listings = await Listing.find({});
        res.json({ statusCode: 200, data: listings, message: 'Success' });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: err.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});