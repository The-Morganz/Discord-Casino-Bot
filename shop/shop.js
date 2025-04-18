// const wallet = require(`../wallet`);
const ShopInventory = require(`../models/ShopInventory`);
const User = require("../models/User");
const UserStats = require(`../models/UserStats`);
const UserInventory = require(`../models/UserInventory`);
const { getAllEmojiThemes } = require("../roll/getAllEmojiThemes");
const { shopItems } = require(`./shopItems`);
// Mogo sam da exportujem iz shopItems al se plasim da se nesto ne ukenja pa sam samo kopirao opet ovde, koristi se u checkExpiredItem.
function getDurationDates(whatDoYouWantBro, howManyHours = 1) {
  const today = new Date();
  const tomorrow = new Date(today);
  if (whatDoYouWantBro === Infinity) {
    return Infinity;
  }
  if (whatDoYouWantBro === `now`) {
    const todayTime = today.getTime();
    return todayTime;
  }
  if (whatDoYouWantBro === `end`) {
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowTime = tomorrow.getTime();
    return tomorrowTime;
  }
  if (whatDoYouWantBro.startsWith(`hour`)) {
    howManyHours = whatDoYouWantBro.match(/(\d+)/)[0];
    console.log(howManyHours);
    if (howManyHours <= 0) {
      const hourLater = new Date(today.getTime() + 1 * 3600000);
      const hourTime = hourLater.getTime();
      return hourTime;
    }
    const hourLater = new Date(today.getTime() + howManyHours * 3600000);
    const hourTime = hourLater.getTime();
    return hourTime;
  }
}
// Ovo se najvise koristi u checkIfHaveInInventory, ali moze se i ovako koristiti. Ako je neki item expired, samo ga izbrise i return true, ako ne onda ce return false.
async function checkIfExpiredItem(userId, endTime, itemName) {
  const rightNow = getDurationDates(`now`);
  if (endTime < rightNow) {
    await removeExpiredItems(userId);
    return true;
  }
  return false;
}

// Ovo mi chatgpt pomogo, znaci bukv samo izbrise iteme koji su expired
async function removeExpiredItems(userId, endTimeCheck = 1) {
  const currentTime = getDurationDates(`now`); // Get the current time

  // Update the user's inventory by pulling out expired items
  await UserInventory.updateMany(
    { userId: userId }, // Find the document by userId
    {
      $pull: {
        inventory: {
          endTime: { $lte: currentTime }, // Remove items where endTime is less than or equal to current time
        },
      },
    }
  );
}

// Dodao sam $removeitem fazon ali ne radi zato sto item names imaju spaces i morao bi mnogo da se smaram za nesto sto mogu samo da udjem u databazu i izbrisem ako mi treba. Ovo koristi za one time use items ili ako oces da izbrises neki item nekome.
async function removeSpecificItem(userId, itemName) {
  await UserInventory.updateOne(
    { userId: userId }, // Find the document by userId
    {
      $pull: {
        inventory: {
          itemName: itemName, // Remove items where endTime is less than or equal to current time
        },
      },
    }
  );
}

