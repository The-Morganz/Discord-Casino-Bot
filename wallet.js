const fs = require("fs");
const path = require("path");
const User = require('./models/User'); // Import Mongoose User model

// Get or initialize user's wallet in MongoDB
async function initializeWallet(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId, coins: 0, debt: 0, freeSpins: 0, freeSpinsBetAmount: 0 });
        await user.save();
    }
    return user;
}

// Get the balance of a user
async function getCoins(userId) {
    const user = await initializeWallet(userId);
    return user.coins;
}

// Get debt of a user
async function getDebt(userId) {
    const user = await initializeWallet(userId);
    return user.debt;
}

// Add debt to a user
async function addDebt(userId, amount) {
    const user = await initializeWallet(userId);
    if (typeof amount === "number" && amount > 0) {
        user.debt += Math.round(amount + amount * 0.05);
        await user.save();
    } else {
        console.error(`Invalid debt amount: ${amount}`);
    }
}

// Pay off part of the user's debt
async function payDebt(userId, amount) {
    const user = await initializeWallet(userId);
    if (user.debt > 0) {
        user.debt -= Math.round(amount);
        await user.save();
    } else {
        console.log(`User ${userId} has insufficient debt.`);
    }
}

// Clear a user's debt
async function clearDebt(userId) {
    const user = await initializeWallet(userId);
    user.debt = 0;
    await user.save();
}

// Add coins to a user's wallet
async function addCoins(userId, amount, debtFree = false) {
    const user = await initializeWallet(userId);
    if (typeof amount === "number" && amount > 0) {
        if (user.debt > 0 && !debtFree) {
            const tenPercentOffWinnings = Math.round(amount * 0.1);
            await payDebt(userId, tenPercentOffWinnings);
            amount = Math.round(amount * 0.9);
        }
        user.coins += amount;
        await user.save();
    } else {
        console.error(`Invalid coin amount: ${amount}`);
    }
}

// Remove coins from a user's wallet
async function removeCoins(userId, amount) {
    const user = await initializeWallet(userId);
    if (typeof amount === "number" && amount > 0 && user.coins >= amount) {
        user.coins -= amount;
        await user.save();
    } else {
        console.error(`Invalid amount or insufficient balance: ${amount}`);
    }
}

// Get the number of free spins a user has
async function getFreeSpins(userId) {
    const user = await initializeWallet(userId);
    return user.freeSpins;
}

// Add free spins to a user's account with a specific bet amount
async function addFreeSpins(userId, spins, betAmount) {
    const user = await initializeWallet(userId);
    if (typeof spins === "number" && spins > 0 && typeof betAmount === "number" && betAmount > 0) {
        user.freeSpins += spins;
        user.freeSpinsBetAmount = betAmount;
        await user.save();
    } else {
        console.error(`Invalid spins or bet amount: spins=${spins}, betAmount=${betAmount}`);
    }
}

// Get the bet amount for the user's free spin, if available
async function getFreeSpinBetAmount(userId) {
  const user = await initializeWallet(userId); // Ensure the user exists in MongoDB

  // Return freeSpinsBetAmount if there are free spins available, otherwise return null
  return user.freeSpins > 0 ? user.freeSpinsBetAmount : null;
}


// Use a free spin if available and return the bet amount
async function useFreeSpin(userId) {
    const user = await initializeWallet(userId);
    if (user.freeSpins > 0) {
        user.freeSpins -= 1;
        const betAmount = user.freeSpinsBetAmount || 0;
        if (user.freeSpins === 0) {
            user.freeSpinsBetAmount = 0;
        }
        await user.save();
        return betAmount;
    }
    return null;
}

// Get the top 5 users by coin balance
async function getTopUsers(message) {
  try {
      // Query MongoDB for top 5 users based on coins, sorted in descending order
      const topUsers = await User.find().sort({ coins: -1 }).limit(5);

      // Retrieve the display names from Discord for each user
      const leaderboard = await Promise.all(
          topUsers.map(async (user) => {
              try {
                  const member = await message.guild.members.fetch(user.userId);
                  const displayName = member ? member.displayName : "Unknown User";
                  return { displayName, coins: user.coins, userId: user.userId };
              } catch (err) {
                  console.error(`Error fetching member for userId: ${user.userId}`, err);
                  return { displayName: "Unknown User", coins: user.coins, userId: user.userId };
              }
          })
      );

      return leaderboard;
  } catch (error) {
      console.error('Error fetching top users:', error);
      return [];
  }
}

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
