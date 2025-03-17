const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const dailies = require(`./checkIfCompletedAll`);
const UserStats = require(`../models/UserStats`);

let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
function generateRandomGameRequirement() {
  const gamesToPlay = [1, 2];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}

// Initialize a message challenge
function initializeSkillChallengeChallenge(userId) {
  return {
    challengeType: "skillChallenge",
    gamesPlayed: 0,
    requiredGames: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementSkillGames(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.gamesPlayed += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData.gamesPlayed >=
      userChallenge.challenges[challengeNumber].challengeData.requiredGames
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
async function getSkillChallengeStatus(userChallenge, userId) {
  const { gamesPlayed, requiredGames, completed } = userChallenge;
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
    return `🎉 You have played enough skill challenges,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Play ${requiredGames} skill challenges. Progress: ${gamesPlayed}/${requiredGames} games played.`;
  }
}

module.exports = {
  initializeSkillChallengeChallenge,
  incrementSkillGames,
  getSkillChallengeStatus,
};
