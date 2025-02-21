// im tired boss

const DailyChallenge = require("../models/DailyChallenge");
const wallet = require(`../wallet`);
const shopAndItems = require(`../shop/shop`);
const xpSystem = require(`../xp/xp`);
const numberOfChallenges = 3;
const coinGain = 300;
const bonus = 0.5;

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}
function getNextDay(dateString) {
  const inputDate = new Date(dateString);
  const nextDay = new Date(inputDate);
  nextDay.setDate(inputDate.getDate() + 1);
  return nextDay.toISOString().split("T")[0];
}
function isFutureDate(dateString) {
  const inputDate = new Date(dateString);
  const today = new Date();

  // Strip the time portion of today's date for a fair comparison
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);
  return inputDate >= today;
}
async function checkIfCompletedAll(userId) {
  const today = getTodayDate();
  let userChallenge = await DailyChallenge.findOne({
    userId: userId,
    date: today,
  });

  if (!userChallenge) {
    userChallenge = await DailyChallenge.findOne({ userId: userId });
    if (!userChallenge) return;
  }
  let letHimSkipStreakVerification = false;
  if (!userChallenge.streakDate) {
    await DailyChallenge.updateOne({ userId: userId }, { streakDate: today });
    userChallenge = await DailyChallenge.findOne({ userId: userId });
    letHimSkipStreakVerification = true;
  }
  if (userChallenge.streakDate === today) {
    let completedAll = 0;
    for (let i = 0; i < numberOfChallenges; i++) {
      if (userChallenge.challenges[i].challengeData.completed) {
        completedAll++;
      }
    }
    if (completedAll === numberOfChallenges) {
      await DailyChallenge.updateOne(
        { userId: userId },
        { streak: userChallenge.streak + 1, streakDate: getNextDay(today) }
      );
      userChallenge = await DailyChallenge.findOne({ userId: userId });
      const xpForUser = await xpSystem.getXpData(userId);
      const doTheyHaveDoubleChallenge =
        await shopAndItems.checkIfHaveInInventory(
          `Double Challenge Rewards`,
          userId
        );
      let gain = coinGain;
      const howManyCoinsToGive =
        gain * xpForUser.multiplier + gain * userChallenge.streak * bonus;

      gain = howManyCoinsToGive;
      if (doTheyHaveDoubleChallenge) {
        gain = howManyCoinsToGive * 2;
      }
      await wallet.addCoins(userId, gain, false, false, true);
    }
  }
  if (!isFutureDate(userChallenge.streakDate)) {
    await DailyChallenge.updateOne(
      { userId: userId },
      { streak: 0, streakDate: getNextDay(today) }
    );
  }
}

module.exports = { checkIfCompletedAll };
