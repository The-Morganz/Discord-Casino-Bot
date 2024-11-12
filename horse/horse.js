const horseRacing = require(`../models/HorseRacing`);
const wallet = require(`../wallet`);
let horses = [];
const horseAmount = 6;
let splitDecision = false;
let raceInProgress = false;
let countdown = undefined;
let amountOfTimeToWaitInMs;
let timeOfStartCountdown = 0;
let minutesToStart = 3;
async function addHorseBet(userId, amount, horseNumber, message) {
  const didTheyBetSomewhereElse = await horseRacing.findOne({ userId: userId });
  if (didTheyBetSomewhereElse.channelId !== `0`)
    return message.reply(
      `You already placed a bet on a horse race in a different server!`
    );
  await horseRacing.findOneAndUpdate(
    { userId: userId },
    {
      betAmount: amount,
      horseNumber: horseNumber,
      channelId: message.channel.id,
    },
    { upsert: true }
  );
  await wallet.removeCoins(userId, amount, false);
  message.reply(
    `🐎Your bet (${amount} coins) on **Horse ${horseNumber}** has been placed.🐎`
  );
}
async function removeHorseBets() {
  const allUsers = await horseRacing.find();
  for (let i = 0; i < allUsers.length; i++) {
    await horseRacing.findOneAndUpdate(
      { userId: allUsers[i].userId },
      { betAmount: 0, channelId: 0, notify: false }
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
async function isBetValid(
  betAmount,
  horseNumber,
  userId,
  doTheyHaveHighRollerPass
) {
  const theirWallet = await wallet.getCoins(userId);
  if (raceInProgress) {
    return `A race is in progress.`;
  }
  if (theirWallet < betAmount) {
    return `You don't have enough coins in your wallet!`;
  }
  if (betAmount > 10000 && !doTheyHaveHighRollerPass) {
    return `You can't bet that much!`;
  }
  if (betAmount > 10000000 && doTheyHaveHighRollerPass) {
    return `Even with a High Roller Pass, you can't bet that much.`;
  }
  if (isNaN(betAmount) || isNaN(horseNumber) || betAmount <= 0) {
    return `Not a valid number. Use "$horsebet [amount of coins] [horse number]"`;
  }
  if (horseNumber === 69) {
    return `Seriously?`;
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
  let messageToSend = `The horse statistics for the upcoming horse race:\n`;
  for (let i = 0; i < horses.length; i++) {
    messageToSend += `Horse ${horses[i].horseNumber}: Odds(quota): **${horses[i].kvota}**.\n`;
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
      `${horses[i].horseNumber}:checkered_flag:` +
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
  let messageToSend = `:man_red_haired: I'm here with horse number ${winner.horseNumber}. Let's hear what they have to say.`;
  await message.channel.send(messageToSend);
  await sleep(1500);
  const interview = await horseOneLiner(winner);
  await message.channel.send(`\n🐴${interview}`);
}

async function givePayouts(winner, message) {
  const allUsers = await horseRacing.find({
    channelId: { $eq: `${message.channel.id}` },
    betAmount: { $gt: 0 },
  });
  console.log(allUsers);
  const channelId = message.channel.id;
  for (let i = 0; i < allUsers.length; i++) {
    if (allUsers[i].betAmount <= 0 || allUsers[i].channelId !== channelId)
      continue;
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

  let timeToNotify = (whenDoesRaceStart(`gay`, true) - 1) * (1000 * 60);
  if (timeToNotify <= 0) timeToNotify = 1;
  setTimeout(() => {
    user.send(
      `🐎The horse race will start soon... You bet on horse ${areTheyBeingNotified.horseNumber}🐎`
    );
    console.log(`Notified.`);
    // removeNotifyFromMongo(user);
  }, timeToNotify);
  return `🐎You will be notified some time before the race starts.🐎`;
}
async function horseOneLiner(winner) {
  const oneLiners = [
    `After months of training, a lot of support from my rider, and him sorting something out with the managers of this race, i can finally say that it was worth it.`,
    `I told my rider it's not just about winning, but now that I have, it actually feels pretty great!`,
    `Who knew carrots and pep talks could get me this far?`,
    `Winning feels almost as good as that time I found a patch of untouched grass!`,
    `The secret? I just ran to the finish line.`,
    `They said I had a 1 in ${horseAmount} chance... turns out I had a one-in-none excuse to lose!`,
    `I'd like to thank my four legs for making this possible. Couldn't have done it without them!`,
    `All that time pretending to be tired in training really paid off today!`,
    `Winning was a breeze! …Well, maybe not for my competition.`,
    `Wasn't really planning to win; just wanted to show off my new shoes.`,
    `When you're this fast, every day is a cheat day.`,
    `To my competitors: better luck next time! I'll be on vacation.`,
  ];
  const oneLiner = oneLiners[Math.floor(Math.random() * oneLiners.length)];
  // messageToSend += oneLiner;
  return oneLiner;
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
