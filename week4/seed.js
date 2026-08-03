const mongoose = require('mongoose');

// Connect to MongoDB
const MONGO_URI = 'mongodb://127.0.0.1:27017/myprojectDB';
mongoose.connect(MONGO_URI);

// Define Project Schema & Model
const ProjectSchema = new mongoose.Schema({
    title: String,
    image: String,
    link: String,
    description: String,
});
const Project = mongoose.model('Project', ProjectSchema);

// Create and save sample project
const sampleProject = new Project({
    title: "Kitten 4",
    image: "images/livedemo.png",
    link: "About Kitten 4",
    description: "Demo description about kitten 4"
});

sampleProject.save().then(() => {
    console.log("Sample project saved!");
    mongoose.connection.close(); // Close connection after saving
}).catch((err) => {
    console.error("Error saving sample project:", err);
});