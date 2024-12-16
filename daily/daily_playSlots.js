const wallet = require("../wallet");
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);
const DailyChallenge = require("../models/DailyChallenge");
const User = require("../models/User");
let gainFromChallenge = 500;
let gainXpFromChallenge = 150;

function generateRandomGameRequirement() {
  const gamesToPlay = [15, 20, 25];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}

// Initialize a message challenge
function initializePlaySlotsChallenge(userId) {
  return {
    challengeType: "playSlots",
    slotGamesPlayed: 0,
    requiredSlotsGames: generateRandomGameRequirement(),
    completed: false,
    gainedXpReward: false,
  };
}

async function incrementSlotsGames(userChallenge, userId, challengeNumber) {
  if (!userChallenge.challenges[challengeNumber].challengeData.completed) {
    userChallenge.challenges[
      challengeNumber
    ].challengeData.slotGamesPlayed += 1;
    if (
      userChallenge.challenges[challengeNumber].challengeData.slotGamesPlayed >=
      userChallenge.challenges[challengeNumber].challengeData.requiredSlotsGames
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
      const precentOfCoins = theirXP.level * 100;
      console.log(
        `User ${userId} has completed the slots challenge and earned ${gain} coins.`
      );
      await wallet.addFreeSpins(userId, 10, Math.round(precentOfCoins));
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
async function getSlotsGameStatus(userChallenge, userId) {
  const { slotGamesPlayed, requiredSlotsGames, completed } = userChallenge;
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
    const freeSpinCoinAmount = await User.findOne({ userId: userId })
      .freeSpinsBetAmount;
    const formattedGain = wallet.formatNumber(gain);
    const formattedCoinAmount = wallet.formatNumber(freeSpinCoinAmount);
    return `🎉 You have played enough slots, finishing the challenge and earning ${formattedGain} coins! You gained 10 free spins${
      freeSpinCoinAmount > 0 ? ` with a bet of ${formattedCoinAmount}` : `.`
    }`;
  } else {
    return `🎁 Play ${requiredSlotsGames} games of slots. Progress: ${slotGamesPlayed}/${requiredSlotsGames} games. Will gain 10 free spins.`;
  }
}

module.exports = {
  initializePlaySlotsChallenge,
  incrementSlotsGames,
  getSlotsGameStatus,
};
