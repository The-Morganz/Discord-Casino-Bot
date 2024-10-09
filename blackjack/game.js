const rooms = require(`./rooms`);

function startGame(channelId) {
  rooms.changeGameState(channelId, "betting", true);
  console.log(`place yo betz`);
}
module.exports = { startGame };
