const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
function generateRandomGameRequirement() {
  const gamesToPlay = [3, 5, 7];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}

// Initialize a message challenge
function initializePlayGridChallenge(userId) {
  return {
    challengeType: "playGrid",
    gridGamesPlayed: 0,
    requiredGridGames: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementGridGames(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[
      challengeNumber
    ].challengeData.gridGamesPlayed += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData.gridGamesPlayed >=
      userChallenge.challenges[challengeNumber].challengeData.requiredGridGames
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
        `User ${userId} has completed the grid challenge and earned ${gain} coins.`
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
async function getGameStatus(userChallenge, userId) {
  const { gridGamesPlayed, requiredGridGames, completed } = userChallenge;
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
    return `🎉 You have completed enough grid games,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Play ${requiredGridGames} games of grid mines. Progress: ${gridGamesPlayed}/${requiredGridGames} games.`;
  }
}

module.exports = {
  initializePlayGridChallenge,
  incrementGridGames,
  getGameStatus,
};
