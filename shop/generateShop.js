const { shopItems } = require(`./shopItems`);
// Ovo sam morao ovde da stavim zato sto me node smara zbog circular dependencies, although sam kinda fixao kad sam dodao da mora passujes wallet kao argument (zbog walleta se desavao circ dependency), ali sam ostavio ovde ako se zbog nekog razloga usere opet, a i plus izgleda kao da znamo sta radimo kad ima vise fileova
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
