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
  },
  {
    name: `Double Challenge Rewards`,
    price: 25000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  {
    name: `Coin Shield`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`hour`, 2),
  },
  {
    name: `High Roller Pass`,
    price: 250000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  {
    name: `Custom Name License`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  {
    name: `Change Players Custom Name`,
    price: 200000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  {
    name: `Wealth Multiplier`,
    price: 250000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`hour`, 1),
  },
  {
    name: `Interest-Free Loan`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
];
module.exports = {
  shopItems,
};
