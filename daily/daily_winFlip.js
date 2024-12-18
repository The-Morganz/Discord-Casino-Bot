const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const dailies = require(`./checkIfCompletedAll`);

let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
function generateRandomGameRequirement() {
  const gamesToPlay = [1, 2];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}

// Initialize a message challenge
function initializeWinFlipChallenge(userId) {
  return {
    challengeType: "winFlip",
    flipsWon: 0,
    requiredFlipWins: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementFlipWins(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.flipsWon += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData.flipsWon >=
      userChallenge.challenges[challengeNumber].challengeData.requiredFlipWins
    ) {
      userChallenge.challenges[challengeNumber].challengeData.completed = true;
      const theirXP = await xpSystem.getXpData(userId);
      let gain = gainFromChallenge * theirXP.multiplier;
      const doTheyHaveBooster = await shopAndItems.checkIfHaveInInventory(
        `Double Challenge Rewards`,
        userId
      );
      if (doTheyHaveBooster) {
        gain = gain * 2;
      }
      await wallet.addCoins(userId, gain, false, false, true);
      console.log(
        `User ${userId} has completed the flip challenge and earned ${gain} coins.`
      );
    }
  }
  if (
    userChallenge.challenges[challengeNumber].challengeData.completed &&
    !userChallenge.challenges[challengeNumber].challengeData.gainedXpReward
  ) {
    await xpSystem.addXp(userId, gainXpFromChallenge);
    userChallenge.challenges[
      challengeNumber
    ].challengeData.gainedXpReward = true;
  }
  await DailyChallenge.findOneAndUpdate(
    {
      userId: userId,
    },
    {
      $set: {
        [`challenges.${challengeNumber}.challengeData`]:
          userChallenge.challenges[challengeNumber].challengeData,
      },
    },
    {
      upsert: true,
    }
  );
  await dailies.checkIfCompletedAll(userId);

  // Return the updated userChallenge object
  return userChallenge;
}

// Get the message challenge status
async function getWinFlipStatus(userChallenge, userId) {
  const { flipsWon, requiredFlipWins, completed } = userChallenge;
  const theirXP = await xpSystem.getXpData(userId);
  let gain = gainFromChallenge * theirXP.multiplier;
  const doTheyHaveBooster = await shopAndItems.checkIfHaveInInventory(
    `Double Challenge Rewards`,
    userId
  );
  if (doTheyHaveBooster) {
    gain = gain * 2;
  }
  const formattedGain = wallet.formatNumber(gain);
  if (completed) {
    return `🎉 You have won enough coinflip games,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Win ${requiredFlipWins} games of coinflip. Progress: ${flipsWon}/${requiredFlipWins} flips won.`;
  }
}

module.exports = {
  initializeWinFlipChallenge,
  incrementFlipWins,
  getWinFlipStatus,
};
