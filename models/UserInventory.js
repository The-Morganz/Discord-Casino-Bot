const mongoose = require("mongoose");

const inventoryItemsSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  price: { type: String, required: true },
  startTime: { type: Number, required: false },
  endTime: { type: Number, required: false },
  riskTaker: { type: Boolean, default: false },
});

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  inventory: [inventoryItemsSchema],
});

const Inventories = mongoose.model("userInventories", inventorySchema);
module.exports = Inventories;
