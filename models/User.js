const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  customName: { type: String, required: true, default: `Unknown User` },
  originalName: { type: String, required: true, default: `Unknown User` },
  coins: { type: Number, default: 0 },
  debt: { type: Number, default: 0 },
  freeSpins: { type: Number, default: 0 },
  freeSpinsBetAmount: { type: Number, default: 0 }, // Ensure this field is defined here
  selectedTheme: { type: String, default: `Fruits` },
});
userSchema.pre("save", function (next) {
  const customNameChangeDefault = this.customName === `Unknown User`;
  if (customNameChangeDefault) {
    this.customName = `Unknown User`;
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
