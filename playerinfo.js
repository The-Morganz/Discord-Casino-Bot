const xpSystem = require(`./xp/xp`);
const wallet = require(`./wallet`);
const shopAndItems = require(`./shop/shop`);
const User = require("./models/User");
const UserStats = require(`./models/UserStats`);
async function getPlayerInfoString(mentionedUser, targetUserId, userId) {
  let playerInfo = ``;
  const doTheyHaveInvis = await shopAndItems.checkIfHaveInInventory(
    `Invisible Player`,
    targetUserId
  );
  if (doTheyHaveInvis && targetUserId !== userId)
    return `This player's information is hidden.`;

  // GENERAL

  const playerLevel = await xpSystem.getXpData(targetUserId);
  const playerWallet = await wallet.getCoins(targetUserId);
  const highestPlayerCoins = await wallet.getHighestCoins(targetUserId);
  const formattedWallet = wallet.formatNumber(playerWallet);
  const formattedHighestCoins = wallet.formatNumber(highestPlayerCoins);
  const playerDebt = await wallet.getDebt(targetUserId);
  const formattedDebt = wallet.formatNumber(playerDebt);
  const playerUser = await User.findOne({ userId: targetUserId });
  const playerUserStats = await UserStats.findOne(
    { userId: targetUserId },
    {},
    { upsert: true }
  );
  const playerInventory = await shopAndItems.getUserInventory(
    targetUserId,
    true
  );
  // GAMES
  const blackjackStats = getGameStats(playerUserStats.games.blackjack);
  const rollsStats = getGameStats(playerUserStats.games.rolls);
  const coinflipStats = getGameStats(playerUserStats.games.coinflip);
  const gridStats = getGameStats(playerUserStats.games.grid);
  const horseStats = getGameStats(playerUserStats.games.horse);

  const playerBjGamesBlackjack = wallet.formatNumber(
    playerUserStats.games.blackjack.gamesBlackjack
  );
  const playerBjGamesPushed = wallet.formatNumber(
    playerUserStats.games.blackjack.gamesPushed
  );

  // SHOP

  const itemsBought = wallet.formatNumber(playerUserStats.shop.itemsBought);
  const itemsCoinsLost = playerUserStats.shop.coinsLost;

  // MISC

  const dailiesDone = wallet.formatNumber(playerUserStats.dailiesDone);
  const highestStreak = wallet.formatNumber(playerUserStats.highestStreak);
  const coinsGiven = wallet.formatNumber(playerUserStats.coinsGiven);
  const leaderboardSpot = wallet.formatNumber(playerUserStats.leaderboardSpot);
  const coinsGainedInVoice = wallet.formatNumber(
    playerUserStats.coinsGainedInVoice
  );

  if (targetUserId === `1292934767511212042`) {
    playerInfo += `🎲 Player username: ${mentionedUser.displayName}.. Wait... That's me!\n`;
    playerInfo += `🎲 Level: 666\n`;
    playerInfo += `🎲 Wallet: ${formattedWallet} coins${
      playerWallet < 0 ? `. But remember, *The house **always** wins*\n` : `\n`
    }`;
    playerInfo += `🎲 Highest coin amount: ${formattedHighestCoins} coins\n`;
    playerInfo += `🎲 Inventory: "Devil's Blessing"\n\n`;

    playerInfo += `🎲 Blackjack games played: ${blackjackStats.gamesPlayed} games\n\n`;
    playerInfo += `🎲 #${leaderboardSpot} on the leaderboard\n`;
  } else {
    playerInfo += `:information: Player username: ${mentionedUser.displayName}\n`;
    playerInfo += `:arrow_up: Level: ${playerLevel.level}\n`;
    playerInfo += `:arrow_up: XP: ${playerLevel.xp} xp\n`;
    playerInfo += `:coin: Wallet: ${formattedWallet} coins\n`;
    playerInfo += `:bank: Highest coin amount: ${formattedHighestCoins} coins\n`;
    playerInfo += `${
      playerDebt > 0
        ? `💳 Debt: ${formattedDebt} ${
            playerDebt > playerWallet ? `.It's not looking good...` : ``
          }\n`
        : ``
    }`;
    playerInfo += `${
      playerInventory === `` || !playerInventory
        ? `🎒 This person doesn't have anything in their inventory\n`
        : `🎒 Inventory: ${playerInventory}\n`
    }`;
    playerInfo += `${
      playerInventory === `` || !playerInventory
        ? `\n`
        : `🛒 Items bought: ${itemsBought}\n\n`
    }`;

    playerInfo += `🃏 Blackjack games played: ${blackjackStats.gamesPlayed} games.Winrate: ${blackjackStats.winRate}% (W:${blackjackStats.gamesWon}) (L:${blackjackStats.gamesLost}) (P:${playerBjGamesPushed}) (BJ:${playerBjGamesBlackjack})\n`;
    playerInfo += `🃏 Blackjack earnings: Won: ${blackjackStats.coinsWon} coins, Lost: ${blackjackStats.coinsLost} coins\n`;
    playerInfo += `🎰 Rolls played: ${rollsStats.gamesPlayed} rolls. Winrate: ${rollsStats.winRate}% (W:${rollsStats.gamesWon}), (L:${rollsStats.gamesLost})\n`;
    playerInfo += `🎰 Roll earnings: Won: ${rollsStats.coinsWon} coins, Lost: ${rollsStats.coinsLost} coins\n`;
    playerInfo += `:coin: Coinflips played: ${coinflipStats.gamesPlayed} times. Winrate: Winrate: ${coinflipStats.winRate}%(W:${coinflipStats.gamesWon}), (L:${coinflipStats.gamesLost})\n`;
    playerInfo += `:coin: Coinflip earnings: Won: ${coinflipStats.coinsWon} coins, Lost: ${coinflipStats.coinsLost} coins\n`;
    playerInfo += `💣 Grid games played: ${gridStats.gamesPlayed} games. Winrate: ${gridStats.winRate}% (W:${gridStats.gamesWon}), (L:${gridStats.gamesLost})\n`;
    playerInfo += `💣 Grid earnings: Won: ${gridStats.coinsWon} coins, Lost: ${gridStats.coinsLost} coins\n`;
    playerInfo += `🏇 Horse races played: ${horseStats.gamesPlayed} races. Winrate: ${horseStats.winRate}% (W:${horseStats.gamesWon}), (L:${horseStats.gamesLost})\n`;
    playerInfo += `🏇 Horse race earnings: Won: ${horseStats.coinsWon} coins, Lost: ${horseStats.coinsLost} coins \n\n`;
    playerInfo += `📅 Daily challenges done: ${dailiesDone} challenges\n`;
    playerInfo += `🔥 Highest daily challenge streak: ${highestStreak} days in a row\n`;
    playerInfo += `💱 Coins given to others: ${coinsGiven} coins\n`;
    playerInfo += `🏆 ${addOrdinalSuffix(
      Number(leaderboardSpot)
    )} on the leaderboard\n`;
    playerInfo += `🕑 Coins by voice reward: ${coinsGainedInVoice} coins\n`;
    playerInfo += `${
      playerUser.customName !== mentionedUser.displayName
        ? `🎭Custom Name: ${playerUser.customName}\n`
        : ``
    }`;
  }

  return playerInfo;
}

function getGameStats(gameStats) {
  return {
    gamesPlayed: wallet.formatNumber(gameStats.gamesPlayed),
    gamesWon: wallet.formatNumber(gameStats.gamesWon),
    gamesLost: wallet.formatNumber(gameStats.gamesLost),
    winRate:
      gameStats.gamesPlayed > 0
        ? ((gameStats.gamesWon / gameStats.gamesPlayed) * 100).toFixed(1)
        : "0", // Prevents NaN if gamesPlayed is 0
    coinsWon: wallet.formatNumber(gameStats.coinsWon),
    coinsLost: wallet.formatNumber(gameStats.coinsLost),
  };
}

function addOrdinalSuffix(num) {
  if (typeof num !== "number" || isNaN(num)) {
    throw new Error("Input must be a valid number");
  }

  let suffix = "th";
  if (num % 100 < 11 || num % 100 > 13) {
    switch (num % 10) {
      case 1:
        suffix = "st";
        break;
      case 2:
        suffix = "nd";
        break;
      case 3:
        suffix = "rd";
        break;
    }
  }

  return num + suffix;
}
module.exports = { getPlayerInfoString };
