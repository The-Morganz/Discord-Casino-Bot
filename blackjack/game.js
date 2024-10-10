const { unorderedList } = require("discord.js");
const rooms = require(`./rooms`);

function startBettingPhase(channelId) {
  rooms.changeGameState(channelId, "betting", true);
  console.log(`place yo betz`);
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + 1) + min;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// please lord have mercy on my soul
async function startDealing(eventEmitter, channelId, channelToSendTo) {
  // Example function that triggers a message
  const thePlayingRoom = rooms.findRoom(channelId);
  for (let i = 0; i < thePlayingRoom.players.length; i++) {
    const player = thePlayingRoom.players[i];
    const unoRandomNumero = randomNumber(2, 11);
    player.sum += unoRandomNumero;
    player.cards.push(unoRandomNumero);
    const message = `<@${player.userId}> got a ${unoRandomNumero}, their sum is ${player.sum}`;
    eventEmitter.emit("beginningBJ", message, channelToSendTo);
    await sleep(1000);
  }

  const dealer = thePlayingRoom.dealer;
  if (dealer.cards.length === 1) {
    const message = whoIsUpNext(channelId);
    rooms.changeGameState(channelId, `dealing`, false);
    rooms.changeGameState(channelId, `playing`, true);
    eventEmitter.emit("upNext", message, channelToSendTo);
  }
  if (dealer.cards.length === 0) {
    const unoRandomNumero = randomNumber(2, 11);
    dealer.sum += unoRandomNumero;
    dealer.cards.push(unoRandomNumero);

    const message = `THE DEALER HAS A ${dealer.sum}`;
    eventEmitter.emit("beginningBJ", message, channelToSendTo);
    await sleep(1000);
    startDealing(eventEmitter, channelId, channelToSendTo);
  }
}

function whoIsUpNext(channelId) {
  const thatRoom = rooms.findRoom(channelId);
  console.log(`THIS IS THE ROOM V`);
  console.log(thatRoom);
  let whoIsNext;
  try {
    thatRoom.players.forEach((e) => {
      if (e.played) {
        e.turn = false;
        return;
      }
      whoIsNext = e.userId;
      e.turn = true;
      throw whoIsNext;
    });
  } catch (upNext) {
    return upNext;
  }
  if (!whoIsNext) {
    return whoIsNext;
  }
}
function hit(userId, channelId, eventEmitter, channelToSendTo) {
  const thatRoom = rooms.findRoom(channelId);
  let thePlayer;
  try {
    thatRoom.players.forEach((e) => {
      if (e.userId === userId) {
        thePlayer = e;
        throw error;
      }
    });
  } catch (error) {
    const unoRandomNumero = randomNumber(2, 11);
    thePlayer.sum += unoRandomNumero;
    thePlayer.cards.push(unoRandomNumero);
    if (thePlayer.sum > 21) {
      const whoNextString = whoIsUpNext(channelId);
      return {
        bust: true,
        cardTheyGot: unoRandomNumero,
        theirSum: thePlayer.sum,
      };
    }
    return {
      bust: false,
      cardTheyGot: unoRandomNumero,
      theirSum: thePlayer.sum,
    };
  }
}
function stand(userId, channelId, eventEmitter, channelToSendTo) {
  const thatRoom = rooms.findRoom(channelId);
  let aPersonIsPlaying = false;
  try {
    thatRoom.players.forEach((e) => {
      if (e.userId === userId) {
        e.played = true;
        const whoNextString = whoIsUpNext(channelId);
        throw whoNextString;
      }
    });
  } catch (whoNextString) {
    console.log(whoNextString);
    if (!whoNextString) {
      eventEmitter.emit("upNext", whoNextString, channelToSendTo, "dealer");
      return;
    }
    eventEmitter.emit("upNext", whoNextString, channelToSendTo);
  }
}

module.exports = { startBettingPhase, startDealing, hit, stand };
