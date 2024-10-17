const { makeDeck } = require("./makeDeck");
const wallet = require(`../wallet`);
const client = require("../index");

const rooms = [];

// Koristim catch kao success block da bi zaustavio forEach loop odma, da ne ide kroz ceo array ako ima vise

function checkIfRoomExists(channelId) {
  try {
    rooms.forEach((e) => {
      if (e.id === channelId) throw error;
    });
    return false;
  } catch (error) {
    return true;
  }
}

function findRoom(channelId) {
  try {
    rooms.forEach((e) => {
      if (e.id === channelId) {
        throw e;
      }
    });
    return false;
  } catch (room) {
    return room;
  }
}

function checkIfAlreadyInRoom(userId) {
  try {
    rooms.forEach((e) => {
      e.players.forEach((e) => {
        if (e.userId === userId) throw error;
      });
    });
    return false;
  } catch (error) {
    return true;
  }
}

function makeRoom(userId, channelId) {
  if (checkIfRoomExists(channelId)) {
    return joinRoom(userId, channelId);
  }
  rooms.push({
    index: rooms.length,
    id: `${channelId}`,
    players: [
      {
        userId: userId,
        betAmount: 0,
        prevBetAmount: 0,
        index: 0,
        sum: 0,
        cards: [],
        played: false,
        turn: false,
        lost: false,
        buttonCounter: 0,
        natBlackjack: false,
      },
    ],
    playing: false,
    dealerDealingPhase: false,
    bettingPhase: false,
    deckOfCards: [],
    resetDeck: 0,
    bettingStartTime: null,
    games: 0,
    dealer: {
      sum: 0,
      cards: [],
      profits: 0,
      checkFailed: false,
      natBlackjack: false,
    },
  });
  return `You have made a room, and joined it.`;
}

function jusGivMeMyMooony(channelId) {
  const room = findRoom(channelId);
  room.players.forEach((e) => {
    wallet.addCoins(e.userId, e.betAmount);
  });
}
function checkBettingPhase(channelId) {
  const room = findRoom(channelId);
  if (room.bettingPhase) {
    const now = new Date();
    const bettingStartTime = new Date(room.bettingStartTime);
    const timeDiff = now - bettingStartTime; // Time difference in milliseconds

    if (timeDiff >= 180000) {
      // 3 minutes = 180000 milliseconds
      jusGivMeMyMooony(channelId);
      const message = deleteRoom(channelId);
      console.log(rooms);
      // const channelToSendTo = client.channels.fetch(channelId);
      // client.channels.fetch(channelId);

      // channelToSendTo.send(`Deleting blackjack room due to inactivity....`);
      console.log(message);
    }
  }
}

function checkAllRooms() {
  rooms.forEach((room) => checkBettingPhase(room.id));
}
setInterval(checkAllRooms, 10000);

// Call this periodically, e.g., every 30 seconds or 1 minute using setInterval
// Check every minute

function restartRoom(channelId, eventEmitter, channelToSendTo) {
  const thatRoom = findRoom(channelId);

  thatRoom.players.forEach((e) => {
    e.betAmount = 0;
    e.sum = 0;
    e.cards = [];
    e.played = false;
    e.turn = false;
    e.lost = false;
    e.natBlackjack = false;
  });
  thatRoom.games++;
  thatRoom.dealer.sum = 0;
  thatRoom.dealer.cards = [];
  thatRoom.dealer.checkFailed = false;
  thatRoom.dealer.natBlackjack = false;
  changeGameState(channelId, "playing", false);
  console.log(thatRoom);
  eventEmitter.emit(`startBettingPhase`, channelToSendTo);
  // thatRoom.deckOfCards = makeDeck();
}
function removePersonFromRoom(userId, channelId) {
  const thatRoom = findRoom(channelId);
  thatRoom.players.forEach((e, i, arr) => {
    if (e.userId === userId) {
      arr.splice(e.index, 1);
      updatePlayerIndexes(channelId);
    }
  });
  if (thatRoom.players.length === 0) {
    deleteRoom(channelId);
  }
}
function updatePlayerIndexes(channelId) {
  const thatRoom = findRoom(channelId);
  thatRoom.players.forEach((e, i) => {
    e.index = i;
  });
}

function joinRoom(userId, channelId) {
  let joined = false;
  if (checkIfAlreadyInRoom(userId)) {
    return `You're already in a room.`;
  }
  rooms.forEach((e, i, arr) => {
    if (e.id === channelId) {
      e.players.push({
        userId: userId,
        betAmount: 0,
        prevBetAmount: 0,
        index: e.players.length,
        sum: 0,
        cards: [],
        played: false,
        turn: false,
        lost: false,
        buttonCounter: 0,
        natBlackjack: false,
      });
      joined = true;
    }
  });
  if (joined) return `You joined the current room.`;
  else return `There has been a error.`;
}
function updateRoomsIndex() {
  rooms.forEach((e, i, arr) => {
    e.index = i;
  });
}
function deleteRoom(channelId) {
  try {
    rooms.forEach((e) => {
      if (e.id === channelId) {
        rooms.splice(e.index, 1);
        updateRoomsIndex();
        throw error;
      }
    });
    return `There was a error deleting the room.`;
  } catch (error) {
    return `Successfully deleted room.`;
  }
}

function getAllRooms() {
  return rooms;
}

function setBetAmount(userId, channelId, betAmount) {
  const thatRoom = findRoom(channelId);
  try {
    thatRoom.players.forEach((e) => {
      if (e.userId === userId) {
        if (e.betAmount > 0) {
          return;
        }
        e.betAmount = betAmount;
        throw `<@${userId}> has confirmed their bet amount.`;
      }
    });
    return `Couldn't place bet.`;
  } catch (successMessage) {
    if (thatRoom.players.every((player) => player.betAmount > 0)) {
      return "true";
      // return "All players have placed their bets!";

      // Add any additional logic here if all players have a betAmount > 0
    } else {
      return successMessage;
    }
  }
}

function areWePlaying(channelId) {
  const thatRoom = findRoom(channelId);
  return thatRoom.playing;
}
function areWeBetting(channelId) {
  const thatRoom = findRoom(channelId);
  return thatRoom.bettingPhase;
}
function areWeLettingTheDealerDealSoWeCantDoCommands(channelId) {
  const thatRoom = findRoom(channelId);
  return thatRoom.dealerDealingPhase;
}
function changeGameState(channelId, phase, state) {
  const theRoom = findRoom(channelId);

  switch (phase) {
    case "playing":
      theRoom.playing = state;
      break;
    case "betting":
      theRoom.bettingPhase = state;
      break;
    case "dealing":
      theRoom.dealerDealingPhase = state;
      break;
  }
}
function isItYoTurn(userId, channelId) {
  const thatRoom = findRoom(channelId);
  let result = false;
  thatRoom.players.forEach((e) => {
    if (e.userId === userId && e.turn === true) {
      result = true;
    }
  });
  return result;
}

function playerLose(userId, channelId) {
  const thatRoom = findRoom(channelId);
  thatRoom.players.forEach((e) => {
    if (e.userId === userId) {
      e.lost = true;
    }
  });
}

module.exports = {
  makeRoom,
  deleteRoom,
  removePersonFromRoom,
  getAllRooms,
  checkIfAlreadyInRoom,
  findRoom,
  setBetAmount,
  areWePlaying,
  areWeBetting,
  areWeLettingTheDealerDealSoWeCantDoCommands,
  isItYoTurn,
  changeGameState,
  playerLose,
  restartRoom,
  jusGivMeMyMooony,
  checkAllRooms,
};
