const fs = require("fs");
const path = require("path");
const DailyChallenge = require("../models/DailyChallenge");
const messageChallenge = require("./daily_message");
const imageChallenge = require("./daily_image");
const voiceChallenge = require(`./daily_voice`);
const playBlackjackChallenge = require(`./daily_playBlackjack`);
const playSlotsChallenge = require(`./daily_playSlots`);
const playGridChallenge = require(`./daily_playGrid`);
const playHorseChallenge = require(`./daily_horse`);
const santaGiveChallenge = require(`./daily_give`);
const winFlipChallenge = require(`./daily_winFlip`);
const xpSystem = require("../xp/xp");
const shopAndItems = require(`../shop/shop`);

// Path to store daily challenge progress
const dailyFilePath = path.join(__dirname, "daily.json");
let dailyChallenges = {};
const numberOfChallenges = 3;
const coinGain = 300;
const bonus = 0.5;

// Load daily challenge progress
function loadDailyChallenges() {
  try {
    if (!fs.existsSync(dailyFilePath)) {
      fs.writeFileSync(dailyFilePath, JSON.stringify({}));
    }
    const data = fs.readFileSync(dailyFilePath, "utf8");
    dailyChallenges = data.trim() === "" ? {} : JSON.parse(data);
  } catch (err) {
    console.error("Error loading daily challenges:", err);
    dailyChallenges = {}; // Fallback to empty object
  }
}

