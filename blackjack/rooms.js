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
    players: [{ userId: userId, betAmount: 0 }],
    playing: false,
  });
  return `You have made a room, and joined it.`;
}

function joinRoom(userId, channelId) {
  let joined = false;
  if (checkIfAlreadyInRoom(userId)) {
    return `You're already in a room.`;
  }
  rooms.forEach((e) => {
    if (e.id === channelId) {
      e.players.push({ userId: userId, betAmount: 0 });
      joined = true;
    }
  });
  if (joined) return `You joined the current room.`;
  else return `There has been a error.`;
}

function deleteRoom(userId, channelId) {
  try {
    rooms.forEach((e) => {
      if (e.id === channelId) {
        rooms.splice(e.index, 1);
        throw error;
      }
    });
    console.log(rooms);
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
        e.betAmount = betAmount;
        throw `Bet Confirmed`;
      }
    });
  } catch (successMessage) {
    return successMessage;
  }
}
function areWePlaying(channelId) {
  const thatRoom = findRoom(channelId);
  return thatRoom.playing;
}
function changeGameState(channelId, state) {
  const theRoom = findRoom(channelId);
  theRoom.playing = state;
}

module.exports = {
  makeRoom,
  deleteRoom,
  getAllRooms,
  checkIfAlreadyInRoom,
  findRoom,
  setBetAmount,
  areWePlaying,
  changeGameState,
};
