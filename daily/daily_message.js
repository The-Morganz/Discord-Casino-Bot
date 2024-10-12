const wallet = require('../wallet');

// Generate a random message requirement between 20 and 40
function generateRandomMessageRequirement() {
  return Math.floor(Math.random() * 11) + 4; // Generates a random number between 20 and 40
}

// Initialize a message challenge for a user
function initializeMessageChallenge(userId) {
  return {
    challengeType: 'message',
    messages: 0,
    requiredMessages: generateRandomMessageRequirement(),
    completed: false,
  };
}

// Increment message count and check if the challenge is completed
function incrementMessageCount(userChallenge, userId) {
  if (!userChallenge.completed) {
    userChallenge.messages += 1;

    // Check if the required number of messages has been sent
    if (userChallenge.messages >= userChallenge.requiredMessages) {
      userChallenge.completed = true;
      wallet.addCoins(userId, 1000); // Reward the user with 1000 coins
      console.log(
        `User ${userId} has completed the message challenge and earned 1000 coins.`
      );
    }
  }
  return userChallenge;
}

// Get status of the message challenge
function getMessageStatus(userChallenge) {
  const { messages, requiredMessages, completed } = userChallenge;
  if (completed) {
    return `🎉 You have completed today's message challenge and earned 1000 coins! Try again tomorrow.`;
  } else {
    return `🎁 Today's challenge: Send ${requiredMessages} messages. Progress: ${messages}/${requiredMessages} messages.`;
  }
}

module.exports = {
  initializeMessageChallenge,
  incrementMessageCount,
  getMessageStatus,
};
