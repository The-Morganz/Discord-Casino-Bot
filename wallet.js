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
    wallets[userId] = { coins: 0, debt: 0 };
    saveWallets();
  }
}

// Get the balance of a user
function getCoins(userId) {
  return wallets[userId] ? wallets[userId].coins : 0;
}
function getDebt(userId) {
  return wallets[userId] ? wallets[userId].debt : 0;
}
function addDebt(userId, amount) {
  if (!wallets[userId]) {
    wallets[userId] = { coins: 0, debt: 0 }; // Initialize if not present
  }
  let addAmount = amount + amount * 0.05;
  addAmount = Math.round(addAmount);
  addAmount = Math.trunc(addAmount);
  wallets[userId].debt += addAmount; // Update balance
  console.log(
    `Added ${amount} debt to user ${userId}. New balance: ${wallets[userId].debt}`
  );
  saveWallets(); // Save changes to JSON file
}

function payDebt(userId, amount) {
  if (wallets[userId]) {
    console.log(`Attempting to remove ${amount} coins from user ${userId}.`);

    if (wallets[userId].debt > 0) {
      let removeAmount = Math.round(amount);
      removeAmount = Math.trunc(amount);
      wallets[userId].debt -= removeAmount;
      console.log(
        `Paid ${amount} coins to debt payoff from user ${userId}. New balance: ${wallets[userId].coins}`
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

function clearDebt(userId) {
  if (wallets[userId]) {
    wallets[userId].debt = 0;
    console.log(`Cleared ${userId}'s debt.`);
    saveWallets(); // Save changes to the JSON file
  } else {
    console.log(`Failed to remove coins: User ${userId} doesn't exist.`);
  }
}

// Add coins to a user's wallet
function addCoins(userId, amount, debtFree = false) {
  if (!wallets[userId]) {
    wallets[userId] = { coins: 0, debt: 0 }; // Initialize if not present
  }
  let message = ``;
  if (wallets[userId].debt > 0 && !debtFree) {
    let tenPercentOffWinnings = amount * 0.1;
    tenPercentOffWinnings = Math.round(tenPercentOffWinnings);
    tenPercentOffWinnings = Math.trunc(tenPercentOffWinnings);
    payDebt(userId, tenPercentOffWinnings);
    amount = amount * 0.9;
    amount = Math.round(amount);
    amount = Math.trunc(amount);
    console.log(`The bank has taken their fair share...`);
    message = `The bank has taken their fair share... (-${tenPercentOffWinnings} coins)`;
    if (wallets[userId].debt <= 0) {
      message += `\nYou're debt free!`;
    }
  }
  wallets[userId].coins += Math.round(amount); // Update balance
  console.log(
    `Added ${amount} coins to user ${userId}. New balance: ${wallets[userId].coins}`
  );

  saveWallets(); // Save changes to JSON file
  return message;
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
// function getTopUsers() {
//   const users = Object.entries(wallets); // Convert wallets object to array of [userId, wallet] pairs
//   const sortedUsers = users.sort((a, b) => b[1].coins - a[1].coins); // Sort by coin balance, descending
//   // Get the top 5 users
//   const topUsers = sortedUsers.slice(0, 5);

//   return topUsers.map(([userId, wallet]) => ({ userId, coins: wallet.coins })); // Return array of top 5 users with coins
// }
async function getTopUsers(message) {
  const users = Object.entries(wallets); // Convert wallets object to array of [userId, wallet] pairs
  const sortedUsers = users.sort((a, b) => b[1].coins - a[1].coins); // Sort by coin balance, descending
  const topUsers = sortedUsers.slice(0, 5); // Get the top 5 users

  const leaderboard = await Promise.all(
    topUsers.map(async ([userId, wallet]) => {
      try {
        const member = await message.guild.members.fetch(userId); // Fetch member to get display name
        const displayName = member ? member.displayName : "Unknown User";
        return { displayName, coins: wallet.coins };
      } catch (err) {
        console.error(`Error fetching member for userId: ${userId}`, err);
        return { displayName: "Unknown User", coins: wallet.coins }; // In case of error, fallback to 'Unknown User'
      }
    })
  );

  return leaderboard; // Return array of top 5 users with display names and coins
}

// Load wallets on startup
loadWallets();

// Export the wallet functions
module.exports = {
  initializeWallet,
  getCoins,
  addCoins,
  addDebt,
  payDebt,
  getDebt,
  clearDebt,
  removeCoins,
  getTopUsers,
};