// Da se updatuje databaza ako dodas nove iteme, nema startTime i endTime zato sto to zavisi od kad igrac kupi, i nije set. Mzd bi mogo da dodam endTime: Infinity za neke iteme al nzm za sad
async function saveInDB() {
  for (const item of shopItems) {
    await ShopInventory.findOneAndUpdate(
      { itemName: item.name }, // Search by itemName
      { price: item.price }, // Update the price if item exists
      { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not exists, return the updated document
    );
  }
}

// Self-Explanitory
async function getUserInventory(userId, string = false) {
  await removeExpiredItems(userId);
  const user = await UserInventory.findOne({ userId: userId });

  // Check if the user exists and return their inventory, or return an empty array
  if (string === false) return user ? user.inventory : [];
  if (!user) return;
  let inventoryString = ``;
  user.inventory.forEach((item, index, arr) => {
    if (arr.length - 1 === index) {
      inventoryString += `${item.itemName}`;
      return;
    }
    inventoryString += `${item.itemName}, `;
  });

  return inventoryString.trim();
}

// Ovo sam exportovo i moze se svuda koristiti, true ako taj item postoji u inventory od usera. Za sad "item" mora biti String. Npr "XP Booster"
async function checkIfHaveInInventory(item, userId) {
  const thatInventory = await UserInventory.findOne({
    userId: userId,
    "inventory.itemName": item, // Check if inventory contains the specified item
  });
  if (thatInventory === null) {
    return false;
  }
  const usersInventory = await getUserInventory(userId);
  let expired = false;

  for (let i = 0; i < usersInventory.length; i++) {
    const entry = usersInventory[i];
    if (entry.itemName === item) {
      expired = await checkIfExpiredItem(userId, entry.endTime, entry.itemName);
      break;
    }
  }
  if (expired) {
    return false;
  }
  return true;
}
async function checkIfHaveThemeInInventory(nameOfTheme, userId) {
  const thatInventory = await UserInventory.findOne({
    userId: userId,
    "themes.themeName": nameOfTheme, // Check if inventory contains the specified item
  });
  if (thatInventory === null) {
    return false;
  }
  return true;
}
async function buyLogicForRollThemes(nameOfTheme, userId, wallet) {
  const hasThemeInInv = await checkIfHaveThemeInInventory(nameOfTheme, userId);
  if (hasThemeInInv) return `You already have that theme!`;
  let themeInfo;
  let themeShopItems = getAllEmojiThemes();
  themeShopItems.forEach((entry, index) => {
    if (entry.name === nameOfTheme) {
      themeInfo = entry;
    }
  });
  const userBalance = await wallet.getCoins(userId);
  if (userBalance < themeInfo.price) {
    return `You don't have enough coins to make this purchase.`;
  }
  const userDebt = await wallet.getDebt(userId);
  if (userDebt !== 0) {
    return `You have to clear your debt before making a purchase!`;
  }
  await UserInventory.findOneAndUpdate(
    { userId: userId }, // Find the document by itemName
    {
      $push: {
        themes: {
          themeName: themeInfo.name,
        },
      },
    }, // Push new item into the inventory array
    { upsert: true } // Return the updated document
  );

  await wallet.removeCoins(userId, themeInfo.price, true);
  return `You bought the ${nameOfTheme} roll theme! Use "$changeroll" to change your theme!`;
}
// Logika za dodavanje itema i uzimanje para kad kupis item.... Ovde se (za sad) pise i poruka koja se posalje, returnuje se message
async function buyLogic(itemName, userId, wallet) {
  const hasItemInInv = await checkIfHaveInInventory(itemName, userId);
  if (hasItemInInv) return `You already have that item!`;

  let itemInfo;
  shopItems.forEach((entry, index) => {
    if (entry.name === itemName) {
      itemInfo = entry;
    }
  });
  const userBalance = await wallet.getCoins(userId);
  if (userBalance < itemInfo.price) {
    return `You don't have enough coins to make this purchase.`;
  }
  const userDebt = await wallet.getDebt(userId);
  if (userDebt !== 0 && itemName !== `Debt Eraser`) {
    return `You have to clear your debt before making a purchase!`;
  }

  await UserInventory.findOneAndUpdate(
    { userId: userId }, // Find the document by itemName
    {
      $push: {
        inventory: {
          itemName: itemInfo.name,
          price: itemInfo.price,
          startTime: getDurationDates(itemInfo.startTime),
          endTime: getDurationDates(itemInfo.endTime),
          riskTaker: itemName === `Risk Taker's Badge` ? true : false,
        },
      },
    }, // Push new item into the inventory array
    { upsert: true } // Return the updated document
  );
  await UserStats.findOneAndUpdate(
    { userId: userId },
    { $inc: { "shop.itemsBought": 1, "shop.coinsLost": itemInfo.price } }
  );
  await wallet.removeCoins(userId, itemInfo.price, true);
  return `You bought the ${itemName}!`;
}

async function customNameSetter(argumentsOfMessage, userId, notSelf = false) {
  let customName = ``;
  let i = 1;
  if (notSelf) i = 2;
  for (i; i < argumentsOfMessage.length; i++) {
    customName += `${argumentsOfMessage[i]} `;
  }
  customName = customName.trim();
  await User.findOneAndUpdate(
    { userId: userId },
    { customName: customName },
    { upsert: true }
  );
  return;
}

async function getCustomName(userId) {
  const thatUser = await User.findOne({
    userId: userId,
  });
  return thatUser.customName;
}

module.exports = {
  saveInDB,
  buyLogic,
  buyLogicForRollThemes,
  checkIfHaveInInventory,
  checkIfExpiredItem,
  removeExpiredItems,
  getUserInventory,
  removeSpecificItem,
  customNameSetter,
  getCustomName,
};
