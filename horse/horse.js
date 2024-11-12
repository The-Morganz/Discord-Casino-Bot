const horseRacing = require(`../models/HorseRacing`);
const wallet = require(`../wallet`);
let horses = [];
const horseAmount = 6;
let splitDecision = false;
let raceInProgress = false;
let countdown = undefined;
let amountOfTimeToWaitInMs;
let timeOfStartCountdown = 0;
let minutesToStart = 5;
async function addHorseBet(userId, amount, horseNumber, message) {
  await horseRacing.findOneAndUpdate(
    { userId: userId },
    { betAmount: amount, horseNumber: horseNumber },
    { upsert: true }
  );
  await wallet.removeCoins(userId, amount, true);
  message.reply(
    `🐎Your bet (${amount} coins) on **Horse ${horseNumber}** has been placed.🐎`
  );
}
async function removeHorseBets() {
  const allUsers = await horseRacing.find();
  for (let i = 0; i < allUsers.length; i++) {
    await horseRacing.findOneAndUpdate(
      { userId: allUsers[i].userId },
      { betAmount: 0 }
    );
  }
}

function shuffleChances(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

function generateArrayWithSum(length, min = 5, max = 35) {
  let arr = Array(length).fill(0);
  let sum = 100;

  for (let i = 0; i < length - 1; i++) {
    // Set a maximum value for the current element so we don't exceed 100 for the entire array
    let maxValue = Math.min(max, sum - min * (length - i - 1));

    // Generate a random number within the specified min and adjusted max
    let value = Math.floor(Math.random() * (maxValue - min + 1)) + min;

    arr[i] = value;
    sum -= value;
  }

  // Assign the remaining sum to the last element, ensuring it's within the min and max bounds
  arr[length - 1] = Math.max(min, Math.min(sum, max));

  return arr;
}
function getHorseChances() {
  let originalChances = generateArrayWithSum(horseAmount);
  return shuffleChances(originalChances); // Sum should be 100
}
generateHorses(horseAmount);
async function isBetValid(betAmount, horseNumber, userId) {
  const theirWallet = await wallet.getCoins(userId);
  if (raceInProgress) {
    return `A race is in progress.`;
  }
  if (theirWallet < betAmount) {
    return `You don't have enough coins in your wallet!`;
  }
  if (betAmount > 10000000) {
    return `You can't bet that much!`;
  }
  if (isNaN(betAmount) || isNaN(horseNumber)) {
    return `Not a valid number. Use "$horsebet [amount of coins] [horse number]"`;
  }
  if (horseNumber > horses.length) {
    return `Not a valid horse number.`;
  }
  return true;
}
function generateHorses(howMany) {
  horses = [];
  splitDecision = false;
  const horseChancesArray = getHorseChances();
  for (let i = 0; i < howMany; i++) {
    horses.push({
      horseNumber: i + 1,
      chance: horseChancesArray[i],
      position: 0,
      moveTimesThisTurn: 0,
      kvota: Number((1 / (horseChancesArray[i] / 100)).toFixed(2)),
    });
  }
}
function getHorseStats(message) {
  if (raceInProgress)
    return message.reply(`You can't check the statistics now!`);
  let messageToSend = ``;
  for (let i = 0; i < horses.length; i++) {
    messageToSend += `🐎Horse ${horses[i].horseNumber}: Odds(quota): **${horses[i].kvota}**.\n`;
  }
  message.reply(messageToSend);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function sendUpdate(message, finishLine) {
  let theMessageToSend = ``;
  for (let i = 0; i < horses.length; i++) {
    let repeatBullshit = finishLine - horses[i].position;
    if (repeatBullshit < 0) repeatBullshit = 0;
    theMessageToSend +=
      `🐎${horses[i].horseNumber}:checkered_flag:` +
      "-".repeat(repeatBullshit) +
      `🏇\n`;
  }
  await message.edit(theMessageToSend);
}
async function startGame(message) {
  const finishLine = 30;
  let someoneFinished = false;
  let whoFinishedAtSameTime = [];

  const theRaceAnimationMessage = await message.channel.send(
    `🐎**Horse race is starting...**🐎`
  );
  await sleep(1500);
  raceInProgress = true;
  while (!someoneFinished) {
    for (let i = 0; i < horses.length; i++) {
      horses[i].moveTimesThisTurn++;
      const randomChance = Math.random();
      if (randomChance >= 0.5) {
        horses[i].moveTimesThisTurn++;
      }
      if (randomChance >= 0.1) {
        horses[i].moveTimesThisTurn++;
      }
      const horseChanceMoveNumber = Math.trunc(Math.random() * 100);
      if (horseChanceMoveNumber <= horses[i].chance) {
        horses[i].moveTimesThisTurn++;
        horses[i].moveTimesThisTurn++;
      }
      horses[i].position += horses[i].moveTimesThisTurn;
      horses[i].moveTimesThisTurn = 0;
    }

    for (let i = 0; i < horses.length; i++) {
      if (horses[i].position >= finishLine) {
        someoneFinished = true;
        horseWonIndex = i;
        whoFinishedAtSameTime.push(horses[i]);
      }
    }
    await sleep(1500);
    await sendUpdate(theRaceAnimationMessage, finishLine);
  }
  const winner = decideWinner(whoFinishedAtSameTime);
  await message.channel.send(
    `🐎**Horse ${winner.horseNumber} won the race!**🐎`
  );
  await givePayouts(winner, message);
}

async function givePayouts(winner, message) {
  const allUsers = await horseRacing.find();

  for (let i = 0; i < allUsers.length; i++) {
    if (allUsers[i].betAmount <= 0) continue;
    if (winner.horseNumber === allUsers[i].horseNumber) {
      const gain = allUsers[i].betAmount * winner.kvota;
      const coinMessage = await wallet.addCoins(allUsers[i].userId, gain);
      await message.channel.send(
        `🐎<@${allUsers[i].userId}>'s horse won ${
          splitDecision ? `by a split decision` : ``
        }, and they gained ${gain} coins! ${
          coinMessage === `` ? `` : coinMessage
        }🐎`
      );
    } else {
      await message.channel.send(
        `🐎<@${allUsers[i].userId}>'s horse lost, and they lost -${allUsers[i].betAmount} coins!🐎`
      );
    }
    await sleep(1500);
  }
  raceInProgress = false;
  countdown = undefined;
  await removeHorseBets();
  generateHorses(horseAmount);
}

function decideWinner(whoFinishedAtSameTime) {
  if (whoFinishedAtSameTime.length > 1) splitDecision = true;
  const theWinner = whoFinishedAtSameTime.reduce((highest, horse) => {
    if (horse.position > highest.position) {
      return horse;
    } else if (horse.position === highest.position) {
      return horse.kvota > highest.kvota ? horse : highest;
    }
    return highest;
  }, whoFinishedAtSameTime[0]);

  return theWinner;
}
async function theFinalCountdown(message) {
  if (countdown) {
    return;
  }
  amountOfTimeToWaitInMs = minutesToStart * (1000 * 60);
  // setTimeout(() => {

  // }, timeToNotify);
  timeOfStartCountdown = new Date().getTime();

  countdown = setTimeout(() => {
    startGame(message);
    timeOfStartCountdown = 0;
  }, amountOfTimeToWaitInMs);
  // 600000
  message.channel.send(
    `🐎**Horse race will start in ${minutesToStart} minutes**🐎`
  );
}
function whenDoesRaceStart(message, noMessage = false) {
  if (timeOfStartCountdown === 0 && !raceInProgress && !noMessage) {
    return message.reply(
      `🐎Horse race hasn't been announced yet, use **"$horsebet [amount of coins] [horse number]"** to start the countdown🐎`
    );
  }
  if (raceInProgress)
    return message.reply(`A race is ongoing. Try again in a moment...`);
  const currentTime = new Date().getTime();
  let minutesPassed = Math.floor(
    (currentTime - timeOfStartCountdown) / (1000 * 60)
  );
  if (!noMessage)
    message.reply(
      `🐎${minutesToStart - minutesPassed} minutes until race start.🐎`
    );
  return minutesToStart - minutesPassed;
}
async function notify(user) {
  if (!countdown)
    return `🐎No horse race planned soon! Use "$horsebet [amount of coins] [horse number]" to start the countdown🐎`;
  const areTheyBeingNotified = await horseRacing.findOne({
    userId: user.id,
  });
  if (areTheyBeingNotified.notify) {
    return `You will be notified. Okay?`;
  }
  await horseRacing.findOneAndUpdate({ userId: user.id }, { notify: true });

  let timeToNotify = (whenDoesRaceStart(`gay`, true) - 2) * (1000 * 60);
  if (timeToNotify <= 0) timeToNotify = 1;
  setTimeout(() => {
    user.send(
      `🐎The horse race will start soon... You bet on horse ${areTheyBeingNotified.horseNumber}🐎`
    );
    console.log(`Notified.`);
    removeNotifyFromMongo(user);
  }, timeToNotify);
  return `🐎You will be notified some time before the race starts.🐎`;
}
async function removeNotifyFromMongo(user) {
  await horseRacing.findOneAndUpdate({ userId: user.id }, { notify: false });
}

module.exports = {
  addHorseBet,
  isBetValid,
  startGame,
  theFinalCountdown,
  whenDoesRaceStart,
  getHorseStats,
  notify,
};
