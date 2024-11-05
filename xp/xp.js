const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "xp.json");
const shopAndItems = require(`../shop/shop`);
const UserXP = require("../models/UserXP");

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
async function addXp(userId, amount) {
  let userXP = await UserXP.findOne({ userId });
  if (!userXP) {
    userXP = new UserXP({ userId });
  }
  const doTheyHaveBooster = await shopAndItems.checkIfHaveInInventory(
    `XP Booster`,
    userId
  );
  if (doTheyHaveBooster) {
    amount = amount * 2;
    console.log(amount);
  }
  console.log(doTheyHaveBooster);
  userXP.xp += Math.round(amount);

  // Level up if XP meets or exceeds the requirement
  if (userXP.xp >= userXP.nextLevelXpReq) {
    await levelUp(userId, userXP);
  } else {
    await userXP.save();
  }

  console.log(
    `Added ${amount} XP to user ${userId}. They now have ${userXP.xp} XP.`
  );
}

// Function to handle leveling up
async function levelUp(userId, userXP) {
  userXP.xp = userXP.xp - userXP.nextLevelXpReq;
  userXP.level += 1;
  userXP.multiplier += 0.5;
  userXP.nextLevelXpReq = Math.round(userXP.nextLevelXpReq * 1.3);
  await userXP.save();

  console.log(`${userId} has leveled up to level ${userXP.level}!`);
}

// Function to get XP overview for a user
async function xpOverview(userId, value = false) {
  let userXP = await UserXP.findOne({ userId });
  if (!userXP) {
    userXP = new UserXP({ userId });
    await userXP.save();
  }

  const levelOfPlayer = userXP.level;
  const xpOfPlayer = userXP.xp;
  const xpNeeded = userXP.nextLevelXpReq;

  let message = `<@${userId}> is level **${levelOfPlayer}**. They have **${xpOfPlayer} XP**, and need ${
    xpNeeded - xpOfPlayer
  } XP to level up.`;

  return value ? userXP : message;
}

// Function to get XP data directly
async function getXpData(userId) {
  let userXP = await UserXP.findOne({ userId });
  if (!userXP) {
    userXP = new UserXP({ userId });
    await userXP.save();
  }
  return userXP;
}

// Function to calculate XP based on bet amount
function calculateXpGain(betAmount, normalXpGain) {
  const percentage = Math.min(betAmount, 100); // Cap at 100 coins for 100%
  return (percentage / 100) * normalXpGain;
}

module.exports = {
  addXp,
  getXpData,
  xpOverview,
  calculateXpGain,
  readXpData,
  writeXpData,
};
