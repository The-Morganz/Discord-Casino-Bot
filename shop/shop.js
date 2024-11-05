// const wallet = require(`../wallet`);
const ShopInventory = require(`../models/ShopInventory`);
const UserInventory = require(`../models/UserInventory`);
const { shopItems } = require(`./shopItems`);
function getDurationDates(whatDoYouWantBro) {
  const today = new Date();

  const tomorrow = new Date(today);

  if (whatDoYouWantBro === `now`) {
    const todayTime = today.getTime();
    return todayTime;
  }
  if (whatDoYouWantBro === `end`) {
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowTime = tomorrow.getTime();
    return tomorrowTime;
  }
}

async function checkIfExpiredItem(userId, endTime, itemName) {
  console.log(endTime);
  if (endTime === 0) {
    return false;
  }
  const rightNow = getDurationDates(`now`);
  console.log(`bomboclart`);
  if (endTime <= rightNow) {
    await removeExpiredItems(userId);
    return true;
  }
  return false;
}

async function removeExpiredItems(userId, endTimeCheck = 1) {
  const currentTime = getDurationDates(`now`); // Get the current time

  // Update the user's inventory by pulling out expired items
  await UserInventory.updateOne(
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

async function saveInDB() {
  for (const item of shopItems) {
    await ShopInventory.findOneAndUpdate(
      { itemName: item.name }, // Search by itemName
      { price: item.price }, // Update the price if item exists
      { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not exists, return the updated document
    );
  }
}

async function getUserInventory(userId) {
  await removeExpiredItems(userId);
  const user = await UserInventory.findOne({ userId: userId });

  // Check if the user exists and return their inventory, or return an empty array
  return user ? user.inventory : [];
}

// Ovo sam exportovo i moze se svuda koristiti, true ako taj item postoji u inventory od usera. Za sad "item" mora biti String. Npr "High Roller Pass"
async function checkIfHaveInInventory(item, userId) {
  const thatInventory = await UserInventory.findOne({
    userId: userId,
    "inventory.itemName": item, // Check if inventory contains the specified item
  });
  const usersInventory = await getUserInventory(userId);
  let expired = false;

  for (let i = 0; i < usersInventory.length; i++) {
    const entry = usersInventory[i];
    if (entry.itemName === item) {
      expired = await checkIfExpiredItem(userId, entry.endTime, entry.itemName);
      break;
    }
  }
  console.log(expired);
  if (thatInventory === null || expired) {
    return false;
  }
  return true;
}

// Logika za dodavanje itema i uzimanje para kad kupis item.... Ovde se (za sad) pise i poruka koja se posalje, returnuje se message
async function buyLogic(itemName, userId) {
  const hasItemInInv = await checkIfHaveInInventory(itemName, userId);
  console.log(hasItemInInv);
  if (hasItemInInv) return `You already have that item!`;
  let itemInfo;
  shopItems.forEach((entry, index) => {
    if (entry.name === itemName) {
      itemInfo = entry;
    }
  });
  await UserInventory.findOneAndUpdate(
    { userId: userId }, // Find the document by itemName
    {
      $push: {
        inventory: {
          itemName: itemInfo.name,
          price: itemInfo.price,
          startTime: itemInfo.startTime,
          endTime: itemInfo.endTime,
        },
      },
    }, // Push new item into the inventory array
    { upsert: true, new: true } // Return the updated document
  );

  return `You've bought the ${itemName}!`;
}

module.exports = {
  saveInDB,
  buyLogic,
  checkIfHaveInInventory,
  checkIfExpiredItem,
  removeExpiredItems,
  getUserInventory,
  removeSpecificItem,
};
