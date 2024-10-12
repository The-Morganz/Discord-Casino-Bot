const fs = require('fs');
const path = require('path');
const messageChallenge = require('./daily_message');
const imageChallenge = require('./daily_image');

// Path to store daily challenge progress
const dailyFilePath = path.join(__dirname, 'daily.json');
let dailyChallenges = {};

// Load daily challenge progress
function loadDailyChallenges() {
  try {
    if (!fs.existsSync(dailyFilePath)) {
      fs.writeFileSync(dailyFilePath, JSON.stringify({}));
    }
    const data = fs.readFileSync(dailyFilePath, 'utf8');
    dailyChallenges = data.trim() === '' ? {} : JSON.parse(data);
  } catch (err) {
    console.error("Error loading daily challenges:", err);
    dailyChallenges = {}; // Fallback to empty object
  }
}

// Save daily challenge progress
function saveDailyChallenges() {
  fs.writeFileSync(dailyFilePath, JSON.stringify(dailyChallenges, null, 2), 'utf8');
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Randomly assign a challenge type
function assignRandomChallenge() {
  const challengeTypes = ['message', 'image'];
  return challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
}

// Initialize a daily challenge for a user if they don't have one for the day or reset if it's a new day
function initializeDailyChallenge(userId) {
  const today = getTodayDate();

  if (!dailyChallenges[userId] || dailyChallenges[userId].date !== today) {
    const challengeType = assignRandomChallenge();
    let challengeData = { date: today, completed: false };

    if (challengeType === 'message') {
      challengeData = { ...challengeData, ...messageChallenge.initializeMessageChallenge(userId) };
    } else if (challengeType === 'image') {
      challengeData = { ...challengeData, ...imageChallenge.initializeImageChallenge(userId) };
    }

    dailyChallenges[userId] = challengeData;
    saveDailyChallenges();
  }
}

// Increment based on challenge type
function incrementChallenge(userId, isImage = false) {
  initializeDailyChallenge(userId);
  let userChallenge = dailyChallenges[userId];

  if (userChallenge.challengeType === 'message' && !isImage) {
    userChallenge = messageChallenge.incrementMessageCount(userChallenge, userId);
  } else if (userChallenge.challengeType === 'image' && isImage) {
    userChallenge = imageChallenge.incrementImageCount(userChallenge, userId);
  }

  dailyChallenges[userId] = userChallenge;
  saveDailyChallenges();
}

// Get daily status
function getDailyStatus(userId) {
  initializeDailyChallenge(userId);
  const userChallenge = dailyChallenges[userId];

  if (userChallenge.challengeType === 'message') {
    return messageChallenge.getMessageStatus(userChallenge);
  } else if (userChallenge.challengeType === 'image') {
    return imageChallenge.getImageStatus(userChallenge);
  }
}

loadDailyChallenges();

module.exports = {
  incrementChallenge,
  getDailyStatus,
};
