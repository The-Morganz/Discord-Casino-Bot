const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "xp.json");
// Helper function to read the current XP data
function readXpData() {
  if (!fs.existsSync(filePath)) {
    // If the file doesn't exist, create an empty object
    fs.writeFileSync(filePath, JSON.stringify({}));
  }

  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

// Helper function to write the updated XP data
function writeXpData(data) {
  console.log();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4)); // Pretty print with 4 spaces
}

// Function to add XP to a user
function addXp(userId, amount) {
  let xpData = readXpData(); // Read the current data
  console.log(xpData[userId]);
  // If the user doesn't exist in the file, initialize their XP
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, multiplier: 1, nextLevelXpReq: 100 };
  }

  // Add the XP to the user's current XP
  xpData[userId].xp += Math.round(amount);
  console.log(xpData[userId]);
  if (xpData[userId].xp >= xpData[userId].nextLevelXpReq) {
    writeXpData(xpData);
    levelUp(userId);
    return;
  }
  // Write the updated data back to the file
  writeXpData(xpData);

  console.log(
    `Added ${amount} XP to user ${userId}. They now have ${xpData[userId].xp} XP.`
  );
}

function levelUp(userId) {
  let xpData = readXpData(); // Read the current data

  // If the user doesn't exist in the file, initialize their XP
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, multiplier: 1, nextLevelXpReq: 100 };
    return;
  }

  // Add the XP to the user's current XP
  xpData[userId].xp = xpData[userId].xp - xpData[userId].nextLevelXpReq;
  xpData[userId].level++;
  xpData[userId].multiplier += 0.5;
  xpData[userId].nextLevelXpReq = Math.round(
    xpData[userId].nextLevelXpReq * 1.3
  );
  // Write the updated data back to the file
  writeXpData(xpData);

  console.log(`${userId} has leveled up!`);
}
function xpOverview(userId) {
  const xpData = readXpData();
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, multiplier: 1, nextLevelXpReq: 100 };
  }
  const levelOfPlayer = xpData[userId].level;
  const xpOfPlayer = xpData[userId].xp;
  const xpNeeded = xpData[userId].nextLevelXpReq;

  let message = `<@${userId}> is level **${levelOfPlayer}**. They have **${xpOfPlayer}xp**, and need ${
    xpNeeded - xpOfPlayer
  }xp to level up. `;
  return message;
}
function getXpData(userId) {
  let xpData = readXpData(); // Read the current data

  // If the user doesn't exist in the file, initialize their XP
  if (!xpData[userId]) {
    xpData[userId] = { xp: 0, level: 1, multiplier: 1, nextLevelXpReq: 100 };
  }
  return xpData[userId];
}
// Function to calculate XP based on bet amount
function calculateXpGain(betAmount, normalXpGain) {
  // Calculate the percentage based on bet
  const percentage = Math.min(betAmount, 100); // Cap at 100 coins for 100%
  const xpGain = (percentage / 100) * normalXpGain; // Adjust XP based on percentage
  return xpGain;
}

module.exports = { addXp, getXpData, xpOverview, calculateXpGain };
