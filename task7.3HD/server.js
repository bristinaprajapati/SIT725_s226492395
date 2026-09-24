const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client'); 

const app = express();
const booksRoute = require('./routes/booksRoute');
// Prometheus metrics collection
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/booksDB';

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

// Health Check Endpoint (Stage Deploy)[cite: 1, 2]
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', message: 'Server is healthy' });
});

// Prometheus Metrics Endpoint (Stage Monitoring)[cite: 1, 2]
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use('/api/books', booksRoute);

app.get('/', (_req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});