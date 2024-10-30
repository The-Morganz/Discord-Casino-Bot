// models/DailyChallenge.js
const mongoose = require("mongoose");

const dailyChallengeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  date: { type: String, required: true }, // Format: "YYYY-MM-DD"
  completed: { type: Boolean, default: false },
  gainedXpReward: { type: Boolean, default: false },
  challengeType: { type: String, enum: ["message", "image"], required: true },
  messages: { type: Number, default: 0 }, // Only for "message" challenges
  requiredMessages: { type: Number, default: 0 }, // Only for "message" challenges
  imagesSent: { type: Number, default: 0 }, // Only for "image" challenges
  requiredImages: { type: Number, default: 0 }, // Only for "image" challenges
});
// dailyChallengeSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyChallenge = mongoose.model("DailyChallenge", dailyChallengeSchema);
module.exports = DailyChallenge;
