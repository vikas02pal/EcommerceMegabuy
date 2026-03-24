const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// helper: load fallback data
function loadFallback() {
  const p = path.join(__dirname, '..', 'data', 'products.json');
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p));
  }
  return [];
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean().limit(100);
    if (products && products.length) return res.json(products);
  } catch (e) {
    // ignore and fallback
  }
  const fallback = loadFallback();
  res.json(fallback);
});

// GET /api/products/:sku
router.get('/:sku', async (req, res) => {
  const sku = req.params.sku;
  try {
    const p = await Product.findOne({ sku }).lean();
    if (p) return res.json(p);
  } catch (e) {}
  const fallback = loadFallback().find(x => x.sku === sku);
  if (fallback) return res.json(fallback);
  res.status(404).json({ error: 'Not found' });
});

// POST /api/products/seed -> seed DB (for dev)
router.post('/seed', async (req, res) => {
  const fallback = loadFallback();
  try {
    await Product.deleteMany({});
    await Product.insertMany(fallback);
    return res.json({ seeded: fallback.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
