const mongoose = require("mongoose");

const horseRacingSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true, default: 0 },
  horseNumber: { type: Number },
  betAmount: { type: Number, default: 0 },
  notify: { type: Boolean, default: false },
});

const horseRacing = mongoose.model("horseRacing", horseRacingSchema);
module.exports = horseRacing;
