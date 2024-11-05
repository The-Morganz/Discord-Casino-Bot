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
let shopItems = [
  {
    name: `XP Booster`,
    price: 5000,
    startTime: getDurationDates(`now`),
    endTime: getDurationDates(`end`),
  },
  {
    name: `Double Challenge Rewards`,
    price: 10000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  {
    name: `Coin Shield`,
    price: 50000,
    startTime: getDurationDates(`now`),
    endTime: Infinity,
  },
  // Add more items as needed
];
module.exports = {
  shopItems,
};
