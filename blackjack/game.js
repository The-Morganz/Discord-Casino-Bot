const rooms = require(`./rooms`);
const wallet = require(`../wallet`);

function startBettingPhase(channelId) {
  rooms.changeGameState(channelId, "betting", true);
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
    let message = `<@${player.userId}> got a ${unoRandomNumero}, their sum is ${player.sum}`;
    if (player.sum === 21) {
      player.played = true;
      message = `<@${player.userId}> got a ${unoRandomNumero}, their sum is ${player.sum}. **BLACKJACK**`;
    }

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
function aceSave(cards, sum) {
  let saved = false;
  if (cards.includes(11)) {
    if (sum - 10 <= 21) {
      saved = true;
    }
  }
  return saved;
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
      if (aceSave(thePlayer.cards, thePlayer.sum)) {
        thePlayer.sum -= 10;
        const aceIndex = thePlayer.cards.indexOf(11);
        thePlayer.cards.splice(aceIndex, 1);
        thePlayer.cards.push(1);
        return {
          bust: false,
          cardTheyGot: unoRandomNumero,
          theirSum: thePlayer.sum,
          aceSave: true,
        };
      }
      const whoNextString = whoIsUpNext(channelId);
      return {
        bust: true,
        cardTheyGot: unoRandomNumero,
        theirSum: thePlayer.sum,
        aceSave: false,
      };
    }
    return {
      bust: false,
      cardTheyGot: unoRandomNumero,
      theirSum: thePlayer.sum,
      aceSave: false,
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
    if (!whoNextString) {
      eventEmitter.emit("upNext", whoNextString, channelToSendTo, "dealer");
      return;
    }
    eventEmitter.emit("upNext", whoNextString, channelToSendTo);
  }
}
async function dealerTurn(channelId, eventEmitter, channelToSendTo) {
  const dealer = rooms.findRoom(channelId).dealer;
  await sleep(1000);

  if (dealer.sum >= 17 && dealer.sum <= 21) {
    // Dealer stand
    eventEmitter.emit("dealerTurn", `stand`, channelToSendTo);
    return;
  }
  if (dealer.sum < 17) {
    // Dealer hit
    const unoRandomNumero = randomNumber(2, 11);
    dealer.sum += unoRandomNumero;
    dealer.cards.push(unoRandomNumero);
    eventEmitter.emit("dealerTurn", `hit`, channelToSendTo);
    await sleep(1000);
    dealerTurn(channelId, eventEmitter, channelToSendTo);
    return;
  }
  if (dealer.sum > 21) {
    if (aceSave(dealer.cards, dealer.sum)) {
      dealer.sum -= 10;
      const aceIndex = dealer.cards.indexOf(11);
      dealer.cards.splice(aceIndex, 1);
      dealer.cards.push(1);
      eventEmitter.emit("dealerTurn", `aceSave`, channelToSendTo);
      await sleep(1000);
      dealerTurn(channelId, eventEmitter, channelToSendTo);
      return;
    }
    await sleep(1000);
    eventEmitter.emit("dealerTurn", `bust`, channelToSendTo);
  }
}

async function endGame(channelId, channelToSendTo, eventEmitter) {
  const thatRoom = rooms.findRoom(channelId);
  let message;
  await sleep(1000);
  for (let i = 0; i < thatRoom.players.length; i++) {
    const player = thatRoom.players[i];
    if (player.sum > thatRoom.dealer.sum && player.sum <= 21) {
      message = `<@${player.userId}> has won +${player.betAmount * 2}`;
      wallet.addCoins(player.userId, player.betAmount * 2);
    }
    if (player.sum > 21) {
      message = `<@${player.userId}> has BUST! They have lost -${player.betAmount}`;
      wallet.removeCoins(player.userId, player.betAmount);
    }
    if (thatRoom.dealer.sum > player.sum && thatRoom.dealer.sum <= 21) {
      message = `<@${player.userId}> has ${player.sum} while the DEALER has ${thatRoom.dealer.sum}. They have lost -${player.betAmount}`;
      wallet.removeCoins(player.userId, player.betAmount);
    }
    if (thatRoom.dealer.sum > 21 && player.sum <= 21) {
      message = `<@${player.userId}> has won +${player.betAmount * 2}`;
      wallet.addCoins(player.userId, player.betAmount * 2);
    }
    if (player.sum === 21) {
      message = `<@${
        player.userId
      }> has gotten a BLACKJACK, resulting in bigger winnings. They have won +${
        player.betAmount * 3
      }`;
      wallet.addCoins(player.userId, player.betAmount * 3);
    }
    if (thatRoom.dealer.sum === player.sum && player.sum < 21) {
      message = `<@${player.userId}> has the same sum as the DEALER, resulting in a push. They haven't gained or lost anything.`;
    }

    eventEmitter.emit("endGame", message, channelToSendTo);
    await sleep(1000);
  }
  eventEmitter.emit("restartGame", channelToSendTo);
}

module.exports = {
  startBettingPhase,
  startDealing,
  hit,
  stand,
  dealerTurn,
  endGame,
};
