const wallet = require('../wallet');

// Initialize an image challenge for a user
function initializeImageChallenge(userId) {
  return {
    challengeType: 'image',
    imagesSent: 0,
    requiredImages: 1,
    completed: false,
  };
}

// Increment image count and check if the challenge is completed
function incrementImageCount(userChallenge, userId) {
  if (!userChallenge.completed) {
    userChallenge.imagesSent += 1;

    // Check if the required number of images has been sent
    if (userChallenge.imagesSent >= userChallenge.requiredImages) {
      userChallenge.completed = true;
      wallet.addCoins(userId, 1000); // Reward the user with 100 coins
      console.log(`User ${userId} has completed the image challenge and earned 100 coins.`);
    }
  }
  return userChallenge;
}

// Get status of the image challenge
function getImageStatus(userChallenge) {
  const { imagesSent, requiredImages, completed } = userChallenge;
  if (completed) {
    return `You have completed today's image challenge and earned 100 coins!`;
  } else {
    return `Today's challenge: Send ${requiredImages} image. Progress: ${imagesSent}/${requiredImages} image.`;
  }
}

module.exports = {
  initializeImageChallenge,
  incrementImageCount,
  getImageStatus,
};
