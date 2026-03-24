const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  sku: { type: String, unique: true },
  title: String,
  price: Number,
  description: String,
  image: String,
  tags: [String]
});

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
