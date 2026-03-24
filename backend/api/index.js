const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// serve frontend static files from public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// connect to MongoDB if available
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopeasy';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB not available, continuing with in-memory data'));

const productsRouter = require('../routes/products');
app.use('/api/products', productsRouter);

// root route - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// catch-all for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
