require("dotenv").config();
const NBAStats = require("../models/NBA");
const UserStats = require(`../models/UserStats`);
// const NBAStats = require(`../models/NBA`);
const NBABets = require(`../models/NBABets`);
const NBAPlayerTickets = require(`../models/NBAPlayerTickets`);
const dailyChallenges = require(`../daily/daily`);
const wallet = require(`../wallet`);
const howManyGamesToDisplay = 4; //otp 15 max ce kazemo
const bookmakers = `betonlineag`;
const market = `h2h`;
const updateEveryHowManyHours = 3;
//gpt
function getCurrentISODate() {
  return new Date().toISOString().split(".")[0] + "Z";
}
//deepseek
function formatISODate(isoString) {
  const date = new Date(isoString);

  // Function to get the ordinal suffix for the day
  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th"; // Covers 11th, 12th, 13th, etc.
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  // Format the date in CET timezone
  const day = date.toLocaleString("en-US", {
    day: "numeric",
    timeZone: "Europe/Berlin",
  });
  const month = date.toLocaleString("en-US", {
    month: "long",
    timeZone: "Europe/Berlin",
  });
  const year = date.toLocaleString("en-US", {
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
  const hours = date
    .toLocaleString("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Berlin",
    })
    .padStart(2, "0");
  const minutes = date
    .toLocaleString("en-US", { minute: "2-digit", timeZone: "Europe/Berlin" })
    .padStart(2, "0");

  const ordinalSuffix = getOrdinalSuffix(day);

  return `${day}${ordinalSuffix} ${month} ${year}, ${hours}:${minutes}(CET)`;
}

function isItUpdateTime(isoTime) {
  if (!isoTime) {
    return true;
  }
  const givenDate = new Date(isoTime);
  const now = new Date();

  const hoursLater = new Date(givenDate.getTime() + 4 * 60 * 60 * 1000);

  return now >= hoursLater;
}
function hasTwoDaysPassed(isoTime) {
  if (!isoTime) {
    return true;
  }
  const givenDate = new Date(isoTime);
  const now = new Date();

  const twoDaysLater = new Date(givenDate.getTime() + 48 * 60 * 60 * 1000);

  return now >= twoDaysLater;
}
function hasThatMomentPassed(isoTime) {
  if (!isoTime) {
    return true;
  }
  const givenDate = new Date(isoTime);
  const now = new Date();

  return now >= givenDate;
}

// Ovo mora da se uradi zato sto ovaj API ima 500 requests per month, sto realno ne moze da se potrose, ali ako neko spamuje komandu i api call, onda je lagano moguce, pa da se onemoguci spamovanje api calls, stavim u databazu pa sa time u databazi radim. Updatuje se samo ako je proslo 2 sata, jer bi ja mogo svakih sat ipo da pozovem api i taman bi namestilo na 500 a month
async function addToDatabase() {
  const NBADatabase = await NBAStats.findOne().sort({ _id: -1 });

  if (!NBADatabase || isItUpdateTime(NBADatabase.lastUpdateTime)) {
    // if (NBADatabase) {
    const oddsAPI = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${
        process.env.ODDS_API_KEY
      }&bookmakers=${bookmakers}&region=us&markets=${market}&commenceTimeFrom=${getCurrentISODate()}`
    );
    let games = await NBAStats.find({}); // Get only gameId field
    const gameIdsArray = [];
    games.forEach((e) => {
      if (!e.completed) {
        gameIdsArray.push(e.id);
      }
    });
    const gameIdsString = gameIdsArray.join(","); // Convert array to comma-separated string
    const oddsAPIScores = await fetch(
      `https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=${process.env.ODDS_API_KEY}&daysFrom=2&eventIds=${gameIdsString}`
    );
    const liveGameStats = await oddsAPIScores.json();
    const stats = await oddsAPI.json();
    let upcomingGames = [];
    stats.forEach((e) => {
      if (!hasThatMomentPassed(e.commence_time)) {
        upcomingGames.push(e);
      }
    });
    const limitedStats = upcomingGames.slice(0, howManyGamesToDisplay);
    const operations = upcomingGames.map((doc) => ({
      updateOne: {
        filter: { id: doc.id },
        update: { $set: doc },
        upsert: true,
      },
    }));

    await NBAStats.bulkWrite(operations);
    games = await NBAStats.find({});
    let newOperations = [];
    for (let i = 0; i < games.length; i++) {
      newOperations.push({
        updateOne: {
          filter: { id: games[i].id },
          update: {
            $set: { gameIndex: i, lastUpdateTime: getCurrentISODate() },
          },
          upsert: true,
        },
      });
    }
    await NBAStats.bulkWrite(newOperations);
    // if (hasTwoDaysPassed(games[i].commence_time)) {
    //   await NBAStats.deleteOne({ id: games[i].id });
    // }
    const bulkOperations = [];

    for (let i = 0; i < liveGameStats.length; i++) {
      if (!liveGameStats[i].scores) {
        continue;
      }

      bulkOperations.push({
        updateOne: {
          filter: { id: liveGameStats[i].id },
          update: {
            $set: {
              completed: liveGameStats[i].completed,
              homeTeamScore: liveGameStats[i]?.scores[0]?.score,
              awayTeamScore: liveGameStats[i]?.scores[1]?.score,
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOperations.length > 0) {
      await NBAStats.bulkWrite(bulkOperations);
    }

    // await NBAStats.deleteMany({});
    await updateAllTickets();
    console.log(`Used a call`);
  }
  // await updateAllTickets();
}
async function updateAllTickets() {
  const allPlayerTickets = await NBAPlayerTickets.find({});

  for (const playerTicket of allPlayerTickets) {
    const { userId, tickets } = playerTicket;

    for (const ticket of tickets) {
      const { ticket: games } = ticket;
      let gamesCompleted = 0;

      for (const game of games) {
        const gameStats = await NBAStats.findOne({ id: game.gameId });

        const updateQuery = {
          $set: {
            [`tickets.${tickets.indexOf(ticket)}.ticket.${games.indexOf(
              game
            )}.completed`]: gameStats.completed,
          },
        };

        await NBAPlayerTickets.updateOne({ userId }, updateQuery);

        if (gameStats.completed) {
          gamesCompleted++;
        }
      }

      if (gamesCompleted === games.length) {
        await givePayouts(userId);
      }
    }
  }
}

async function getNBAUpcoming(page = 1) {
  await addToDatabase();
  // await updateAllTickets();
  page--;
  const databaseNBAGames = await NBAStats.find({});
  if (databaseNBAGames.length === 0) {
    return `I couldn't find any upcoming NBA games.Please try again later (at least 3 hours from now)`;
  }
  let returnMessage = `Here's a list of upcoming NBA games\n\n--------------------------------------------------------------\n`;
  let howManyHaveYouSentBecauseDiscordHasACharacterLimitForFucksSakeWhyDoesEverythingHaveToBeSoComplicatedButNoIActuallyLoveProgrammingImJustMessingAround = 0;
  let noMore = false;
  for (let i = 0; i < databaseNBAGames.length; i++) {
    if (hasThatMomentPassed(databaseNBAGames[i].commence_time)) {
      continue;
    }
    if (
      howManyHaveYouSentBecauseDiscordHasACharacterLimitForFucksSakeWhyDoesEverythingHaveToBeSoComplicatedButNoIActuallyLoveProgrammingImJustMessingAround >
      3
    ) {
      break;
    }
    const indexToUse = i + page * howManyGamesToDisplay;
    if (!databaseNBAGames[indexToUse]?.home_team) {
      break;
    }
    const indexOfHomeTeam = await returnHomeTeamOutcomeIndex(indexToUse);
    let indexOfAwayTeam = 1;
    if (indexOfHomeTeam === 1) {
      indexOfAwayTeam = 0;
    }
    returnMessage += `#${indexToUse}\n**${
      databaseNBAGames[indexToUse].home_team
    }** - **${databaseNBAGames[indexToUse].away_team}**\n${
      databaseNBAGames[indexToUse].bookmakers.length === 0
        ? `We couldn't find the odds for this game at this moment.`
        : `${databaseNBAGames[indexToUse].home_team}(win): **${databaseNBAGames[indexToUse].bookmakers[0].markets[0].outcomes[indexOfHomeTeam].price}**\n${databaseNBAGames[indexToUse].away_team}(win): **${databaseNBAGames[indexToUse].bookmakers[0].markets[0].outcomes[indexOfAwayTeam].price}**`
    }\n\nStarting time: ${formatISODate(
      databaseNBAGames[indexToUse].commence_time
    )}\n${
      databaseNBAGames[indexToUse].bookmakers.length === 0
        ? ``
        : `BET: "$nadd ${indexToUse} **["1" or "2"]**"\n`
    }\n--------------------------------------------------------------\n`;
    howManyHaveYouSentBecauseDiscordHasACharacterLimitForFucksSakeWhyDoesEverythingHaveToBeSoComplicatedButNoIActuallyLoveProgrammingImJustMessingAround++;
    if (!databaseNBAGames[indexToUse + 1]?.home_team) {
      noMore = true;
    }
  }
  if (!noMore) {
    returnMessage += `For the next page, type "$nba ${page + 2}"\n`;
  }
  return returnMessage;
}
// cda2918dff5bd991f43e658102c65f52
async function addToTicket(gameIndex, whichTeam, userId) {
  let returnMessage = ``;
  if (isTicketAdditionValid(gameIndex, whichTeam) !== ``) {
    return isTicketAdditionValid(gameIndex, whichTeam);
  }
  if (Number(whichTeam) === 1) {
    whichTeam = `home`;
  } else {
    whichTeam = `away`;
  }
  const databaseNBAGames = await NBAStats.find({});
  const thatGame = databaseNBAGames[gameIndex];
  if (!thatGame) {
    return `Can't find a game with that id.`;
  }
  const gameIfExists = await NBABets.findOne({ gameId: thatGame.id });
  let playerTickets = await NBAPlayerTickets.findOne({ userId });

  if (!playerTickets) {
    return `No tickets found, select a ticket with "$nt [ticket number]"`;
  }

  const selectedTicketIndex = playerTickets.selectedTicket ?? 0;
  const specificGameIfExists = await NBAPlayerTickets.findOne({
    userId,
    [`tickets.${selectedTicketIndex}.ticket.gameId`]: thatGame.id,
  });

  if (hasThatMomentPassed(thatGame.commence_time)) {
    return `You can't bet on a game that is pending or completed.`;
  }

  if (gameIfExists) {
    for (let i = 0; i < gameIfExists.players.length; i++) {
      if (gameIfExists.players[i].userId === userId) {
        const updateData = gameIfExists.players[i];

        // updateData.betBefore = updateData.betAmount;
        // updateData.betAmount = betAmount;
        updateData.whatTeam = whichTeam;
        await NBABets.findOneAndUpdate(
          { gameId: thatGame.id },
          { players: updateData },
          { upsert: true, new: true }
        );
      }
    }
  }
  if (specificGameIfExists) {
    const indexOfHomeTeam = await returnHomeTeamOutcomeIndex(gameIndex);
    let indexOfAwayTeam = 1;
    if (indexOfHomeTeam === 1) {
      indexOfAwayTeam = 0;
    }

    const thisSpecificTicket = await NBAPlayerTickets.findOne({
      userId: userId,
      [`tickets.${selectedTicketIndex}.ticket.gameId`]: thatGame.id,
    });

    const foundGame =
      thisSpecificTicket?.tickets[selectedTicketIndex]?.ticket.find(
        (game) => game.gameId === thatGame.id
      ) || null;

    let thatTicketsQuotaOnWin =
      playerTickets.tickets[playerTickets.selectedTicket]?.quotaOnWin /
      foundGame.quotaOnGame;
    thatTicketsQuotaOnWin = thatTicketsQuotaOnWin.toFixed(2);

    let quotaOnWin =
      thatTicketsQuotaOnWin *
      thatGame.bookmakers[0].markets[0].outcomes[
        whichTeam === `home` ? indexOfHomeTeam : indexOfAwayTeam
      ].price;

    quotaOnWin = quotaOnWin.toFixed(2);
    await NBAPlayerTickets.findOneAndUpdate(
      { userId: userId },
      { [`tickets.${playerTickets.selectedTicket}.quotaOnWin`]: quotaOnWin },
      { upsert: true }
    );

    await NBAPlayerTickets.findOneAndUpdate(
      {
        userId,
        [`tickets.${selectedTicketIndex}.ticket.gameId`]: thatGame.id,
      },
      {
        $set: {
          [`tickets.${selectedTicketIndex}.ticket.$[game].whatTeam`]: whichTeam,
          [`tickets.${selectedTicketIndex}.ticket.$[game].quotaOnGame`]:
            thatGame.bookmakers[0].markets[0].outcomes[
              whichTeam === `home` ? indexOfHomeTeam : indexOfAwayTeam
            ].price,
        },
      },
      {
        arrayFilters: [{ "game.gameId": thatGame.id }],
        upsert: false,
        new: true,
      }
    );
    await dailyChallenges.incrementChallenge(userId, `playNBA`);

    return `Changed your ticket #${selectedTicketIndex + 1}`;
  }

  await NBABets.findOneAndUpdate(
    { gameId: thatGame.id },
    { gameId: thatGame.id },
    { upsert: true, new: true }
  );

  await NBABets.findOneAndUpdate(
    { gameId: thatGame.id },
    {
      $push: {
        players: { userId: userId, whatTeam: whichTeam },
      },
    },
    { upsert: true }
  );

  let playerTicketsLength = 0;
  if (playerTickets) {
    playerTicketsLength = playerTickets.tickets.length;
  } else {
    await NBAPlayerTickets.findOneAndUpdate(
      { userId: userId },
      { selectedTicket: 0 },
      { upsert: true }
    );
    playerTickets = await NBAPlayerTickets.findOne({ userId: userId });
  }
  const indexOfHomeTeam = await returnHomeTeamOutcomeIndex(gameIndex);
  let indexOfAwayTeam = 1;
  if (indexOfHomeTeam === 1) {
    indexOfAwayTeam = 0;
  }
  if (thatGame.bookmakers.length === 0) {
    return `We couldn't find the odds for this game at this moment. You can't bet on a game that doesn't have any bookmakers.`;
  }
  playerTickets = await NBAPlayerTickets.findOneAndUpdate(
    { userId: userId },
    {
      $push: {
        [`tickets.${playerTickets.selectedTicket}.ticket`]: {
          gameId: thatGame.id,
          whatTeam: whichTeam,
          ticketId:
            playerTickets.tickets[playerTickets.selectedTicket]?.ticket.length +
              1 || 1,
          quotaOnGame:
            thatGame.bookmakers[0].markets[0].outcomes[
              whichTeam === `home` ? indexOfHomeTeam : indexOfAwayTeam
            ].price,
          indexOfHomeTeam,
          indexOfAwayTeam,
        },
      },
    },
    { upsert: true, new: true }
  );
  const thisSpecificTicket =
    playerTickets.tickets[playerTickets.selectedTicket].ticket[
      playerTickets.tickets[playerTickets.selectedTicket].ticket.length - 1
    ];
  let thatTicketsQuotaOnWin =
    playerTickets.tickets[playerTickets.selectedTicket]?.quotaOnWin || 1;

  let quotaOnWin =
    thatTicketsQuotaOnWin *
    thatGame.bookmakers[0].markets[0].outcomes[
      thisSpecificTicket.whatTeam === `home`
        ? thisSpecificTicket.indexOfHomeTeam
        : thisSpecificTicket.indexOfAwayTeam
    ].price;
  quotaOnWin = quotaOnWin.toFixed(2);
  await NBAPlayerTickets.findOneAndUpdate(
    { userId: userId },
    { [`tickets.${playerTickets.selectedTicket}.quotaOnWin`]: quotaOnWin },
    { upsert: true }
  );
  await dailyChallenges.incrementChallenge(userId, `playNBA`);

  return `This game has been put on ticket #${
    playerTickets.selectedTicket + 1
  }.`;
}
function isBetValid(betAmount, theirWallet) {
  if (isNaN(betAmount) || betAmount <= 0) {
    return false;
  }
  if (theirWallet < betAmount) {
    return false;
  }
  return true;
}
// jebiga nema bas smisla
async function checkIfTicketValid(playerTickets, bypassBetAmount = false) {
  if (!playerTickets || playerTickets.tickets.length === 0) {
    return `You don't have any tickets.`;
  }
  const thisTicket =
    playerTickets.tickets[playerTickets.selectedTicket]?.ticket;

  if (!thisTicket || thisTicket.length === 0) {
    return `You don't have any games on this ticket.`;
  }
  if (
    playerTickets.tickets[playerTickets.selectedTicket].betAmount > 0 &&
    bypassBetAmount === false
  ) {
    return `You have already placed a bet on this ticket.`;
  }
  let cantBet = false;
  for (
    let i = 0;
    i < playerTickets.tickets[playerTickets.selectedTicket]?.ticket.length;
    i++
  ) {
    const NBADatabaseGame = await NBAStats.findOne({
      id: playerTickets.tickets[playerTickets.selectedTicket].ticket[i].gameId,
    });
    if (hasThatMomentPassed(NBADatabaseGame.commence_time)) {
      cantBet = true;
    }
  }
  if (cantBet) {
    return `You can't place a bet on this ticket, because one of the games has already started, or is finished. To delete this ticket, use "$ntdel"`;
  }

  return false;
}

