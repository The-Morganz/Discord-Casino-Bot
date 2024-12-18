// models/DailyChallenge.js
const mongoose = require("mongoose");

const dailyChallengeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  challenges: { type: Array, required: true },
  streak: { type: Number, required: true, default: 0 },
  streakDate: { type: String, required: true },
});

const DailyChallenge = mongoose.model("DailyChallenge", dailyChallengeSchema);
module.exports = DailyChallenge;
