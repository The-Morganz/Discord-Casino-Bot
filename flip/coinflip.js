const wallet = require("../wallet");
const shopAndItems = require(`../shop/shop`);
const xpSystem = require(`../xp/xp`);
const dailyChallenges = require(`../daily/daily`);

// Utility function to create a delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + 1) + min;
}

let pendingChallenges = {};

function startFlipChallenge(challengerId, targetId, amount, message) {
  if (pendingChallenges[targetId]) {
    return "The tagged user already has a pending challenge.";
  }

  // Create the challenge
  pendingChallenges[targetId] = {
    challengerId,
    amount,
    targetId,
    confirmed: false,
    choice: null, // 'heads' or 'tails'
    timeout: null, // Will store the timeout ID
    message, // Store the message object for future reference
  };

  // Set a timeout for 1 minute to abort the challenge if no response
  pendingChallenges[targetId].timeout = setTimeout(() => {
    if (pendingChallenges[targetId]) {
      const abortMessage = `<@${challengerId}>, your coinflip challenge has been aborted due to inactivity.`;
      pendingChallenges[targetId].message.reply(abortMessage); // Send the message in the same channel
      delete pendingChallenges[targetId];
    }
  }, 60000); // 1 minute timeout
  const formattedAmount = wallet.formatNumber(amount);
  return `🪙 <@${challengerId}> has challenged <@${targetId}> to a coinflip for **${formattedAmount}** coins! <@${targetId}>, type **$confirm** to accept or **$deny** to reject. 🪙`;
}

async function confirmChallenge(userId) {
  const challenge = pendingChallenges[userId];

  if (!challenge) {
    return "Nothing to confirm";
  }
  const challengerCoins = await wallet.getCoins(userId);
  const challengeeCoins = await wallet.getCoins(challenge.challengerId);
  if (
    challengeeCoins < challenge.amount ||
    challengeeCoins < challenge.amount
  ) {
    delete pendingChallenges[userId];
    return "Someone is broke.";
  }

  // Clear the timeout since the challenge is confirmed
  clearTimeout(challenge.timeout);

  challenge.confirmed = true;
  return `<@${userId}> has confirmed the challenge! Now, type **$heads** or **$tails** to pick your side.`;
}

function denyChallenge(userId) {
  if (pendingChallenges[userId]) {
    clearTimeout(pendingChallenges[userId].timeout); // Clear the timeout if they deny
    delete pendingChallenges[userId];
    return `<@${userId}> has denied the coinflip challenge.`;
  } else {
    return "You don't have any pending challenges to deny.";
  }
}

async function pickChoice(userId, choice, action) {
  const challenge = pendingChallenges[userId];

  if (!challenge || !challenge.confirmed) {
    return "You don't have any confirmed challenges to make a choice.";
  }

  if (choice !== "heads" && choice !== "tails") {
    return "Invalid choice. Please choose either **$heads** or **$tails**.";
  }

  challenge.choice = choice;
  const challengerChoice = choice === "heads" ? "tails" : "heads";

  // Announce the choices
  const message = `You chose **${choice}**, and <@${challenge.challengerId}> is **${challengerChoice}**! Flipping the coin... 👍⤴️🪙`;
  // challenge.message.reply(message);

  // Add suspense: wait for 5 seconds before flipping the coin
  if (action === `flip`) {
    return message;
  }
  await sleep(randomNumber(3000, 6000));
  // Flip the coin and return the result
  return flipCoin(userId);
}
async function flipCoin(userId) {
  const challenge = pendingChallenges[userId];
  if (!challenge || !challenge.choice) {
    return "No valid coinflip to execute.";
  }

  // Randomly determine heads or tails
  const flipResult = Math.random() < 0.5 ? "heads" : "tails";
  let winnerId;
  let loserId;
  if (flipResult === challenge.choice) {
    winnerId = userId;
    loserId = challenge.challengerId;
    if (loserId === winnerId) {
      loserId = challenge.targetId;
    }
  } else {
    winnerId = challenge.challengerId;
    loserId = userId;
    if (loserId === winnerId) {
      loserId = challenge.challengerId;
    }
  }

  // Deduct coins from both users
  await wallet.removeCoins(userId, challenge.amount);
  await wallet.removeCoins(challenge.challengerId, challenge.amount);

  // Add double the amount to the winner
  const coinMessage = await wallet.addCoins(winnerId, challenge.amount * 2);

  await dailyChallenges.incrementChallenge(winnerId, `winFlip`);
  await dailyChallenges.incrementChallenge(loserId, `winFlip`);
  const doTheyHaveXPStealer = await shopAndItems.checkIfHaveInInventory(
    `XP Stealer`,
    winnerId
  );

  if (doTheyHaveXPStealer) {
    const winnerXP = await xpSystem.getXpData(challenge.challengerId);
    const loserXP = await xpSystem.getXpData(challenge.targetId);
    await xpSystem.removeXp(loserId, 20);

    await xpSystem.addXp(winnerId, 20);
  }
  const formattedWinnings = wallet.formatNumber(challenge.amount * 2);
  const resultMessage = `🪙 The coin landed on **${flipResult}**! <@${winnerId}> wins 🎉 **${formattedWinnings}** coins! 🪙 ${
    coinMessage !== `` ? `\n${coinMessage}` : ``
  }`;
  delete pendingChallenges[userId];

  return resultMessage;
}

module.exports = {
  startFlipChallenge,
  confirmChallenge,
  denyChallenge,
  pickChoice,
};