async function placeBet(userId, betAmount, doTheyHaveHighRollerPass) {
  const theirWallet = await wallet.getCoins(userId);
  if (!isBetValid(betAmount, theirWallet)) {
    return `This bet amount is not valid.`;
  }
  if (betAmount > 50000 && !doTheyHaveHighRollerPass) {
    return `You've hit the betting limit (50000 coins)! If you want to increase your betting limit, please visit the $shop, and check out the "High Roller Pass"`;
  }
  if (betAmount > 10000000 && doTheyHaveHighRollerPass) {
    return `Even with a High Roller Pass, you can't bet that much.`;
  }
  const playerTickets = await NBAPlayerTickets.findOne({ userId });
  const checkIfValid = await checkIfTicketValid(playerTickets);
  if (checkIfValid) {
    return checkIfValid;
  }
  await NBAPlayerTickets.findOneAndUpdate(
    { userId },
    {
      [`tickets.${playerTickets.selectedTicket}.temporaryBetAmount`]: betAmount,
    },
    { upsert: true }
  );

  return `Are you sure you want to place this bet (${wallet.formatNumber(
    Number(betAmount)
  )} coins) on ticket #${
    playerTickets.selectedTicket + 1
  }? Type "$nyes" to confirm, or "$nno" to decline. **This bet amount cannot be changed later.**`;
}

