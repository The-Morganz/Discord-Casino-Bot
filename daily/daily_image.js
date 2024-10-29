const wallet = require("../wallet");
const xpSystem = require(`../xp/xp`);
const DailyChallenge = require('../models/DailyChallenge');

// Initialize an image challenge for a user
function initializeImageChallenge(userId) {
  return {
    challengeType: "image",
    imagesSent: 0,
    requiredImages: 1,
    completed: false,
  };
}

// Increment image count and check if the challenge is completed
async function incrementImageCount(userChallenge, userId) {
  if (!userChallenge.completed) {
    userChallenge.imagesSent += 1;

    // Check if the required number of images has been sent
    if (userChallenge.imagesSent >= userChallenge.requiredImages) {
      userChallenge.completed = true;
      const theirXP = await xpSystem.getXpData(userId);
      const gain = gainFromChallenge * theirXP.multiplier;
      const coinMessage = await wallet.addCoins(userId, gain); // Reward the user with coins
      console.log(
        `User ${userId} has completed the image challenge and earned ${gain} coins.${coinMessage !== `` ? `\n*${coinMessage}*` : ``}`
      );
    }
    
    // Save the updated challenge to MongoDB
    await userChallenge.save();
  }
  return userChallenge;
}

// Get status of the image challenge
async function getImageStatus(userChallenge, userId) {
  const { imagesSent, requiredImages, completed } = userChallenge;
  const theirXP = await xpSystem.getXpData(userId);
  const gain = gainFromChallenge * theirXP.multiplier;
  
  if (completed) {
    return `🎉 You have completed today's image challenge and earned ${gain} coins!`;
  } else {
    return `🎁 Today's challenge: Send ${requiredImages} image(s). Progress: ${imagesSent}/${requiredImages} image(s).`;
  }
}

module.exports = {
  initializeImageChallenge,
  incrementImageCount,
  getImageStatus,
};
