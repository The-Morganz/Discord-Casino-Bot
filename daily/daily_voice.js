const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
let gainFromChallenge = 500;
let gainXpFromChallenge = 100;
function generateRandomTimeRequirement() {
  return Math.floor(Math.random() * 10) + 10;
}

// Initialize a message challenge
function initializeVoiceChallenge(userId) {
  return {
    challengeType: "voice",
    minutesInVoice: 0,
    requiredTime: generateRandomTimeRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementMinutes(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.minutesInVoice += 1;

    if (
      userChallenge.challenges[challengeNumber].challengeData.minutesInVoice >=
      userChallenge.challenges[challengeNumber].challengeData.requiredTime
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
        `User ${userId} has completed the voice challenge and earned ${gain} coins.`
      );
    }

    // Save the updated challenge back to MongoDB
    // await userChallenge.save();
  }
  if (
    userChallenge.challenges[challengeNumber].challengeData.completed &&
    !userChallenge.challenges[challengeNumber].challengeData.gainedXpReward
  ) {
    await xpSystem.addXp(userId, gainXpFromChallenge); // Reward 100 XP for completing the image challenge
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
async function getVoiceStatus(userChallenge, userId) {
  const { minutesInVoice, requiredTime, completed } = userChallenge;
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
    return `🎉 You have completed today's voice challenge and earned ${formattedGain} coins!`;
  } else {
    return `🎁 Spend ${requiredTime} minutes in any voice chat. Progress: ${minutesInVoice}/${requiredTime} minutes.`;
  }
}

module.exports = {
  initializeVoiceChallenge,
  incrementMinutes,
  getVoiceStatus,
};