async function confirmBet(userId) {
  const playerTickets = await NBAPlayerTickets.findOne({ userId });
  const checkIfValid = await checkIfTicketValid(playerTickets);
  if (checkIfValid) {
    return checkIfValid;
  }
  const thisTicket = playerTickets.tickets[playerTickets.selectedTicket];
  const tempBetAmount = thisTicket.temporaryBetAmount;
  if (!tempBetAmount) {
    return `You haven't placed a bet amount yet.`;
  }
  await NBAPlayerTickets.findOneAndUpdate(
    { userId },
    {
      [`tickets.${playerTickets.selectedTicket}.betAmount`]: tempBetAmount,
      [`tickets.${playerTickets.selectedTicket}.temporaryBetAmount`]: 0,
    },
    { upsert: true }
  );
  await wallet.removeCoins(userId, tempBetAmount);
  return `Your bet on ticket #${
    playerTickets.selectedTicket + 1
  } has been placed. Use "$nt ${
    playerTickets.selectedTicket + 1
  }" to see your ticket. Good luck!`;
}
async function declineBet(userId) {
  const playerTickets = await NBAPlayerTickets.findOne({ userId });
  const checkIfValid = await checkIfTicketValid(playerTickets);
  if (checkIfValid) {
    return checkIfValid;
  }
  const thisTicket = playerTickets.tickets[playerTickets.selectedTicket];

  const tempBetAmount = thisTicket.temporaryBetAmount;
  if (!tempBetAmount) {
    return `You haven't placed a bet amount yet.`;
  }
  await NBAPlayerTickets.findOneAndUpdate(
    { userId },
    {
      [`tickets.${playerTickets.selectedTicket}.temporaryBetAmount`]: 0,
    },
    { upsert: true }
  );
  return `Your bet on ticket #${
    playerTickets.selectedTicket + 1
  } has been declined. You can still bet on this ticket with "$nbet [bet amount]".`;
}
async function deleteTicketGame(userId, ticketGameNumber) {
  let playerTickets = await NBAPlayerTickets.findOne({ userId });
  const checkIfValid = await checkIfTicketValid(playerTickets);
  if (checkIfValid) {
    return `You can't delete this game.`;
  }
  if (!playerTickets) {
    return `No tickets found`;
  }
  let thatTicket = playerTickets.tickets[playerTickets.selectedTicket]?.ticket;
  if (!thatTicket) {
    return `Can't find ticket.`;
  }
  if (
    thatTicket[ticketGameNumber - 1]?.length === 0 ||
    thatTicket[ticketGameNumber]?.length === 0
  ) {
    return `Can't delete what is not existant.`;
  }
  const thatQuotaOnWin =
    playerTickets.tickets[playerTickets.selectedTicket].quotaOnWin;
  let newQuotaOnWin =
    thatQuotaOnWin / thatTicket[ticketGameNumber - 1].quotaOnGame;
  newQuotaOnWin = newQuotaOnWin.toFixed(2);
  await NBAPlayerTickets.updateOne(
    { userId },
    { [`tickets.${playerTickets.selectedTicket}.quotaOnWin`]: newQuotaOnWin }
  );
  await NBAPlayerTickets.updateOne(
    { userId },
    {
      $unset: {
        [`tickets.${playerTickets.selectedTicket}.ticket.${
          ticketGameNumber - 1
        }`]: 1,
      },
    }
  );
  await NBAPlayerTickets.updateOne(
    { userId },
    {
      $pull: {
        [`tickets.${playerTickets.selectedTicket}.ticket`]: null,
      }, // Remove all null values left from unset
    }
  );
  playerTickets = await NBAPlayerTickets.findOne({ userId });
  thatTicket = playerTickets.tickets[playerTickets.selectedTicket]?.ticket;
  if (!thatTicket || thatTicket.length === 0) {
    await NBAPlayerTickets.updateOne(
      { userId },
      {
        $unset: {
          [`tickets.${playerTickets.selectedTicket}`]: 1,
        },
      }
    );
    await NBAPlayerTickets.updateOne(
      { userId },
      {
        $pull: {
          tickets: null,
        }, // Remove all null values left from unset
      }
    );
  }
  return `Deleted that game.`;
}

