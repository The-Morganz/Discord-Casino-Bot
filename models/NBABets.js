const mongoose = require("mongoose");

const playersSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  betAmount: { type: Number },
  whatTeam: String,
  betBefore: { type: Number, default: 0 },
});

const NBABetsSchema = new mongoose.Schema({
  gameId: { type: String, unique: true },
  players: [playersSchema],
});

const NBABets = mongoose.model("NBABets", NBABetsSchema);
module.exports = NBABets;
