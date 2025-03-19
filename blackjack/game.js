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
      player.acesUsed += 1;
      // const aceIndex = player.cards.indexOf(11);
      // player.cards.splice(aceIndex, 1);
      // player.cards.push(1);
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
    const dealerFirstCard = dealer.cards[0];
    const randomNumberFromDeck = randomNumber(
      0,
      thePlayingRoom.deckOfCards.length - 1
    );
    const randomCard = thePlayingRoom.deckOfCards[randomNumberFromDeck];
    const dealerSecondCard = Number(randomCard.replace(/\D/g, ""));
    thePlayingRoom.deckOfCards.splice(randomNumberFromDeck, 1);
    dealer.sum += dealerSecondCard;
    dealer.cards.push(dealerSecondCard);

    if (dealerFirstCard === 10 || dealerFirstCard === 11) {
      const checkMessage = `:bust_in_silhouette: THE DEALER is checking their other card. :bust_in_silhouette:`;
      eventEmitter.emit("beginningBJ", checkMessage, channelToSendTo);
      await sleep(2500);

      const sumOfCards = dealerFirstCard + dealerSecondCard;
      if (sumOfCards === 21) {
        const dealerNatBjMessage = `:bust_in_silhouette: THE DEALER TURNS OVER THEIR CARD, AND IT'S A **${dealerSecondCard}**, NATURAL BLACKJACK :bust_in_silhouette:`;
        eventEmitter.emit("beginningBJ", dealerNatBjMessage, channelToSendTo);
        // thePlayingRoom.deckOfCards.splice(randomNumberFromDeck, 1);
        dealer.natBlackjack = true;
        endGame(channelId, channelToSendTo, eventEmitter);
        return;
      }
      dealer.checkFailed = true;
      const disappointedMessages = [
        `THE DEALER has a disappointed look on their face.`,
        `THE DEALER is saddened by the value of their card.`,
        `THE DEALER's happiness is completely wiped from their face.`,
        `THE DEALER sighs in disappointment.`,
        `THE DEALER shakes their head subtly.`,
        `THE DEALER's smirk quickly fades.`,
        `THE DEALER mutters something under their breath.`,
        `THE DEALER was hopeful for a moment, but it's gone now.`,
        `THE DEALER takes a deep breath, regaining their composure.`,
        `THE DEALER looks unimpressed with their luck.`,
        `THE DEALER exhales sharply, clearly annoyed by their misfortune.`,
        `THE DEALER grips the edge of the table, suppressing their anger.`,
        `THE DEALER exhales through their nose, their patience wearing thin.`,
        `THE DEALER glares at their cards as if willing them to change.`,
      ];
      const disappointedMessage =
        disappointedMessages[
          Math.floor(Math.random() * disappointedMessages.length)
        ];
      eventEmitter.emit(
        "beginningBJ",
        `:bust_in_silhouette: ${disappointedMessage} :bust_in_silhouette:`,
        channelToSendTo
      );
      await sleep(1000);
    } else {
      const takenCard = `:bust_in_silhouette: THE DEALER takes another card, and puts it face down. :bust_in_silhouette: `;
      eventEmitter.emit("beginningBJ", takenCard, channelToSendTo);
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
  let whoIsNextIndex;
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
function aceSave(cards, sum, aceSaves, thePlayer) {
  let saved = false;
  let howManyAcesTheyHave = 0;
  if (cards.includes(11)) {
    cards.forEach((e) => {
      if (e === 11) {
        howManyAcesTheyHave++;
      }
    });
    if (sum - 10 <= 21) {
      thePlayer.acesUsed += 1;
      saved = true;
    }
    if (howManyAcesTheyHave === aceSaves) {
      howManyAcesTheyHave = 0;
      saved = false;
    }
  }
  return saved;
}
function hit(userId, channelId, eventEmitter, channelToSendTo) {
  const thatRoom = rooms.findRoom(channelId);
  let thePlayer;
  try {
    thatRoom.players.forEach((e) => {
      if (e.userId === userId && e.turn) {
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
      if (
        aceSave(thePlayer.cards, thePlayer.sum, thePlayer.acesUsed, thePlayer)
      ) {
        thePlayer.sum -= 10;
        const aceIndex = thePlayer.cards.indexOf(11);
        // thePlayer.cards.splice(aceIndex, 1);
        // thePlayer.cards.push(1);
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
      if (e.userId === userId && e.turn) {
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
      if (
        aceSave(thePlayer.cards, thePlayer.sum, thePlayer.acesUsed, thePlayer)
      ) {
        thePlayer.sum -= 10;
        // const aceIndex = thePlayer.cards.indexOf(11);
        // thePlayer.cards.splice(aceIndex, 1);
        // thePlayer.cards.push(1);
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
      if (e.userId === userId && e.turn) {
        console.log(thatRoom);
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
    console.log(whoNextString);
    await sleep(2000);
    eventEmitter.emit("upNext", whoNextString, channelToSendTo);
  }
}

async function split(userId, channelId, eventEmitter, channelToSendTo) {
  const thatRoom = rooms.findRoom(channelId);
  let thePlayer;
  // remove coins
  // can dd
  thatRoom.players.forEach((e) => {
    if (e.userId === userId && e.turn) {
      thePlayer = e;
    }
  });
  // if (thePlayer.cards[0] !== thePlayer.cards[1]) {
  //   console.log(`can't split`);
  //   return `You can't split.`;
  // }
  let theIndexOfPlayer = thePlayer.index;
  const newPlayerToInsert = {
    userId: thePlayer.userId,
    betAmount: thePlayer.betAmount,
    prevBetAmount: thePlayer.prevBetAmount,
    index: theIndexOfPlayer + 1,
    sum: thePlayer.cards[0],
    cards: [thePlayer.cards[0]],
    played: false,
    turn: false,
    lost: false,
    buttonCounter: thePlayer.buttonCounter,
    natBlackjack: false,
  };
  console.log(thatRoom);
  const newPlayers = [...thatRoom.players];
  newPlayers.splice(theIndexOfPlayer + 1, 0, newPlayerToInsert);
  thatRoom.players = newPlayers;
  thePlayer.cards.shift();
  thePlayer.sum = thePlayer.cards[0];
  await wallet.removeCoins(userId, thePlayer.betAmount);
  rooms.updatePlayerIndexes(channelId);
  return {
    bust: false,
    cardTheyGot: thePlayer.cards[0],
    theirSum: thePlayer.sum,
    aceSave: false,
  };
}
async function dealerTurn(
  channelId,
  eventEmitter,
  channelToSendTo,
  waitTimeIncrease = 0
) {
  const thatRoom = rooms.findRoom(channelId);
  const dealer = rooms.findRoom(channelId).dealer;
  await sleep(1000 + waitTimeIncrease * 250);
  if (!dealer.turnedOver) {
    eventEmitter.emit("dealerTurn", `turnOver`, channelToSendTo);
    dealer.turnedOver = true;
    dealerTurn(channelId, eventEmitter, channelToSendTo, waitTimeIncrease + 1);
    return;
  }

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
    await sleep(1000 + waitTimeIncrease * 250);

    dealerTurn(channelId, eventEmitter, channelToSendTo, waitTimeIncrease + 1);
    return;
  }
  if (dealer.sum > 21) {
    if (aceSave(dealer.cards, dealer.sum, dealer.acesUsed, dealer)) {
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
      const blackjackMessages = [
        `has gotten a **NATURAL BLACKJACK** and has won`,
        `hit a **BLACKJACK** and instantly gained`,
        `landed a **perfect 21** and secured`,
        `started strong with a **BLACKJACK** and took`,
        `pulled a **BLACKJACK** and walked away with`,
        `got an **unbeatable hand** and earned`,
        `was dealt **perfection** and pocketed`,
        `achieved a **BLACKJACK** and claimed`,
        `hit **21** right away and received`,
        `dominated with a **natural BLACKJACK** and collected`,
        `secured a flawless win with a **BLACKJACK** and took home`,
      ];
      const winMessage =
        blackjackMessages[Math.floor(Math.random() * blackjackMessages.length)];
      message = `:fireworks: <@${
        player.userId
      }> ${winMessage} +${formattedGain} :fireworks:${
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
      const winMessages = [
        `has won and gained`,
        `gained`,
        `secured a victory and earned`,
        `triumphed and took home`,
        `dominated the table and collected`,
        `claimed a well-earned win and received`,
        `outplayed the dealer and walked away with`,
        `crushed the odds and secured`,
        `celebrated a triumphant win and pocketed`,
        `walked away a winner with`,
        `showed expert skill and earned`,
        `proved their mastery and took`,
      ];
      const winMessage =
        winMessages[Math.floor(Math.random() * winMessages.length)];
      message = `:gem: <@${
        player.userId
      }> ${winMessage} +${formattedGain} :gem:${
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
      const bustMessages = [
        `pushed their luck too far and busted, losing`,
        `went over 21 and lost everything, dropping`,
        `took one risk too many and paid the price, losing`,
        `got greedy and busted, throwing away`,
        `lost control and watched their hand crumble, losing`,
        `made one bet too many and exceeded 21, forfeiting`,
        `tried to defy fate but fate had other plans, losing`,
        `saw their dreams vanish with a busted hand, losing`,
        `let ambition take over and went over 21, losing`,
        `felt the pain of going bust and had to let go of`,
      ];
      const bustMessage =
        bustMessages[Math.floor(Math.random() * bustMessages.length)];
      message = `:boom: <@${player.userId}> ${bustMessage} -${formattedLoss} :boom:`;
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
      const loseMessages = [
        `was defeated by the dealer and lost`,
        `watched as the dealer's hand reigned supreme and gave up`,
        `came up short against the dealer's total and lost`,
        `faced the dealer's stronger hand and walked away with nothing`,
        `couldn't overcome the dealer's luck and dropped`,
        `saw their hopes crushed by the dealer and lost`,
        `stood no chance against the dealer's superior hand and lost`,
        `got outmatched by the dealer and had to part with`,
        `felt the sting of defeat as the dealer prevailed and lost`,
        `watched the dealer flip a better hand and had to forfeit`,
      ];
      const loseMessage =
        loseMessages[Math.floor(Math.random() * loseMessages.length)];
      message = `:performing_arts: <@${player.userId}> ${loseMessage} -${formattedLoss} :performing_arts:`;
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
      const winMessages = [
        `watched the dealer bust and took home`,
        `saw the dealer go over 21 and collected`,
        `stood strong as the dealer busted, earning`,
        `savored the dealer's failure to stay under 21 and gained`,
        `watched the dealer crumble under pressure and walked away with`,
        `watched the dealer bust and claimed`,
        `saw the dealer lose control and pocketed`,
        `waited as the dealer went over 21 and secured`,
        `enjoyed the dealer's misfortune and earned`,
        `smiled as the dealer busted and took home`,
      ];
      const winMessage =
        winMessages[Math.floor(Math.random() * winMessages.length)];
      message = `:gem: <@${
        player.userId
      }> ${winMessage} +${formattedGain} :gem:${
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
      const pushMessages = [
        `tied with the dealer and got their bet back`,
        `matched the dealer's total and pushed, keeping their bet`,
        `ended in a stalemate with the dealer and reclaimed back their bet`,
        `saw an even match and took back their bet`,
        `had the same hand as the dealer and kept coins for themselves`,
        `avoided loss with a tie, regaining their coins back`,
        `stood equal to the dealer and reclaimed their rightful coins`,
        `ended in a draw and recovered back their bet`,
        `fought to a standstill and took back what they put down`,
      ];
      const pushMessage =
        pushMessages[Math.floor(Math.random() * pushMessages.length)];
      message = `:rightwards_pushing_hand: <@${player.userId}> ${pushMessage}. :rightwards_pushing_hand:`;
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
  split,
  dealerTurn,
  endGame,
  resetDeckCounter,
};