async function startToDeleteTicket(userId) {
  const playerTickets = await NBAPlayerTickets.findOne({ userId });
  if (!playerTickets) {
    return `No tickets found`;
  }
  let additionToMessage = ``;
  const thatTicket =
    playerTickets.tickets[playerTickets.selectedTicket]?.ticket;
  if (!thatTicket) {
    return `Can't find a ticket to delete.`;
  }
  let gamesInProgress = 0;
  for (let i = 0; i < thatTicket.length; i++) {
    const NBADatabase = await NBAStats.findOne({ id: thatTicket[i].gameId });

    if (hasThatMomentPassed(NBADatabase.commence_time)) {
      gamesInProgress++;
    }
  }
  if (gamesInProgress === 0) {
    const theirBetAmount =
      playerTickets.tickets[playerTickets.selectedTicket]?.betAmount;
    if (theirBetAmount > 0) {
      await wallet.addCoins(userId, Number(theirBetAmount));
      additionToMessage += `Your bet amount (${wallet.formatNumber(
        Number(theirBetAmount)
      )} coins) will be returned (if deleted before any games on ticket start).`;
    }
  }
  if (
    gamesInProgress > 0 &&
    playerTickets.tickets[playerTickets.selectedTicket]?.betAmount
  ) {
    additionToMessage += `Your bet amount (${wallet.formatNumber(
      Number(playerTickets.tickets[playerTickets.selectedTicket]?.betAmount)
    )} coins) will NOT be returned because one of the games in your ticket has started, or has finished.`;
  }

  return `Are you sure you want to delete ticket #${
    playerTickets.selectedTicket + 1
  }? Type "$ntdelyes" to confirm, or "$ntdelno" to decline. ${additionToMessage}`;
}

