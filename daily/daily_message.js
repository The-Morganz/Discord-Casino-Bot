const wallet = require("../wallet");
const xpSystem = require("../xp/xp");

// Generate a random message requirement between 20 and 40
function generateRandomMessageRequirement() {
  return Math.floor(Math.random() * 11) + 5; // Generates a random number between 20 and 40
}

// Initialize a message challenge for a user
function initializeMessageChallenge(userId) {
  return {
    challengeType: "message",
    messages: 0,
    requiredMessages: generateRandomMessageRequirement(),
    completed: false,
  };
}
let gainFromChallenge = 500;
// Increment message count and check if the challenge is completed
function incrementMessageCount(userChallenge, userId) {
  if (!userChallenge.completed) {
    userChallenge.messages += 1;

    // Check if the required number of messages has been sent
    if (userChallenge.messages >= userChallenge.requiredMessages) {
      userChallenge.completed = true;
      const theirXP = xpSystem.getXpData(userId);
      const gain = gainFromChallenge * theirXP.multiplier;
      wallet.addCoins(userId, gain); // Reward the user with 100 coins

      console.log(
        `User ${userId} has completed the message challenge and earned ${gain} coins.`
      );
    }
  }
  return userChallenge;
}

// Get status of the message challenge
function getMessageStatus(userChallenge, userId) {
  const { messages, requiredMessages, completed } = userChallenge;
  const theirXP = xpSystem.getXpData(userId);
  const gain = gainFromChallenge * theirXP.multiplier;
  if (completed) {
    return `🎉 You have completed today's message challenge and earned ${gain} coins!`;
  } else {
    return `🎁 Today's challenge: Send ${requiredMessages} messages. Progress: ${messages}/${requiredMessages} messages.`;
  }
}

module.exports = {
  initializeMessageChallenge,
  incrementMessageCount,
  getMessageStatus,
};