// Save daily challenge progress
function saveDailyChallenges() {
  fs.writeFileSync(
    dailyFilePath,
    JSON.stringify(dailyChallenges, null, 2),
    "utf8"
  );
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Randomly assign a challenge type
function assignRandomChallenge(array = getChallengeTypes()) {
  const challengeTypes = array;
  return challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
}
function getChallengeTypes() {
  return [
    "message",
    "image",
    `voice`,
    `playBlackjack`,
    `playSlots`,
    `playGrid`,
    `playHorse`,
    `santaGive`,
    `winFlip`,
  ];
}

// Initialize or update a daily challenge for a user
async function initializeDailyChallenge(userId) {
  const today = getTodayDate();
  let userChallenge = await DailyChallenge.findOne({
    userId: userId,
    date: today,
  });
  const challengeTypes = getChallengeTypes();
  if (!userChallenge) {
    await DailyChallenge.findOneAndUpdate(
      { userId: userId },
      { challenges: [] },
      { upsert: true }
    );
  }
  if (!userChallenge) {
    for (let i = 0; i < numberOfChallenges; i++) {
      const challengeType = assignRandomChallenge(challengeTypes);
      let challengeData = {
        userId: userId,
        date: today,
        completed: false,
        gainedXpReward: false,
        challengeType,
      };

      switch (challengeType) {
        case `message`:
          challengeData = {
            ...challengeData,
            ...messageChallenge.initializeMessageChallenge(userId),
          };
          break;
        case `image`:
          challengeData = {
            ...challengeData,
            ...imageChallenge.initializeImageChallenge(userId),
          };
          break;
        case `voice`:
          challengeData = {
            ...challengeData,
            ...voiceChallenge.initializeVoiceChallenge(userId),
          };
          break;
        case `playBlackjack`:
          challengeData = {
            ...challengeData,
            ...playBlackjackChallenge.initializePlayBlackjackChallenge(userId),
          };
          break;
        case `playSlots`:
          challengeData = {
            ...challengeData,
            ...playSlotsChallenge.initializePlaySlotsChallenge(userId),
          };
          break;
        case `playGrid`:
          challengeData = {
            ...challengeData,
            ...playGridChallenge.initializePlayGridChallenge(userId),
          };
          break;
        case `playHorse`:
          challengeData = {
            ...challengeData,
            ...playHorseChallenge.initializePlayHorseChallenge(userId),
          };
          break;
        case `santaGive`:
          challengeData = {
            ...challengeData,
            ...santaGiveChallenge.initializeGiveChallenge(userId),
          };
          break;
        case `winFlip`:
          challengeData = {
            ...challengeData,
            ...winFlipChallenge.initializeWinFlipChallenge(userId),
          };
          break;
        default:
          break;
      }
      await DailyChallenge.updateOne(
        { userId: userId }, // Match criteria
        { $push: { challenges: { challengeData } } }, // Set the data
        { upsert: true } // Create if it doesn't exist
      );
      const indexOfChalType = challengeTypes.indexOf(challengeType);
      challengeTypes.splice(indexOfChalType, 1);
    }
    await DailyChallenge.updateOne(
      { userId: userId },
      { date: today },
      { upsert: true }
    );
  }
  // Fetch the document to return, whether newly created or pre-existing
  return await DailyChallenge.findOne({ userId, date: today });
  // return userChallenge;
}

// Increment based on challenge type
async function incrementChallenge(userId, typeOfChallenge, amountGiven = 0) {
  const userChallenge = await initializeDailyChallenge(userId);
  let completed = false;
  if (!userChallenge.challenges[0]) {
    return console.log(`Something wrong has happened in daily.js`);
  }
  for (let i = 0; i < numberOfChallenges; i++) {
    // holy yandere dev
    if (
      userChallenge.challenges[i].challengeData.challengeType === `message` &&
      typeOfChallenge === `message`
    )
      completed = await messageChallenge.incrementMessageCount(
        userChallenge,
        userId,
        i
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `image` &&
      typeOfChallenge === `image`
    )
      completed = await imageChallenge.incrementImageCount(
        userChallenge,
        userId,
        i
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `voice` &&
      typeOfChallenge === `voice`
    ) {
      completed = await voiceChallenge.incrementMinutes(
        userChallenge,
        userId,
        i
      );
    }
    if (
      userChallenge.challenges[i].challengeData.challengeType ===
        `playBlackjack` &&
      typeOfChallenge === `playBlackjack`
    )
      completed = await playBlackjackChallenge.incrementGames(
        userChallenge,
        userId,
        i
      );

    if (
      userChallenge.challenges[i].challengeData.challengeType === `playGrid` &&
      typeOfChallenge === `playGrid`
    )
      completed = await playGridChallenge.incrementGridGames(
        userChallenge,
        userId,
        i
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `playHorse` &&
      typeOfChallenge === `playHorse`
    )
      completed = await playHorseChallenge.incrementGames(
        userChallenge,
        userId,
        i
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `santaGive` &&
      typeOfChallenge === `santaGive`
    )
      completed = await santaGiveChallenge.incrementAmount(
        userChallenge,
        userId,
        i,
        amountGiven
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `winFlip` &&
      typeOfChallenge === `winFlip`
    )
      completed = await winFlipChallenge.incrementFlipWins(
        userChallenge,
        userId,
        i
      );
    if (
      userChallenge.challenges[i].challengeData.challengeType === `playSlots` &&
      typeOfChallenge === `playSlots`
    )
      completed = await playSlotsChallenge.incrementSlotsGames(
        userChallenge,
        userId,
        i
      );
  }
}

// DAILY STATUS
async function getDailyStatus(userId) {
  const userChallenge = await initializeDailyChallenge(userId);
  let statusMessage = `🔥Daily Challenge Streak: ${userChallenge.streak}\n\n`;
  for (let i = 0; i < numberOfChallenges; i++) {
    switch (userChallenge.challenges[i].challengeData.challengeType) {
      case `message`:
        statusMessage += await messageChallenge.getMessageStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `image`:
        statusMessage += await imageChallenge.getImageStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `voice`:
        statusMessage += await voiceChallenge.getVoiceStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `playBlackjack`:
        statusMessage += await playBlackjackChallenge.getGameStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `playSlots`:
        statusMessage += await playSlotsChallenge.getSlotsGameStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `playGrid`:
        statusMessage += await playGridChallenge.getGameStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `playHorse`:
        statusMessage += await playHorseChallenge.getGameStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `santaGive`:
        statusMessage += await santaGiveChallenge.getGiveStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      case `winFlip`:
        statusMessage += await winFlipChallenge.getWinFlipStatus(
          userChallenge.challenges[i].challengeData,
          userId
        );
        break;
      default:
        break;
    }
    statusMessage += `\n\n`;
  }
  let completed = 0;
  const userXP = await xpSystem.getXpData(userId);
  for (let i = 0; i < numberOfChallenges; i++) {
    if (userChallenge.challenges[i].challengeData.completed) completed++;
  }
  if (completed === numberOfChallenges) {
    const doTheyHaveDoubleChallenge = await shopAndItems.checkIfHaveInInventory(
      `Double Challenge Rewards`,
      userId
    );
    let gain = coinGain;
    const howManyCoinsToGive =
      gain * userXP.multiplier + gain * userChallenge.streak * bonus;
    gain = howManyCoinsToGive;
    if (doTheyHaveDoubleChallenge) {
      gain = howManyCoinsToGive * 2;
    }
    statusMessage += `You have completed all of the daily challenges! Your Bonus: ${gain} coins!\n\n`;
  }

  // Get XP data for the user and include it in the message

  statusMessage += `You currently have ${userXP.xp} XP and are at level ${userXP.level}.`;

  return statusMessage;
}

loadDailyChallenges();

module.exports = {
  incrementChallenge,
  getDailyStatus,
};