async function deleteTicket(userId) {
  try {
    const playerTickets = await NBAPlayerTickets.findOne({ userId });
    let additionToMessage = ``;
    if (!playerTickets) {
      return `No tickets found`;
    }
    const thatTicket =
      playerTickets.tickets[playerTickets.selectedTicket]?.ticket;
    let gamesInProgress = 0;
    for (let i = 0; i < thatTicket.length; i++) {
      const NBADatabase = await NBAStats.findOne({ id: thatTicket[i].gameId });

      if (hasThatMomentPassed(NBADatabase.commence_time)) {
        gamesInProgress++;
      }
    }
    if (gamesInProgress === 0) {
      const theirBetAmount =
        playerTickets.tickets[playerTickets.selectedTicket]?.betAmount;
      if (theirBetAmount > 0) {
        await wallet.addCoins(userId, Number(theirBetAmount));
        additionToMessage += `,and returned your bet amount (${wallet.formatNumber(
          Number(theirBetAmount)
        )} coins).`;
      }
    }

    await NBAPlayerTickets.updateOne(
      { userId },
      {
        $unset: { [`tickets.${playerTickets.selectedTicket}`]: 1 }, // Remove the element at index
      }
    );

    await NBAPlayerTickets.updateOne(
      { userId },
      {
        $pull: { tickets: null }, // Remove all null values left from unset
      }
    );

    return `Deleted ticket #${
      playerTickets.selectedTicket + 1
    }${additionToMessage}`;
  } catch (error) {
    console.error(`Error deleting ticket for userId: ${userId}`, error);
    return `I couldn't delete your ticket.`;
  }
}

