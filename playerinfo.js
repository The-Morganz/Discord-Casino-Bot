const xpSystem = require(`./xp/xp`);
const wallet = require(`./wallet`);
const shopAndItems = require(`./shop/shop`);
const User = require("./models/User");
async function getPlayerInfoString(mentionedUser, targetUserId, userId) {
  let playerInfo = ``;
  const doTheyHaveInvis = await shopAndItems.checkIfHaveInInventory(
    `Invisible Player`,
    targetUserId
  );
  if (doTheyHaveInvis && targetUserId !== userId)
    return `This player's information is hidden.`;
  const playerLevel = await xpSystem.getXpData(targetUserId);
  const playerWallet = await wallet.getCoins(targetUserId);
  const formattedWallet = wallet.formatNumber(playerWallet);
  const playerDebt = await wallet.getDebt(targetUserId);
  const formattedDebt = wallet.formatNumber(playerDebt);
  const playerUser = await User.findOne({ userId: targetUserId });
  const playerInventory = await shopAndItems.getUserInventory(
    targetUserId,
    true
  );

  if (targetUserId === `1292934767511212042`) {
    playerInfo += `🎲 Player username: ${mentionedUser.displayName}.. Wait... That's me!\n`;
    playerInfo += `🎲 Level: 666\n`;
    playerInfo += `🎲 Wallet: ${formattedWallet} coins${
      playerWallet < 0 ? `. But remember, *The house **always** wins*\n` : `\n`
    }`;
    playerInfo += `🎲Inventory: "Devil's Blessing"\n`;
  } else {
    playerInfo += `:information: Player username: ${mentionedUser.displayName}\n`;
    playerInfo += `:arrow_up: Level: ${playerLevel.level}\n`;
    playerInfo += `:coin: Wallet: ${formattedWallet} coins\n`;
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
    playerInfo += `🎭${
      playerUser.customName ? `Custom Name: ${playerUser.customName}` : ``
    }`;
  }

  return playerInfo;
}

module.exports = { getPlayerInfoString };
