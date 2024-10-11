const wallet = require('./wallet');

// Store users and their join times
const userVoiceTimes = new Map();
const rewardIntervalMs = 60000; // 60 seconds

// Track when a user joins a voice channel
function userJoinedVoice(userId) {
  if (!userVoiceTimes.has(userId)) {
    userVoiceTimes.set(userId, { joinTime: Date.now(), interval: null });
    
    // Start rewarding the user every 60 seconds
    const interval = setInterval(() => {
      rewardUserForVoice(userId);
    }, rewardIntervalMs);

    userVoiceTimes.get(userId).interval = interval;
  }
}

// Track when a user leaves a voice channel
function userLeftVoice(userId) {
  if (userVoiceTimes.has(userId)) {
    const { joinTime, interval } = userVoiceTimes.get(userId);
    rewardUserForVoice(userId); // Reward them one last time when they leave
    
    // Clear the interval to stop further rewards
    clearInterval(interval);
    userVoiceTimes.delete(userId);
  }
}

// Reward the user with 10 coins for staying in voice
function rewardUserForVoice(userId) {
  if (!userVoiceTimes.has(userId)) return;

  wallet.addCoins(userId, 10); // Reward 10 coins
  console.log(`User ${userId} has been rewarded 10 coins for being in voice.`);
}

module.exports = {
  userJoinedVoice,
  userLeftVoice,
};