async function returnHomeTeamOutcomeIndex(gameIndex) {
  const databaseNBAGames = await NBAStats.find({});
  const thatGame = databaseNBAGames[gameIndex];
  if (thatGame.bookmakers.length === 0) {
    return 0;
  }
  const gameFirstOutcomeTeamName =
    thatGame.bookmakers[0].markets[0].outcomes[0].name;

  if (thatGame.home_team === gameFirstOutcomeTeamName) {
    return 0;
  } else {
    return 1;
  }
}

function isTicketAdditionValid(gameIndex, whichTeam, gameId) {
  let message = ``;

  if (whichTeam !== `1` && whichTeam !== `2`) {
    message = `You can only add the "home" or "away" team. Make sure you're correctly adding games to your ticket using: "$nadd [game number] **["home(1)" or "away"(2)]**"`;
  }
  return message;
}

async function givePayouts(userId) {
  const playerTicket = await NBAPlayerTickets.findOne({ userId });
  if (!playerTicket) {
    return `We couldn't find any of your tickets.`;
  }
  let selectedTicket = playerTicket.selectedTicket;
  for (let index = 0; index < playerTicket.tickets.length; index++) {
    selectedTicket = index;
    let gamesWon = 0;

    // const NBAStats = await NBAStats.find({});
    // if (playerTicket.tickets[selectedTicket]?.checkedIfWinner) {
    //   console.log(`Already payed out in full`);

    //   return;
    // }

    for (
      let i = 0;
      i < playerTicket.tickets[selectedTicket]?.ticket.length;
      i++
    ) {
      const NBAFilteredStats = await NBAStats.find({
        id: playerTicket.tickets[selectedTicket].ticket[i].gameId,
      });
      if (!NBAFilteredStats[0].completed) {
        continue;
      }
      let whoWon = ``;
      if (
        NBAFilteredStats[0].homeTeamScore > NBAFilteredStats[0].awayTeamScore
      ) {
        whoWon = `home`;
      } else {
        whoWon = `away`;
      }
      if (playerTicket.tickets[selectedTicket].ticket[i].whatTeam === whoWon) {
        gamesWon++;
      }
    }
    let winner = undefined;
    let gamesNotCompleted = 0;
    for (
      let i = 0;
      i < playerTicket.tickets[selectedTicket]?.ticket.length;
      i++
    ) {
      const NBAFilteredStats = await NBAStats.find({
        id: playerTicket.tickets[selectedTicket].ticket[i].gameId,
      });
      if (!NBAFilteredStats[0].completed || gamesNotCompleted > 0) {
        gamesNotCompleted++;
        continue;
      }
      if (
        playerTicket.tickets[selectedTicket]?.ticket.length === gamesWon &&
        gamesWon !== 0
      ) {
        const quotaOnWin = playerTicket.tickets[selectedTicket].quotaOnWin;
        const originalBetAmount =
          playerTicket.tickets[selectedTicket].betAmount;
        if (isNaN(originalBetAmount) || originalBetAmount <= 0) {
          continue;
        }

        winner = true;
      } else {
        winner = false;
      }
    }
    if (winner === undefined) {
      continue;
    }

    if (winner) {
      if (playerTicket.tickets[selectedTicket]?.checkedIfWinner) {
        winner = false;
        continue;
      }
      const quotaOnWin = playerTicket.tickets[selectedTicket].quotaOnWin;
      const originalBetAmount = playerTicket.tickets[selectedTicket].betAmount;
      const checkedForDaily =
        playerTicket.tickets[selectedTicket].checkedForDaily;
      await wallet.addCoins(userId, quotaOnWin * originalBetAmount);
      if (!checkedForDaily) {
        await UserStats.findOneAndUpdate(
          { userId: userId },
          {
            $inc: {
              "games.nba.gamesPlayed": 1,
              "games.nba.gamesWon": 1,
              "games.nba.coinsWon":
                quotaOnWin * originalBetAmount - originalBetAmount,
            },
          }
        );
      }
      await NBAPlayerTickets.findOneAndUpdate(
        { userId },
        { [`tickets.${selectedTicket}.winner`]: true },
        { upsert: true }
      );
      await NBAPlayerTickets.findOneAndUpdate(
        { userId },
        {
          [`tickets.${selectedTicket}.checkedForDaily`]: true,
          [`tickets.${selectedTicket}.checkedIfWinner`]: true,
        },
        { upsert: true }
      );
      winner = false;
    } else {
      await NBAPlayerTickets.findOneAndUpdate(
        { userId },
        { [`tickets.${selectedTicket}.winner`]: false },
        { upsert: true }
      );
      const originalBetAmount = playerTicket.tickets[selectedTicket].betAmount;
      const checkedForDaily =
        playerTicket.tickets[selectedTicket].checkedForDaily;
      if (!checkedForDaily) {
        await UserStats.findOneAndUpdate(
          { userId: userId },
          {
            $inc: {
              "games.nba.gamesPlayed": 1,
              "games.nba.gamesLost": 1,
              "games.nba.coinsLost": originalBetAmount,
            },
          }
        );
      }

      await NBAPlayerTickets.findOneAndUpdate(
        { userId },
        {
          [`tickets.${selectedTicket}.checkedForDaily`]: true,
          [`tickets.${selectedTicket}.checkedIfWinner`]: false,
        },
        { upsert: true }
      );
    }
  }
}
async function changeSelectedTicket(userId, ticketIndex, ticketPage = 1) {
  let playerTicket = await NBAPlayerTickets.findOne({ userId: userId });
  if (isNaN(ticketIndex) || ticketIndex < 1 || ticketIndex > 8) {
    return `Please select a valid ticket number "$nt (1-8)"`;
  }
  if (playerTicket) {
    const previous = playerTicket.tickets[playerTicket.selectedTicket];
    if (playerTicket.selectedTicket !== ticketIndex - 1) {
      if (!previous?.betAmount) {
        if (!playerTicket.tickets[ticketIndex - 1]?.betAmount) {
          return `You can't switch tickets before adding a bet amount to this one!`;
        }
      }
    }
    if (playerTicket.tickets.length < ticketIndex) {
      await NBAPlayerTickets.findOneAndUpdate(
        { userId },
        { selectedTicket: playerTicket.tickets.length },
        { upsert: true }
      );
      return displayTickets(
        userId,
        playerTicket.tickets.length,
        ``,
        ticketPage
      );
    }
  }
  if (!playerTicket) {
    await NBAPlayerTickets.findOneAndUpdate(
      { userId },
      { selectedTicket: 0 },
      { upsert: true }
    );
    return displayTickets(userId, 1, ``, ticketPage);
  }
  await NBAPlayerTickets.findOneAndUpdate(
    { userId },
    { selectedTicket: ticketIndex - 1 },
    { upsert: true }
  );
  return displayTickets(userId, ticketIndex - 1, ``, ticketPage);
}
// ⌜ ⌝
// ⌞ ⌟
//   const topDashes = `⌜-------------- ⋆⋅ ♰ ⋅⋆ --------------⌝`;

