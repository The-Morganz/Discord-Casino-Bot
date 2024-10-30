const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const DailyChallenge = require("../models/DailyChallenge");
// Generate a random message requirement between 20 and 40
function generateRandomMessageRequirement() {
  return Math.floor(Math.random() * 11) + 5; // Generates a random number between 20 and 40
}

// Initialize a message challenge
function initializeMessageChallenge(userId) {
  return {
    challengeType: "message",
    messages: 0,
    requiredMessages: generateRandomMessageRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}
let gainFromChallenge = 500;

async function incrementMessageCount(userChallenge, userId) {
  if (!userChallenge.completed) {
    userChallenge.messages += 1;

    // Check if the required number of messages has been reached
    if (userChallenge.messages >= userChallenge.requiredMessages) {
      userChallenge.completed = true;
      const theirXP = await xpSystem.getXpData(userId);
      const gain = 500 * theirXP.multiplier;
      await wallet.addCoins(userId, gain);
      console.log(
        `User ${userId} has completed the message challenge and earned ${gain} coins.`
      );
    }

    // Save the updated challenge back to MongoDB
    await userChallenge.save();
  }

  // Return the updated userChallenge object
  return userChallenge;
}

// Get the message challenge status
async function getMessageStatus(userChallenge, userId) {
  const { messages, requiredMessages, completed } = userChallenge;
  const theirXP = await xpSystem.getXpData(userId);
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
