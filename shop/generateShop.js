const { shopItems } = require(`./shopItems`);
async function generateShop(
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  userId,
  wallet
) {
  const walletAmount = await wallet.getCoins(userId);
  // Create rows of buttons for the shop
  const rows = [];
  let row = new ActionRowBuilder();
  shopItems.forEach((item, index) => {
    let canBuy = false;
    if (walletAmount > item.price) canBuy = true;

    const button = new ButtonBuilder()
      .setCustomId(`buy_${item.name}_${userId}`)
      .setLabel(`${item.name} - ${item.price} coins`)
      .setStyle(canBuy ? ButtonStyle.Success : ButtonStyle.Danger);
    row.addComponents(button);

    // Create a new row after every 5 items to form a grid layout
    if ((index + 1) % 5 === 0 || index === shopItems.length - 1) {
      rows.push(row);
      row = new ActionRowBuilder();
    }
  });
  // Embed message with instructions
  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription(
      "Click a button to buy an item. $shophelp if you need details."
    )
    .setColor("#0099ff");
  return { embed, rows };
  // Send message with the shop buttons
}

module.exports = { generateShop };
