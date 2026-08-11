const express = require('express');
const mongoose = require('mongoose');

const app = express();
const booksRoute = require('./routes/booksRoute');

const mongoUri = 'mongodb://127.0.0.1:27017/booksDB';

mongoose.connect(mongoUri);

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/books', booksRoute);

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});