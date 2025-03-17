const mongoose = require("mongoose");

// const NBASchema = new mongoose.Schema({
//   id: { type: Number, required: true },
//   sport_key: {type:Number},
//   sport_title: { type: String, required: true, default: `NBA` },
//   commenceTime: { type: String, required: true },
//   homeTeam: { type: String, required: true },
//   awayTeam: { type: String, required: true },
//   bookmakers:{type:Array},
//   homeTeamOdds: { type: Number },
//   awayTeamOdds: { type: Number },
//   lastUpdateTime: { type: String },
// });

const OutcomeSchema = new mongoose.Schema({
  name: String,
  price: Number,
});

const MarketSchema = new mongoose.Schema({
  key: String,
  last_update: String,
  outcomes: [OutcomeSchema],
});

const BookmakerSchema = new mongoose.Schema({
  key: String,
  title: String,
  last_update: String,
  markets: [MarketSchema],
});

const GameSchema = new mongoose.Schema({
  id: String,
  sport_key: String,
  sport_title: String,
  commence_time: String, // You can use Date type if needed
  home_team: String,
  away_team: String,
  bookmakers: [BookmakerSchema],
  lastUpdateTime: { type: String, default: getCurrentISODate() },
  homeTeamScore: Number,
  awayTeamScore: Number,
  completed: Boolean,
  gameIndex: { type: Number, default: 0 },
});

function getCurrentISODate() {
  return new Date().toISOString().split(".")[0] + "Z";
}

const NBAStats = mongoose.model("NBAStats", GameSchema);
module.exports = NBAStats;
