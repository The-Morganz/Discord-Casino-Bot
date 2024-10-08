const rooms = require(`./rooms`);

function addBet(userId, channelId, betAmount) {
  const confirmation = rooms.setBetAmount(userId, channelId, betAmount);
  return confirmation;
}

function startGame(channelId) {
  rooms.changeGameState(channelId, true);
}
module.exports = { addBet, startGame };
