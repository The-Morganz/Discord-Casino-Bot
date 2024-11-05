const wallet = require("../wallet");
const xpSystem = require(`../xp/xp`);
const DailyChallenge = require("../models/DailyChallenge");
const shopAndItems = require(`../shop/shop`);
const gainFromChallenge = 250;
// Initialize an image challenge for a user
function initializeImageChallenge(userId) {
  return {
    challengeType: "image",
    imagesSent: 0,
    requiredImages: 1,
    completed: false,
    gainedXpReward: false,
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
      let gain = gainFromChallenge * theirXP.multiplier;
      const doTheyHaveBooster = await shopAndItems.checkIfHaveInInventory(
        `Double Challenge Rewards`,
        userId
      );
      // console.log(doTheyHaveBooster);
      if (doTheyHaveBooster) {
        gain = gain * 2;
      }
      const coinMessage = await wallet.addCoins(userId, gain); // Reward the user with coins
      console.log(
        `User ${userId} has completed the image challenge and earned ${gain} coins.${
          coinMessage !== `` ? `\n*${coinMessage}*` : ``
        }`
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

  let gain = gainFromChallenge * theirXP.multiplier;
  const doTheyHaveBooster = await shopAndItems.checkIfHaveInInventory(
    `Double Challenge Rewards`,
    userId
  );
  if (doTheyHaveBooster) {
    gain = gain * 2;
  }

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
