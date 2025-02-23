const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const UserStats = require(`../models/UserStats`);
const dailies = require(`./checkIfCompletedAll`);

let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
function generateRandomGameRequirement() {
  const gamesToPlay = [1, 2];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}

// Initialize a message challenge
function initializePlayHorseChallenge(userId) {
  return {
    challengeType: "playHorse",
    horseGamesPlayed: 0,
    requiredHorseGames: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementGames(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[
      challengeNumber
    ].challengeData.horseGamesPlayed += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData
        .horseGamesPlayed >=
      userChallenge.challenges[challengeNumber].challengeData.requiredHorseGames
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
      //   `User ${userId} has completed the horse challenge and earned ${gain} coins.`
      // );
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
async function getGameStatus(userChallenge, userId) {
  const { horseGamesPlayed, requiredHorseGames, completed } = userChallenge;
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
    return `🎉 You have completed enough horse races,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Partake in ${requiredHorseGames} horse races. Progress: ${horseGamesPlayed}/${requiredHorseGames} horse races.`;
  }
}

module.exports = {
  initializePlayHorseChallenge,
  incrementGames,
  getGameStatus,
};
