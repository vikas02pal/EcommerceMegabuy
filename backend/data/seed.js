const mongoose = require('mongoose');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopeasy';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const dataPath = path.join(__dirname, 'products.json');
    const items = JSON.parse(fs.readFileSync(dataPath));
    await Product.deleteMany({});
    await Product.insertMany(items);
    console.log('Seeded', items.length, 'products');
    process.exit(0);
  } catch (e) {
    console.error('Failed to seed:', e.message);
    process.exit(1);
  }
}

seed();
