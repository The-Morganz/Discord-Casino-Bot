const mongoose = require("mongoose");

const playersSchema = new mongoose.Schema({
  gameId: String,
  whatTeam: String,
  completed: Boolean,
  ticketId: Number,
  quotaOnGame: Number,
  indexOfHomeTeam: Number,
  indexOfAwayTeam: Number,
});
const gamesSchema = new mongoose.Schema({
  ticket: [playersSchema],
  quotaOnWin: { type: Number, default: 1 },
  betAmount: Number,
  temporaryBetAmount: Number,
  checkedIfWinner: Boolean,
  winner: Boolean,
  checkedForDaily: Boolean,
});

const NBAPlayerTickets = new mongoose.Schema({
  userId: String,
  tickets: [gamesSchema],
  selectedTicket: { type: Number, default: 0, required: true },
});

const NBABets = mongoose.model("NBAPlayerTickets", NBAPlayerTickets);
module.exports = NBABets;
