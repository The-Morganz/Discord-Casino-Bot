const fs = require("fs");
const path = require("path");

const walletFilePath = path.join(__dirname, "data.json");
let wallets = {};

// Load wallets from the JSON file
function loadWallets() {
  try {
    const data = fs.readFileSync(walletFilePath, "utf8");
    wallets = JSON.parse(data);
  } catch (err) {
    console.error("Error loading wallets:", err);
  }
}

// Save wallets to the JSON file
function saveWallets() {
  fs.writeFileSync(walletFilePath, JSON.stringify(wallets, null, 2), "utf8");
}

// Initialize a user's wallet
function initializeWallet(userId) {
  if (!wallets[userId]) {
    wallets[userId] = { coins: 0 };
    saveWallets();
  }
}

// Get the balance of a user
function getCoins(userId) {
  return wallets[userId] ? wallets[userId].coins : 0;
}

// Add coins to a user's wallet
function addCoins(userId, amount) {
  if (!wallets[userId]) {
    wallets[userId] = { coins: 0 }; // Initialize if not present
  }
  wallets[userId].coins += amount; // Update balance
  console.log(
    `Added ${amount} coins to user ${userId}. New balance: ${wallets[userId].coins}`
  );
  saveWallets(); // Save changes to JSON file
}

// Remove coins from a user's wallet
function removeCoins(userId, amount) {
  if (wallets[userId]) {
    console.log(`Attempting to remove ${amount} coins from user ${userId}.`);

    if (wallets[userId].coins >= amount) {
      wallets[userId].coins -= amount; // Deduct the amount
      console.log(
        `Removed ${amount} coins from user ${userId}. New balance: ${wallets[userId].coins}`
      );
      saveWallets(); // Save changes to the JSON file
    } else {
      console.log(
        `Failed to remove coins: User ${userId} doesn't have enough coins.`
      );
    }
  } else {
    console.log(`Failed to remove coins: User ${userId} doesn't exist.`);
  }
}

// Function to get the top 5 users by coin balance
function getTopUsers() {
  const users = Object.entries(wallets); // Convert wallets object to array of [userId, wallet] pairs
  const sortedUsers = users.sort((a, b) => b[1].coins - a[1].coins); // Sort by coin balance, descending

  // Get the top 5 users
  const topUsers = sortedUsers.slice(0, 5);

  return topUsers.map(([userId, wallet]) => ({ userId, coins: wallet.coins })); // Return array of top 5 users with coins
}

// Load wallets on startup
loadWallets();

// Export the wallet functions
module.exports = {
  initializeWallet,
  getCoins,
  addCoins,
  removeCoins,
  getTopUsers,
};
