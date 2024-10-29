const fs = require("fs");
const path = require("path");
const DailyChallenge = require('../models/DailyChallenge');
const messageChallenge = require("./daily_message");
const imageChallenge = require("./daily_image");
const xpSystem = require("../xp/xp");

// Path to store daily challenge progress
const dailyFilePath = path.join(__dirname, "daily.json");
let dailyChallenges = {};

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
function assignRandomChallenge() {
  const challengeTypes = ["message", "image"];
  return challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
}

// Initialize or update a daily challenge for a user
async function initializeDailyChallenge(userId) {
  const today = getTodayDate();

  let userChallenge = await DailyChallenge.findOne({ userId, date: today });

  if (!userChallenge) {
      const challengeType = assignRandomChallenge();
      let challengeData = {
          userId,
          date: today,
          completed: false,
          challengeType
      };

      if (challengeType === 'message') {
          challengeData = {
              ...challengeData,
              ...messageChallenge.initializeMessageChallenge(userId)
          };
      } else if (challengeType === 'image') {
          challengeData = {
              ...challengeData,
              ...imageChallenge.initializeImageChallenge(userId)
          };
      }

      userChallenge = new DailyChallenge(challengeData);
      await userChallenge.save();
  }

  return userChallenge;
}

// Increment based on challenge type
async function incrementChallenge(userId, isImage = false) {
  const userChallenge = await initializeDailyChallenge(userId);

  if (userChallenge.challengeType === 'message' && !isImage) {
      const completed = await messageChallenge.incrementMessageCount(userChallenge, userId);
      if (completed) {
          await xpSystem.addXp(userId, 100); // Reward 100 XP for completing the message challenge
      }
  } else if (userChallenge.challengeType === 'image' && isImage) {
      const completed = await imageChallenge.incrementImageCount(userChallenge, userId);
      if (completed) {
          await xpSystem.addXp(userId, 100); // Reward 100 XP for completing the image challenge
      }
  }

  await userChallenge.save();
}


// DAILY STATUS
async function getDailyStatus(userId) {
  const userChallenge = await initializeDailyChallenge(userId);

  let statusMessage = '';
  if (userChallenge.challengeType === 'message') {
      statusMessage = await messageChallenge.getMessageStatus(userChallenge, userId);
  } else if (userChallenge.challengeType === 'image') {
      statusMessage = await imageChallenge.getImageStatus(userChallenge, userId);
  }

  // Get XP data for the user and include it in the message
  const userXP = await xpSystem.getXpData(userId);
  statusMessage += `\nYou currently have ${userXP.xp} XP and are at level ${userXP.level}.`;

  return statusMessage;
}

loadDailyChallenges();

module.exports = {
  incrementChallenge,
  getDailyStatus,
};
