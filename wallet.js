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
    wallets[userId] = { coins: 0, debt: 0, freeSpins: 0, freeSpinsBetAmount: 0 };
    saveWallets();
  }
}

// Get the balance of a user
function getCoins(userId) {
  initializeWallet(userId);
  return wallets[userId].coins || 0;
}

// Get debt of a user
function getDebt(userId) {
  initializeWallet(userId);
  return wallets[userId].debt || 0;
}

// Add debt to a user
function addDebt(userId, amount) {
  initializeWallet(userId);
  if (typeof amount === "number" && amount > 0) {
    let addAmount = Math.round(amount + amount * 0.05);
    wallets[userId].debt += addAmount;
    console.log(`Added ${amount} debt to user ${userId}. New debt balance: ${wallets[userId].debt}`);
    saveWallets();
  } else {
    console.error(`Invalid debt amount: ${amount}`);
  }
}

// Pay off part of the user's debt
function payDebt(userId, amount) {
  if (wallets[userId] && wallets[userId].debt > 0) {
    let removeAmount = Math.round(amount);
    wallets[userId].debt -= removeAmount;
    console.log(`Paid ${amount} coins to debt payoff for user ${userId}. New debt balance: ${wallets[userId].debt}`);
    saveWallets();
  } else {
    console.log(`Failed to pay debt: User ${userId} has insufficient debt.`);
  }
}

// Clear a user's debt
function clearDebt(userId) {
  if (wallets[userId]) {
    wallets[userId].debt = 0;
    console.log(`Cleared ${userId}'s debt.`);
    saveWallets();
  } else {
    console.log(`Failed to clear debt: User ${userId} does not exist.`);
  }
}

// Add coins to a user's wallet
function addCoins(userId, amount, debtFree = false) {
  initializeWallet(userId);
  if (typeof amount === "number" && amount > 0) {
    let message = "";
    if (wallets[userId].debt > 0 && !debtFree) {
      let tenPercentOffWinnings = Math.round(amount * 0.1);
      payDebt(userId, tenPercentOffWinnings);
      amount = Math.round(amount * 0.9);
      message = `The bank has taken their fair share... (-${tenPercentOffWinnings} coins)`;
      if (wallets[userId].debt <= 0) {
        message += `\nYou're debt free!`;
      }
    }
    wallets[userId].coins += amount;
    console.log(`Added ${amount} coins to user ${userId}. New balance: ${wallets[userId].coins}`);
    saveWallets();
    return message;
  } else {
    console.error(`Invalid coin amount: ${amount}`);
    return "Invalid coin amount.";
  }
}

// Remove coins from a user's wallet
function removeCoins(userId, amount) {
  initializeWallet(userId);
  if (typeof amount === "number" && amount > 0 && wallets[userId].coins >= amount) {
    wallets[userId].coins -= amount;
    console.log(`Removed ${amount} coins from user ${userId}. New balance: ${wallets[userId].coins}`);
    saveWallets();
  } else {
    console.error(`Invalid amount or insufficient balance: ${amount}`);
  }
}

// Get the number of free spins a user has
function getFreeSpins(userId) {
  initializeWallet(userId);
  return wallets[userId].freeSpins || 0;
}

// Add free spins to a user's account with a specific bet amount
function addFreeSpins(userId, spins, betAmount) {
  initializeWallet(userId);
  if (typeof spins === "number" && spins > 0 && typeof betAmount === "number" && betAmount > 0) {
    wallets[userId].freeSpins = (wallets[userId].freeSpins || 0) + spins;
    wallets[userId].freeSpinsBetAmount = betAmount;
    console.log(`Added ${spins} free spins with bet amount ${betAmount} to user ${userId}.`);
    saveWallets();
  } else {
    console.error(`Invalid spins or bet amount: spins=${spins}, betAmount=${betAmount}`);
  }
}

function getFreeSpinBetAmount(userId) {
  initializeWallet(userId);
  return wallets[userId].freeSpins > 0 ? wallets[userId].freeSpinsBetAmount : null;
}

// Use a free spin if available and return the bet amount
function useFreeSpin(userId) {
  initializeWallet(userId);
  if (wallets[userId].freeSpins > 0) {
    wallets[userId].freeSpins -= 1;
    const betAmount = wallets[userId].freeSpinsBetAmount || 0;
    if (wallets[userId].freeSpins === 0) {
      delete wallets[userId].freeSpinsBetAmount;
    }
    saveWallets();
    return betAmount;
  }
  return null;
}

// Function to get the top 5 users by coin balance
async function getTopUsers(message) {
  const users = Object.entries(wallets);
  const sortedUsers = users.sort((a, b) => b[1].coins - a[1].coins);
  const topUsers = sortedUsers.slice(0, 5);

  const leaderboard = await Promise.all(
    topUsers.map(async ([userId, wallet]) => {
      try {
        const member = await message.guild.members.fetch(userId);
        const displayName = member ? member.displayName : "Unknown User";
        return { displayName, coins: wallet.coins, userId: userId };
      } catch (err) {
        console.error(`Error fetching member for userId: ${userId}`, err);
        return { displayName: "Unknown User", coins: wallet.coins };
      }
    })
  );

  return leaderboard;
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
  addFreeSpins,
  useFreeSpin,
  getFreeSpins,
  getFreeSpinBetAmount
};
