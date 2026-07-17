// Import the Express module so we can create a web server.
const express = require('express');

// Import Node.js's built-in 'path' module to help with file paths.
const path = require('path');

// Create an instance of an Express application.
const app = express();

// Define the port number to listen on.
// It uses an environment variable PORT if provided; otherwise, it defaults to 3000.
const PORT = process.env.PORT || 3000;

// Serve static files from the "public" folder.
app.use(express.static(path.join(__dirname, 'public')));

// Define a GET endpoint at '/square' that calculates the square of a number.
// Example: http://localhost:3000/square?num=
// 5

// addition of two numbers
app.get('/add', (req, res) => {
    const a = parseFloat(req.query.num1);
    const b = parseFloat(req.query.num2);

    if (isNaN(a) || isNaN(b)) {
        return res.send("Error: Please provide valid numbers using query parameters 'num1' and 'num2'.");
    }

    const sum = a + b;

    res.send(`The sum of ${a} and ${b} is: ${sum}`);
});


// Start the server.
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



// Square of a number endpoint (commented out for now)

// app.get('/square', (req, res) => {

//     // Get the 'num' query parameter and convert it to a number.
//     const num = parseFloat(req.query.num);

//     // Check whether the input is a valid number.
//     if (isNaN(num)) {
//         return res.send("Error: Please provide a valid number using query parameter 'num'.");
//     }

//     // Calculate the square.
//     const square = num * num;

//     // Send the result back to the browser.
//     res.send(`The square of ${num} is: ${square}`);
// });
