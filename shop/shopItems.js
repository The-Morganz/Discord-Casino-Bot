// Funkcija jelte da dobijes start i endTimes za schema. Ako hoces da expireuje za nekoliko sati, onda passujes in i drugi argument (kolicina sati)
function getDurationDates(whatDoYouWantBro, howManyHours = 1) {
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
  if (whatDoYouWantBro === `hour`) {
    if (howManyHours <= 0) {
      return today.getTime();
    }
    const hourLater = new Date(today.getTime() + howManyHours * 3600000);
    const hourTime = hourLater.getTime();
    return hourTime;
  }
}
// Ovde dodajes iteme, samo prati kako su ostali napisani, ako ne expireuje, napisi na endTime: Infinity, i isto napisi ako je one time use, samo iskoristi removeSpecificItem kad brises item
let shopItems = [
  {
    name: `XP Booster`,
    price: 10000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`end`),
    emoji: `🔼`,
  },
  {
    name: `Double Challenge Rewards`,
    price: 25000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `⏫`,
  },
  {
    name: `Coin Shield`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`hour`, 2),
    emoji: `🛑`,
  },
  {
    name: `High Roller Pass`,
    price: 250000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `🔑`,
  },
  {
    name: `Custom Name License`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `📃`,
  },
  {
    name: `Change Custom Name`,
    price: 200000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `📃`,
  },
  {
    name: `Wealth Multiplier`,
    price: 250000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`hour`, 1),
    emoji: `📈`,
  },
  {
    name: `Interest-Free Loan`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `🏦`,
  },
  {
    name: `Invisible Player`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`hour`, 2),
    emoji: `👻`,
  },
  {
    name: `XP Stealer`,
    price: 100000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`end`),
    emoji: `🐱‍👤`,
  },
  {
    name: `Level Jump`,
    price: 75000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `⏫`,
  },
  {
    name: `Risk Taker's Badge`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
    emoji: `📛`,
  },
  // {
  //   name: `Debt Eraser`,
  //   price: 75000,
  //   startTime: getDurationDates(`now`),
  //   endTime: Infinity,
  // },
];
module.exports = {
  shopItems,
};
