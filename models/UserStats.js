const mongoose = require("mongoose");

const usetStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  games: {
    blackjack: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      gamesBlackjack: { type: Number, default: 0 },
      gamesPushed: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    rolls: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    coinflip: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    grid: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    horse: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    nba: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
    skillChallenge: {
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      gamesLost: { type: Number, default: 0 },
      coinsWon: { type: Number, default: 0 },
      coinsLost: { type: Number, default: 0 },
    },
  },
  shop: {
    itemsBought: { type: Number, default: 0 },
    coinsLost: { type: Number, default: 0 },
  },
  dailiesDone: { type: Number, default: 0 },
  coinsGiven: { type: Number, default: 0 },
  leaderboardSpot: { type: Number, default: 0 },
  highestStreak: { type: Number, default: 0 },
  minutesInVoice: { type: Number, default: 0 },
  coinsGainedInVoice: { type: Number, default: 0 },
});

const UserStats = mongoose.model("UserStats", usetStatsSchema);
module.exports = UserStats;
