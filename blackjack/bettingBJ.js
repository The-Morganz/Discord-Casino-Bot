const rooms = require(`./rooms`);

function addBet(userId, channelId, betAmount) {
  const confirmation = rooms.setBetAmount(userId, channelId, betAmount);
  return confirmation;
}

module.exports = { addBet };
