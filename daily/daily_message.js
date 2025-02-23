const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const dailies = require(`./checkIfCompletedAll`);
const UserStats = require(`../models/UserStats`);

let gainFromChallenge = 250;
let gainXpFromChallenge = 50;
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

async function incrementMessageCount(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.messages += 1;

    // Check if the required number of messages has been reached
    if (
      userChallenge.challenges[challengeNumber].challengeData.messages >=
      userChallenge.challenges[challengeNumber].challengeData.requiredMessages
    ) {
      userChallenge.challenges[challengeNumber].challengeData.completed = true;
      await UserStats.findOneAndUpdate(
        { userId },
        { $inc: { dailiesDone: 1 } },
        { upsert: true }
      );
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
      // console.log(
      //   `User ${userId} has completed the message challenge and earned ${gain} coins.`
      // );
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
  await dailies.checkIfCompletedAll(userId);

  // Return the updated userChallenge object
  return userChallenge;
}

// Get the message challenge status
async function getMessageStatus(userChallenge, userId) {
  const { messages, requiredMessages, completed } = userChallenge;
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
    return `🎉 You have completed today's message challenge and earned ${formattedGain} coins!`;
  } else {
    return `🎁 Send ${requiredMessages} messages. Progress: ${messages}/${requiredMessages} messages.`;
  }
}

module.exports = {
  initializeMessageChallenge,
  incrementMessageCount,
  getMessageStatus,
};
