const wallet = require('./wallet');

let pendingChallenges = {};

function startFlipChallenge(challengerId, targetId, amount) {
  if (pendingChallenges[targetId]) {
    return "The tagged user already has a pending challenge.";
  }

  pendingChallenges[targetId] = {
    challengerId,
    amount,
    targetId,
    confirmed: false,
    choice: null, // 'heads' or 'tails'
  };

  return `<@${challengerId}> has challenged <@${targetId}> to a coinflip for **${amount}** coins! <@${targetId}>, type **$confirm** to accept or **$deny** to reject.`;
}

function confirmChallenge(userId) {
  const challenge = pendingChallenges[userId];

  if (!challenge) {
    return "You don't have any pending challenges to confirm.";
  }

  if (wallet.getCoins(userId) < challenge.amount || wallet.getCoins(challenge.challengerId) < challenge.amount) {
    delete pendingChallenges[userId];
    return "One of the users doesn't have enough coins to proceed with the bet.";
  }

  challenge.confirmed = true;
  return `<@${userId}> has confirmed the challenge! Now, type **$heads** or **$tails** to pick your side.`;
}

function denyChallenge(userId) {
  if (pendingChallenges[userId]) {
    delete pendingChallenges[userId];
    return `<@${userId}> has denied the coinflip challenge.`;
  } else {
    return "You don't have any pending challenges to deny.";
  }
}

function pickChoice(userId, choice) {
  const challenge = pendingChallenges[userId];

  if (!challenge || !challenge.confirmed) {
    return "You don't have any confirmed challenges to make a choice.";
  }

  if (choice !== "heads" && choice !== "tails") {
    return "Invalid choice. Please choose either **$heads** or **$tails**.";
  }

  challenge.choice = choice;
  const challengerChoice = choice === "heads" ? "tails" : "heads";

  const message = `You chose **${choice}**, and <@${challenge.challengerId}> is **${challengerChoice}**! Flipping the coin...`;
  
  // Automatically flip the coin after the choice is made
  return message + "\n" + flipCoin(userId);
}

function flipCoin(userId) {
  const challenge = pendingChallenges[userId];
  if (!challenge || !challenge.choice) {
    return "No valid coinflip to execute.";
  }

  // Randomly determine heads or tails
  const flipResult = Math.random() < 0.5 ? "heads" : "tails";
  let winnerId;

  if (flipResult === challenge.choice) {
    winnerId = userId;
  } else {
    winnerId = challenge.challengerId;
  }

  // Deduct coins from both users
  wallet.removeCoins(userId, challenge.amount);
  wallet.removeCoins(challenge.challengerId, challenge.amount);

  // Add double the amount to the winner
  wallet.addCoins(winnerId, challenge.amount * 2);

  const resultMessage = `The coin landed on **${flipResult}**! <@${winnerId}> wins **${challenge.amount * 2}** coins!`;
  delete pendingChallenges[userId];

  return resultMessage;
}

module.exports = {
  startFlipChallenge,
  confirmChallenge,
  denyChallenge,
  pickChoice,
};
