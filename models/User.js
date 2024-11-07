const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  customName: { type: String },
  coins: { type: Number, default: 0 },
  debt: { type: Number, default: 0 },
  freeSpins: { type: Number, default: 0 },
  freeSpinsBetAmount: { type: Number, default: 0 }, // Ensure this field is defined here
});
// rollPlayed: { type: Number, default: 0 },
// bjPlayed: { type: Number, default: 0 },
// gridPlayed: { type: Number, default: 0 },
// flipsPlayed: { type: Number, default: 0 },
// flipsWon: { type: Number, default: 0 },

const User = mongoose.model("User", userSchema);
module.exports = User;
