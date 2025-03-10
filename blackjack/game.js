const rooms = require(`./rooms`);
const wallet = require(`../wallet`);
const { makeDeck } = require("./makeDeck");
const User = require(`../models/UserStats`);
const xpSystem = require("../xp/xp");
const dailyChallenges = require(`../daily/daily`);
const UserStats = require("../models/UserStats");
const xpGain = 15;
function startBettingPhase(channelId, eventEmitter, channelToSendTo) {
  rooms.changeGameState(channelId, "betting", true);

  const room = rooms.findRoom(channelId);
  room.bettingStartTime = new Date();
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + 1) + min;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function resetDeckCounter(channeId) {
  const thatRoom = rooms.findRoom(channeId);
  thatRoom.resetDeck = 0;
}
// please lord have mercy on my soul
async function startDealing(eventEmitter, channelId, channelToSendTo) {
  // Example function that triggers a message
  const thePlayingRoom = rooms.findRoom(channelId);
  if (!thePlayingRoom.players.length) {
    return;
  }
  rooms.changeGameState(channelId, "betting", false);
  rooms.changeGameState(channelId, "playing", true);
  if (!thePlayingRoom.resetDeck) {
    thePlayingRoom.deckOfCards = makeDeck();
    thePlayingRoom.resetDeck = 1;
  }
  for (let i = 0; i < thePlayingRoom.players.length; i++) {
    const player = thePlayingRoom.players[i];
    const randomNumberFromDeck = randomNumber(
      0,
      thePlayingRoom.deckOfCards.length - 1
    );
    player.prevBetAmount = player.betAmount;
    const randomCard = thePlayingRoom.deckOfCards[randomNumberFromDeck];
    const unoRandomNumero = Number(randomCard.replace(/\D/g, ""));
    thePlayingRoom.deckOfCards.splice(randomNumberFromDeck, 1);
    player.sum += unoRandomNumero;
    player.cards.push(unoRandomNumero);
    if (player.sum === 22) {
      player.sum -= 10;
      const aceIndex = player.cards.indexOf(11);
      player.cards.splice(aceIndex, 1);
      player.cards.push(1);
    }
    let message = `:mag: <@${player.userId}> got a ${unoRandomNumero}, their sum is ${player.sum} :mag:`;
    if (player.sum === 21) {
      player.played = true;
      player.natBlackjack = true;
      message = `:fireworks: <@${player.userId}> has gotten ${unoRandomNumero}, which means they got a **BLACKJACK!** :fireworks:`;
      // await sleep(1000);
      // message = `:fireworks: <@${player.userId}> got a ${unoRandomNumero}, their sum is ${player.sum}. **BLACKJACK** :fireworks:`;
    }
    eventEmitter.emit("beginningBJ", message, channelToSendTo);
    await sleep(1000);
  }

  const dealer = thePlayingRoom.dealer;
  if (dealer.cards.length === 1) {
    const message = whoIsUpNext(channelId);
    rooms.changeGameState(channelId, "dealing", false);
    const unoRandomNumero = dealer.cards[0];
    if (unoRandomNumero === 10 || unoRandomNumero === 11) {
      const checkMessage = `:bust_in_silhouette: THE DEALER is checking their other card. :bust_in_silhouette:`;
      eventEmitter.emit("beginningBJ", checkMessage, channelToSendTo);
      await sleep(2500);
      const randomNumberFromDeck = randomNumber(
        0,
        thePlayingRoom.deckOfCards.length - 1
      );
      const randomCard2 = thePlayingRoom.deckOfCards[randomNumberFromDeck];
      const unoRandomNumero2 = Number(randomCard2.replace(/\D/g, ""));
      const sumOfCards = unoRandomNumero + unoRandomNumero2;
      if (sumOfCards === 21) {
        const dealerNatBjMessage = `:bust_in_silhouette: THE DEALER GOT A **${unoRandomNumero2}**, NATURAL BLACKJACK :bust_in_silhouette:`;
        eventEmitter.emit("beginningBJ", dealerNatBjMessage, channelToSendTo);
        // thePlayingRoom.deckOfCards.splice(randomNumberFromDeck, 1);
        dealer.sum += unoRandomNumero2;
        dealer.cards.push(unoRandomNumero2);
        dealer.natBlackjack = true;
        endGame(channelId, channelToSendTo, eventEmitter);
        return;
      }
      dealer.checkFailed = true;
      eventEmitter.emit(
        "beginningBJ",
        `:bust_in_silhouette: THE DEALER has a disappointed look on their face. :bust_in_silhouette:`,
        channelToSendTo
      );
      await sleep(1000);
    }
    if (thePlayingRoom.players.every((player) => player.played === true)) {
      eventEmitter.emit("upNext", message, channelToSendTo, "dealer");
      return;
    }
    eventEmitter.emit("upNext", message, channelToSendTo);
  }
  if (dealer.cards.length === 0) {
    const randomNumberFromDeck = randomNumber(
      0,
      thePlayingRoom.deckOfCards.length - 1
    );
    const randomCard = thePlayingRoom.deckOfCards[randomNumberFromDeck];
    const unoRandomNumero = Number(randomCard.replace(/\D/g, ""));
    thePlayingRoom.deckOfCards.splice(randomNumberFromDeck, 1);
    dealer.sum += unoRandomNumero;
    dealer.cards.push(unoRandomNumero);
    const message = `:bust_in_silhouette: THE DEALER HAS A **${dealer.sum}** :bust_in_silhouette:`;
    eventEmitter.emit("beginningBJ", message, channelToSendTo);
    await sleep(1000);
    startDealing(eventEmitter, channelId, channelToSendTo);
  }
}
// function startTurnTimer(userId,channelId,eventEmmiter,channelToSendTo) {

