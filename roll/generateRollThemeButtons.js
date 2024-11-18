const roll = require(`./roll`);
const wallet = require(`../wallet`);
const UserInventory = require(`../models/UserInventory`);
const { getAllEmojiThemes } = require("./getAllEmojiThemes");
// Ovo sam morao ovde da stavim zato sto me node smara zbog circular dependencies, although sam kinda fixao kad sam dodao da mora passujes wallet kao argument (zbog walleta se desavao circ dependency), ali sam ostavio ovde ako se zbog nekog razloga usere opet, a i plus izgleda kao da znamo sta radimo kad ima vise fileova
let shopItems = getAllEmojiThemes();
async function generateRollThemeButtons(
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
  shopItems.forEach((item, index, arr) => {
    let canBuy = false;

    if (walletAmount > item.price) canBuy = true;
    const button = new ButtonBuilder()
      .setCustomId(`buy_themesBuy_${item.name}_${userId}`)
      .setLabel(`${item.emoji} ${item.name} - ${item.price} coins`)
      .setStyle(canBuy ? ButtonStyle.Success : ButtonStyle.Danger);
    row.addComponents(button);

    if ((index + 1) % 5 === 0 || index === shopItems.length - 1) {
      // Create a new row after every 5 items to form a grid layout
      rows.push(row);
      row = new ActionRowBuilder();
    }
    if (index === arr.length - 1) {
      const backButton = new ButtonBuilder()
        .setCustomId(`buy_back_${userId}`)
        .setLabel(`🛒 Back`)
        .setStyle(ButtonStyle.Secondary);
      row.addComponents(backButton);
      rows.push(row);
    }
  });
  // Embed message with instructions
  const embed = new EmbedBuilder()
    .setTitle("Shop")
    .setDescription("Click a button to buy an item.")
    .setColor("#0099ff");
  return { embed, rows };
  // Send message with the shop buttons
}

async function generateChooseThemeButtons(
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  userId,
  message
) {
  let thatUsersInventory = await UserInventory.findOne({ userId: userId });

  if (!thatUsersInventory || thatUsersInventory.themes.length <= 0) {
    await UserInventory.findOneAndUpdate(
      { userId: userId },
      { $push: { themes: { themeName: `Fruits` } } },
      { upsert: true }
    );
    thatUsersInventory = await UserInventory.findOne({ userId: userId });
  }

  let doTheyHaveFruits = false;
  for (let i = 0; i < thatUsersInventory.themes.length; i++) {
    if (thatUsersInventory.themes[i].themeName === `Fruits`)
      doTheyHaveFruits = true;
  }
  if (!doTheyHaveFruits) {
    await UserInventory.findOneAndUpdate(
      { userId: userId },
      { $push: { themes: { themeName: `Fruits` } } },
      { upsert: true }
    );
  }

  thatUsersInventory = await UserInventory.findOne({ userId: userId });
  const rows = [];
  let row = new ActionRowBuilder();
  thatUsersInventory.themes.forEach((e, index, arr) => {
    const button = new ButtonBuilder()
      .setCustomId(`theme_${e.themeName}_${userId}`)
      .setLabel(`${e.themeName}`)
      .setStyle(ButtonStyle.Primary);
    row.addComponents(button);

    if ((index + 1) % 5 === 0 || index === arr.length - 1) {
      // Create a new row after every 5 items to form a grid layout
      rows.push(row);
      row = new ActionRowBuilder();
    }
  });
  await message.reply({
    content: `Select one of your themes.`,
    components: rows,
  });
  return { rows };
}

module.exports = { generateRollThemeButtons, generateChooseThemeButtons };
