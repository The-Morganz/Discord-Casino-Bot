const xpSystem = require(`./xp/xp`);
const wallet = require(`./wallet`);
const shopAndItems = require(`./shop/shop`);
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
  const playerDebt = await wallet.getDebt(targetUserId);
  const playerInventory = await shopAndItems.getUserInventory(
    targetUserId,
    true
  );

  if (targetUserId === `1292934767511212042`) {
    playerInfo += `🎲 Player username: ${mentionedUser.displayName}.. Wait... That's me!\n`;
    playerInfo += `🎲 Level: 999\n`;
    playerInfo += `🎲 Wallet: ${playerWallet} coins ${
      playerWallet < 0 ? `.But remember, *The house **always** wins*\n` : `\n`
    }`;
    playerInfo += `🎲Inventory: "Devil's Blessing"\n`;
  } else {
    playerInfo += `:information: Player username: ${mentionedUser.displayName}\n`;
    playerInfo += `:arrow_up: Level: ${playerLevel.level}\n`;
    playerInfo += `:coin: Wallet: ${playerWallet} coins\n`;
    playerInfo += `${
      playerDebt > 0
        ? `💳 Debt: ${playerDebt} ${
            playerDebt > playerWallet ? `.It's not looking good...` : ``
          }\n`
        : ``
    }`;
    playerInfo += `${
      playerInventory === `` || !playerInventory
        ? `🎒 This person doesn't have anything in their inventory\n`
        : `🎒 Inventory: ${playerInventory}\n`
    }`;
  }

  return playerInfo;
}

module.exports = { getPlayerInfoString };