// }

function whoIsUpNext(channelId) {
  const thatRoom = rooms.findRoom(channelId);
  let whoIsNext;
  try {
    thatRoom.players.forEach((e, i, arr) => {
      if (e.played && arr.length === 1) {
        e.turn = false;
        return;
      }
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
    const randomNumberFromDeck = randomNumber(
      0,
      thatRoom.deckOfCards.length - 1
    );
    const randomCard = thatRoom.deckOfCards[randomNumberFromDeck];
    const unoRandomNumero = Number(randomCard.replace(/\D/g, ""));
    thatRoom.deckOfCards.splice(randomNumberFromDeck, 1);
    thePlayer.sum += unoRandomNumero;
    thePlayer.cards.push(unoRandomNumero);
    if (thatRoom.deckOfCards.length <= 6) {
      thatRoom.deckOfCards = makeDeck();
    }
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
async function doubleDown(userId, channelId, eventEmitter, channelToSendTo) {
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
    const randomNumberFromDeck = randomNumber(
      0,
      thatRoom.deckOfCards.length - 1
    );
    const randomCard = thatRoom.deckOfCards[randomNumberFromDeck];
    const unoRandomNumero = Number(randomCard.replace(/\D/g, ""));

    thatRoom.deckOfCards.splice(randomNumberFromDeck, 1);
    thePlayer.sum += unoRandomNumero;
    thePlayer.cards.push(unoRandomNumero);
    if (thatRoom.deckOfCards.length <= 6) {
      thatRoom.deckOfCards = makeDeck();
    }
    await wallet.removeCoins(thePlayer.userId, thePlayer.betAmount);
    thePlayer.betAmount *= 2;
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
async function stand(userId, channelId, eventEmitter, channelToSendTo) {
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
      await sleep(2000);
      eventEmitter.emit("upNext", whoNextString, channelToSendTo, "dealer");
      return;
    }
    await sleep(2000);
    eventEmitter.emit("upNext", whoNextString, channelToSendTo);
  }
}
async function dealerTurn(channelId, eventEmitter, channelToSendTo) {
  const thatRoom = rooms.findRoom(channelId);
  const dealer = rooms.findRoom(channelId).dealer;
  await sleep(1000);

  if (dealer.sum >= 17 && dealer.sum <= 21) {
    // Dealer stand
    eventEmitter.emit("dealerTurn", `stand`, channelToSendTo);
    return;
  }
  if (dealer.sum < 17) {
    // Dealer hit

    const randomNumberFromDeck = randomNumber(
      0,
      thatRoom.deckOfCards.length - 1
    );
    const randomCard = thatRoom.deckOfCards[randomNumberFromDeck];
    const unoRandomNumero = Number(randomCard.replace(/\D/g, ""));
    if (dealer.checkFailed && dealer.cards.length === 1) {
      const currentSum = dealer.sum + unoRandomNumero;
      if (currentSum === 21) {
        dealerTurn(channelId, eventEmitter, channelToSendTo);
        return;
      }
    }
    thatRoom.deckOfCards.splice(randomNumberFromDeck, 1);
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
  let dealerBeatAmount = 0;
  await sleep(1000);
  for (let i = 0; i < thatRoom.players.length; i++) {
    const player = thatRoom.players[i];
    if (player.natBlackjack && thatRoom.dealer.natBlackjack) {
      message = `:rightwards_pushing_hand: <@${player.userId}> has gotten a NATURAL **BLACKJACK**, but the DEALER also got a NATURAL **BLACKJACK**, resulting in a push. *You notice that the DEALER smiles at you.* :rightwards_pushing_hand:`;
      await wallet.addCoins(player.userId, player.betAmount, true);
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        { $inc: { "games.blackjack.gamesPushed": 1 } },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
    }
    if (player.natBlackjack) {
      const coinMessage = await wallet.addCoins(
        player.userId,
        player.betAmount * 3
      );
      const formattedGain = wallet.formatNumber(player.betAmount * 3);
      message = `:fireworks: <@${
        player.userId
      }> has gotten a NATURAL BLACKJACK and has won +${formattedGain} :fireworks:${
        coinMessage !== `` ? `\n${coinMessage}` : ``
      }`;
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            "games.blackjack.gamesBlackjack": 1,
            "games.blackjack.coinsWon": player.betAmount * 2,
            "games.blackjack.gamesWon": 1,
          },
        },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
    }
    if (player.sum > thatRoom.dealer.sum && player.sum <= 21) {
      const coinMessage = await wallet.addCoins(
        player.userId,
        player.betAmount * 2
      );
      const formattedGain = wallet.formatNumber(player.betAmount * 2);
      message = `:gem: <@${player.userId}> has won +${formattedGain} :gem:${
        coinMessage !== `` ? `\n${coinMessage}` : ``
      }`;
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            "games.blackjack.gamesWon": 1,
            "games.blackjack.coinsWon": player.betAmount,
          },
        },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
    }
    if (player.sum > 21) {
      const formattedLoss = wallet.formatNumber(player.betAmount);
      message = `:boom: <@${player.userId}> has BUST! They have lost -${formattedLoss} :boom:`;
      if (thatRoom.dealer.sum <= 21) {
        dealerBeatAmount++;
      }
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            "games.blackjack.gamesLost": 1,
            "games.blackjack.coinsLost": player.betAmount,
          },
        },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
      // wallet.removeCoins(player.userId, player.betAmount);
    }
    if (thatRoom.dealer.sum > player.sum && thatRoom.dealer.sum <= 21) {
      const formattedLoss = wallet.formatNumber(player.betAmount);
      message = `:performing_arts: <@${player.userId}> has ${player.sum} while the DEALER has ${thatRoom.dealer.sum}. They have lost -${formattedLoss} :performing_arts:`;
      dealerBeatAmount++;
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            "games.blackjack.gamesLost": 1,
            "games.blackjack.coinsLost": player.betAmount,
          },
        },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
      // wallet.removeCoins(player.userId, player.betAmount);
    }
    if (thatRoom.dealer.sum > 21 && player.sum <= 21) {
      const coinMessage = await wallet.addCoins(
        player.userId,
        player.betAmount * 2
      );
      const formattedGain = wallet.formatNumber(player.betAmount * 2);
      message = `:gem: <@${player.userId}> has won +${formattedGain} :gem:${
        coinMessage !== `` ? `\n${coinMessage}` : ``
      }`;
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        {
          $inc: {
            "games.blackjack.gamesWon": 1,
            "games.blackjack.coinsWon": player.betAmount,
          },
        },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
    }
    if (thatRoom.dealer.sum === player.sum && player.sum <= 21) {
      message = `:rightwards_pushing_hand: <@${player.userId}> has the same sum as the DEALER, resulting in a push. They haven't gained or lost anything. :rightwards_pushing_hand:`;
      await wallet.addCoins(player.userId, player.betAmount, true);
      await UserStats.findOneAndUpdate(
        { userId: player.userId },
        { $inc: { "games.blackjack.gamesPushed": 1 } },
        { upsert: true }
      );
      eventEmitter.emit("endGame", message, channelToSendTo);
      await sleep(1000);
      continue;
    }
  }
  if (dealerBeatAmount === thatRoom.players.length && dealerBeatAmount > 1) {
    await sleep(1000);
    const tauntMessages = [
      `*Did you guys even try?*`,
      `*It was that easy.*`,
      `*Come on, I expected more of a challenge.*`,
      `*I could do this all day!*`,
      `*Normally I don't take donations.*`,
      `*I'm starting to think you guys enjoy losing.*`,
      `*Are you sure you guys know how to play this game?*`,
      `*I wasn't even paying attention and you guys still lost?*`,
      `*Thank you for making my job this easy.*`,
      `*Oh wow, you **all** lost? Again? I am shocked.*`,
      `*Man, I almost feel bad for you guys.*`,
      `*Honestly, this feels unfair. I mean, for you.*`,
      `*I'd offer some advice, but I doubt it would help you.*`,
      `*Wait, you were actually trying?*`,
      `*Wow. Just… wow. I've never seen a group so **unqualified** for this game.*`,
      `*Just like that.*`,
    ];
    const tauntMessage =
      tauntMessages[Math.floor(Math.random() * tauntMessages.length)];
    eventEmitter.emit(
      "endGame",
      `:bust_in_silhouette: ${tauntMessage} :bust_in_silhouette:`,
      channelToSendTo
    );
    await sleep(1000);
  }
  for (let i = 0; i < thatRoom.players.length; i++) {
    const xpGainAfterCut = await xpSystem.calculateXpGain(
      thatRoom.players[i].betAmount,
      xpGain
    );
    await xpSystem.addXp(thatRoom.players[i].userId, xpGainAfterCut);
    await dailyChallenges.incrementChallenge(
      thatRoom.players[i].userId,
      `playBlackjack`
    );
    await UserStats.findOneAndUpdate(
      { userId: thatRoom.players[i].userId },
      { $inc: { "games.blackjack.gamesPlayed": 1 } },
      { upsert: true }
    );
  }
  await UserStats.findOneAndUpdate(
    { userId: `1292934767511212042` },
    { $inc: { "games.blackjack.gamesPlayed": 1 } },
    { upsert: true }
  );
  eventEmitter.emit("restartGame", channelToSendTo);
  resetDeckCounter(channelId);
}

module.exports = {
  startBettingPhase,
  startDealing,
  hit,
  stand,
  doubleDown,
  dealerTurn,
  endGame,
  resetDeckCounter,
};
