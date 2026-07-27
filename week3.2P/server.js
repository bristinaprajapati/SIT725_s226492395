

const express = require("express");
const app = express();
const port = process.env.PORT || 8000;

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Dummy data array replacing the Kitten array
const plantList = [
    {
        title: "Monstera Deliciosa",
        image: "images/plant2.png", 
        link: "Learn More",
        description: "Thrives in bright to medium indirect light. Requires watering every 1-2 weeks."
    },
    {
        title: "Snake Plant",
        image: "images/plant3.png", 
        link: "Learn More",
        description: "Low maintenance plant that tolerates low light and dry air efficiently."
    },
   
];

// GET REST Endpoint
app.get('/api/plants', (req, res) => {
    res.json({ statusCode: 200, data: plantList, message: "Plants retrieved successfully" });
});

app.listen(port, () => {
    console.log("App listening to port: " + port);
});