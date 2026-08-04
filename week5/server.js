const express = require('express');
const app = express();
const booksRoute = require('./routes/booksRoute');

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