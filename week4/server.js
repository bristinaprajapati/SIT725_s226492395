const express = require("express");
const app = express();
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/myprojectDB");

// MongoDB connection
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB!");
});

// 2. Define your schema and model
//Creating a Mongoose Schema
const ProjectSchema = new mongoose.Schema({
  title: String,
  image: String,
  link: String,
  description: String,
});
const Project = mongoose.model("Project", ProjectSchema);

app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Data served via API endpoint
// const cardList = [
//   {
//     title: "Kitten 2",
//     image: "images/livedemo.png",
//     link: "About Kitten 2",
//     desciption: "Demo desciption about kitten 2",
//   },
//   {
//     title: "Kitten 3",
//     image: "images/livedemo.png",
//     link: "About Kitten 3",
//     desciption: "Demo desciption about kitten 3",
//   },
// ];

// GET endpoint to return project data
// app.get("/api/projects", (req, res) => {
//   res.json({ statusCode: 200, data: cardList, message: "Success" });
// });

// 3. REST API route
app.get('/api/projects', async (req, res) => {
const projects = await Project.find({});
res.json({ statusCode: 200, data: projects, message: "Success" });
});

// Port configuration
//start the server and listen on a port
const port = process.env.PORT || 5501;
app.listen(port, () => {
  console.log("App listening on port: " + port);
});

