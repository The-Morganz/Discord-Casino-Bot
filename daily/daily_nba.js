const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const UserStats = require(`../models/UserStats`);
const dailies = require(`./checkIfCompletedAll`);
const NBAStats = require(`../models/NBA`);

let gainFromChallenge = 500;
let gainXpFromChallenge = 150;
function generateRandomGameRequirement() {
  const gamesToPlay = [1, 2, 3];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}
function hasThatMomentPassed(isoTime) {
  if (!isoTime) {
    return true;
  }
  const givenDate = new Date(isoTime);
  const now = new Date();

  return now >= givenDate;
}
async function areThereGamesSoon() {
  const NBADatabase = await NBAStats.findOne().sort({ _id: -1 });
  if (hasThatMomentPassed(NBADatabase.commence_time)) {
    return false;
  }
  return true;
}
async function canYouGetDaily() {
  const isItPlayable = await areThereGamesSoon();
  if (!isItPlayable) {
    return false;
  }
  return true;
}
// Initialize a message challenge
function initializePlayNBAChallenge(userId) {
  return {
    challengeType: "playNBA",
    nbaGamesPlayed: 0,
    requiredNBAGames: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementGames(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[challengeNumber].challengeData.nbaGamesPlayed += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData.nbaGamesPlayed >=
      userChallenge.challenges[challengeNumber].challengeData.requiredNBAGames
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
  const { nbaGamesPlayed, requiredNBAGames, completed } = userChallenge;
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
    return `🎉 You have added enough NBA games,finishing the challenge and earning ${formattedGain} coins!`;
  } else {
    return `🎁 Add ${requiredNBAGames} NBA game to a ticket. Progress: ${nbaGamesPlayed}/${requiredNBAGames} games added.`;
  }
}

module.exports = {
  initializePlayNBAChallenge,
  incrementGames,
  getGameStatus,
  canYouGetDaily,
};
