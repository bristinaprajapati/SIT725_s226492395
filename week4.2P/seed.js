const mongoose = require('mongoose');

// Connect to MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/neighborshareDB';
mongoose.connect(MONGO_URI);

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB for seeding!');
});

// Schema for NeighborShare items
const ListingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    condition_rating: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
});

const Listing = mongoose.model('Listing', ListingSchema);

// Custom sample data 
const sampleListings = [
    {
        title: "High-Pressure Washer",
        category: "Tools & Equipment",
        condition_rating: "Like New",
        description: "3000 PSI gas pressure washer, perfect for driveways and decks.",
        image: "images/livedemo.png"
    },
    {
        title: "4-Person Camping Tent",
        category: "Outdoors",
        condition_rating: "Good",
        description: "Waterproof dome tent with rainfly, easy to set up.",
        image: "images/livedemo.png"
    },
    {
        title: "Electric Lawn Mower",
        category: "Gardening",
        condition_rating: "Excellent",
        description: "Corded electric mower with grass catcher bag.",
        image: "images/livedemo.png"
    }
];

// Function to populate database
async function seedDB() {
    try {
        await Listing.deleteMany({}); // Clears out old entries
        await Listing.insertMany(sampleListings);
        console.log("Database seeded successfully with NeighborShare listings!");
    } catch (err) {
        console.error("Error seeding database:", err);
    } finally {
        mongoose.connection.close();
    }
}

seedDB();