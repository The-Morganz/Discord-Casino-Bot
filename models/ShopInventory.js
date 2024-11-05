const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  price: { type: Number, required: true, default: 0 },
});

const ShopInventory = mongoose.model("shopInventory", shopSchema);
module.exports = ShopInventory;