async function displayTickets(
  userId,
  ticketIndex,
  specialMessage = ``,
  page = 1
) {
  const playerTickets = await NBAPlayerTickets.findOne({ userId });
  const maxLength = 60;
  page--;
  if (!playerTickets.tickets || !playerTickets) {
    return `Couldn't find any of your tickets.`;
  }
  let returnMessage = `Switched to ticket #${ticketIndex + 1}\n\n`;
  const topDashes = `⌜------------------------------------------⌝`;
  const topDashesPadding = " ".repeat(maxLength - topDashes.length) + topDashes;
  returnMessage += `${topDashesPadding}\n`;
  let noMore = false;
  const thatTicket = playerTickets.tickets[ticketIndex]?.ticket;
  if (!thatTicket) {
    return `Switched to ticket #${
      playerTickets.tickets.length + 1
    }\n\nThere are currently no games on this ticket.To add a game, check "$nba"`;
  }
  let howManyToDisplay = thatTicket.length;
  if (thatTicket.length > 3) {
    howManyToDisplay = 3;
  }
  for (let i = 0; i < howManyToDisplay; i++) {
    const indexToUse = i + page * 3;
    if (!thatTicket[indexToUse]?.gameId) {
      break;
    }
    const NBADatabase = await NBAStats.findOne({
      id: thatTicket[indexToUse].gameId,
    });
    const gameIndex = `#${NBADatabase.gameIndex}`;
    const teams = `${NBADatabase.home_team} - ${NBADatabase.away_team}`;
    const youBetOn = `You bet on The ${
      NBADatabase[`${thatTicket[indexToUse].whatTeam}_team`]
    }`;
    const teamOdds = `Odds:  ${thatTicket[indexToUse].quotaOnGame}`;

    let whoWon = ``;
    if (NBADatabase.homeTeamScore > NBADatabase.awayTeamScore) {
      whoWon = `home`;
    } else {
      whoWon = `away`;
    }

    const statusOfGame = `Status: ${
      thatTicket[indexToUse].completed
        ? whoWon === thatTicket[indexToUse].whatTeam
          ? `WON`
          : `LOST`
        : `PENDING`
    }`;

    const betweenTicketsDashes = `--------------`;

    const gameIndexPadding =
      " ".repeat(maxLength - gameIndex.length) + gameIndex;
    const teamsPadding = " ".repeat(maxLength - teams.length) + teams;
    const youBetOnPadding = " ".repeat(maxLength - youBetOn.length) + youBetOn;
    const teamOddsPadding = " ".repeat(maxLength - teamOdds.length) + teamOdds;
    const betweenTicketsDashesPadding =
      " ".repeat(maxLength - betweenTicketsDashes.length) +
      betweenTicketsDashes;
    const statusOfGamePadding =
      " ".repeat(maxLength - statusOfGame.length) + statusOfGame;
    const deleteGame = `You can delete this game with "$ntdel ${
      indexToUse + 1
    }"`;
    const deleteGamePadding =
      " ".repeat(maxLength - deleteGame.length) + deleteGame;
    returnMessage += `${gameIndexPadding}\n${teamsPadding}\n${youBetOnPadding}\n${teamOddsPadding}\n${statusOfGamePadding}\n${deleteGamePadding}\n${betweenTicketsDashesPadding}\n`;
    if (!thatTicket[indexToUse + 1]?.gameId) {
      noMore = true;
    }
  }
  const returnQuota = `Return quota: ${playerTickets.tickets[ticketIndex].quotaOnWin}`;

  const betAmountDisplay = `${
    playerTickets.tickets[ticketIndex].betAmount
      ? `Bet: ${wallet.formatNumber(
          playerTickets.tickets[ticketIndex].betAmount
        )} coins`
      : ``
  }`;
  let toWin = undefined;
  let winner = undefined;
  if (playerTickets.tickets[ticketIndex].betAmount) {
    toWin =
      playerTickets.tickets[ticketIndex].quotaOnWin *
      playerTickets.tickets[ticketIndex].betAmount;
  }
  if (
    playerTickets.tickets[ticketIndex].winner === false ||
    playerTickets.tickets[ticketIndex].winner === true
  ) {
    winner = playerTickets.tickets[ticketIndex].winner;
  }
  const toWinDisplay = `${
    toWin ? `To win: ${wallet.formatNumber(Number(toWin))} coins` : ``
  }`;
  let winnerStatusPt1 = ``;
  let winnerStatusPt2 = `DELETE TICKET: "$ntdel"`;

  if (winner) {
    winnerStatusPt1 = `You won this ticket!`;
  } else {
    if (playerTickets.tickets[ticketIndex].winner === false) {
      winnerStatusPt1 = `You lost this ticket.`;
    }
  }
  let cantBet = false;
  for (
    let i = 0;
    i < playerTickets.tickets[playerTickets.selectedTicket]?.ticket.length;
    i++
  ) {
    const NBADatabaseGame = await NBAStats.findOne({
      id: playerTickets.tickets[playerTickets.selectedTicket].ticket[i].gameId,
    });
    if (hasThatMomentPassed(NBADatabaseGame.commence_time)) {
      cantBet = true;
    }
  }

  const betAmountDisplayPadding =
    " ".repeat(maxLength - betAmountDisplay.length) + betAmountDisplay;
  const toWinDisplayPadding =
    " ".repeat(maxLength - toWinDisplay.length) + toWinDisplay;
  const returnQuotaPadding =
    " ".repeat(maxLength + 3 - returnQuota.length) + returnQuota;
  const winnerStatusPt1Padding =
    " ".repeat(maxLength - winnerStatusPt1.length) + winnerStatusPt1;
  const winnerStatusPt2Padding =
    " ".repeat(maxLength - winnerStatusPt2.length) + winnerStatusPt2;
  const endOfTicketDashes = `⌞------------------------------------------⌟`;
  const endOfTicketDashesPadding =
    " ".repeat(maxLength - endOfTicketDashes.length) + endOfTicketDashes;
  const betHelp = `${
    cantBet ? `Bet: NONE, can't bet` : `Bet: "$nbet [bet amount]"`
  }`;
  const betHelpPadding = " ".repeat(maxLength - betHelp.length) + betHelp;
  const paginationHelp = `Next Page: "$nt ${ticketIndex + 1} ${page + 2}"`;
  const paginationHelpPadding =
    " ".repeat(maxLength - paginationHelp.length) + paginationHelp;
  returnMessage += `\n${returnQuotaPadding}\n${
    betAmountDisplay === ``
      ? `\n**${betHelpPadding}**`
      : `\n**${betAmountDisplayPadding}**\n`
  }${
    toWin === `` ? `` : `${toWinDisplayPadding}\n`
  }\n**${winnerStatusPt1Padding}**\n${winnerStatusPt2Padding}\n${endOfTicketDashesPadding}\n${
    noMore ? `` : `${paginationHelpPadding}\n`
  }`;

  return `${returnMessage} ${specialMessage}`;
}

module.exports = {
  getNBAUpcoming,
  addToTicket,
  givePayouts,
  changeSelectedTicket,
  displayTickets,
  placeBet,
  confirmBet,
  declineBet,
  startToDeleteTicket,
  deleteTicket,
  deleteTicketGame,
  addToDatabase,
};

// buttons?
// u buducnosti
