const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
let amountToGive = 1000;
function generateRandomGiveTime() {
  const timesToGive = [1];
  return timesToGive[Math.floor(Math.random() * timesToGive.length)];
}

// Initialize a message challenge
function initializeGiveChallenge(userId) {
  return {
    challengeType: "santaGive",
    // timesGiven: 0,
    // requiredGiveTimes: generateRandomGiveTime(),
    amountGiven: 0,
    amountNeededToGive: amountToGive,
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementAmount(
  userChallenge,
  userId,
  challengeNumber,
  amountGivenNow
) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.amountGiven +=
      amountGivenNow;
    if (
      userChallenge.challenges[challengeNumber].challengeData.amountGiven >=
      userChallenge.challenges[challengeNumber].challengeData.amountNeededToGive
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
        `User ${userId} has completed the santa challenge and earned ${gain} coins.`
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

  // Return the updated userChallenge object
  return userChallenge;
}

// Get the message challenge status
async function getGiveStatus(userChallenge, userId) {
  const { amountGiven, amountNeededToGive, completed } = userChallenge;
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
    return `🎉 You have given enough coins to others,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Give ${amountNeededToGive} coins to other players. Progress: ${amountGiven}/${amountNeededToGive} coins.`;
  }
}

module.exports = {
  initializeGiveChallenge,
  incrementAmount,
  getGiveStatus,
};
