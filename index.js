require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  channelLink,
  GuildForumThreadManager,
} = require("discord.js");
const wallet = require("./wallet");
const roll = require("./roll");
const blackjackRooms = require("./blackjack/rooms");
const blackjackBets = require(`./blackjack/bettingBJ`);
const blackjackGame = require("./blackjack/game");
const EventEmitter = require("events");
const daily = require("./daily/daily");
const voiceReward = require("./voiceReward");
const coinflip = require("./coinflip");
const grid = require("./grid");
const { info } = require("console");
const { makeDeck, randomNumber } = require("./blackjack/makeDeck");
const xpSystem = require("./xp/xp");
const { totalmem, userInfo } = require("os");;
const path = require("path");
const eventEmitter = new EventEmitter();
const express = require("express");
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');
const app = express();
let toggleAnimState = false;
let gridXpGainHuge = 20;
let gridXpGainSmall = 7;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const ownerId = "237903516234940416";
const ownerId2 = "294522326182002710";
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Simple web server for UptimeRobot to ping
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Set the server to listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Define connectToDatabase
async function connectToDatabase() {
  try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connected to MongoDB');
  } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      process.exit(1);
  }
}

// Modified migrateData with connection check
async function migrateData() {
  // Wait until mongoose is fully connected
  if (mongoose.connection.readyState !== 1) {
      console.log("Waiting for MongoDB connection...");
      await new Promise(resolve => mongoose.connection.once('connected', resolve));
  }

  console.log("Running migration...");
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

  for (const userId in data) {
      if (userId === 'undefined') continue;

      const { coins = 0, debt = 0, freeSpins = 0, freeSpinsBetAmount = 0 } = data[userId];

      try {
          // Check if the user already exists
          let user = await User.findOne({ userId });
          
          if (!user) {
              // Create a new User document if they don't exist
              user = new User({
                  userId,
                  coins,
                  debt,
                  freeSpins,
                  freeSpinsBetAmount,
              });
              await user.save();
              console.log(`Saved user ${userId} to MongoDB.`);
          } else {
              // Update existing user's data if they already exist
              user.coins = coins;
              user.debt = debt;
              user.freeSpins = freeSpins;
              user.freeSpinsBetAmount = freeSpinsBetAmount;
              await user.save();
              console.log(`Updated user ${userId} in MongoDB.`);
          }
      } catch (error) {
          console.error(`Error saving user ${userId}:`, error);
      }
  }
  console.log("Migration completed.");
}

let gridOwners = {}; // Object to store the grid owner by message ID

function startBot() {
  client.once('ready', () => {
    console.log('Bot is ready!');
  });

  client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  const userId = message.author.id;
  const channelId = message.channel.id;

  // Initialize the user's wallet if it doesn't exist
  wallet.initializeWallet(userId);

  //
  if (message.content.toLowerCase() === "$help") {
    const theHelpMessage = `Hello! I'm a gambling bot. To start using my services, use one of my commands:\n\n**"$wallet", or "$w"**- Check your wallet.\n\n**"$daily"**- Get assigned a daily challenge for some quick coins.\n\nYou can gain coins by being in a voice chat, each minute is equal to 10 coins.\n\n**"$roll [amount of coins]"** to use a slot machine.\n**"$toggleanim"**- Toggle rolling animation.\n\n**"$bj"**- Play Blackjack.\n **You can do everything with buttons, but if they don't work, you can use these commands instead.**\n**"$joinbj"**- Join a Blackjack room. You can also join a room if the room is in the betting phase.\n**"$startbj"**- Used to start a game of Blackjack.\n**"$betbj [amount of coins]"**- Place a bet in a Blackjack game.\n\n**"flip [amount of coins] [@PersonYouWantToChallenge]"**- Challenge a player to a coinflip. Heads or tails?\n\n**"$grid [amount of coins]"**- Start a game of grid slots!\n\n**"$leaderboard", or "$lb"**- To show the top 5 most wealthy people in the server.\n\n**"$give [amount of coins] [@PersonYouWantToGiveTo]"**- Give your hard earned coins to someone else.\n\n**"$level"**- Shows your level, how much xp you have,and need for the next level.\nWhen you level up, you gain an increased amount of coins when doing challenges or by being in a voice chat.\nYou can gain xp by playing our various games!\n\n**"$loan"**- Go to the bank and ask for a loan! Your limit depends on your level, and you can start requesting loans at level 3.Every 2 levels after level 3, your limit grows.\n**"$loan [amount of coins]"**- If your discord buttons don't work, try this command.\nThe max limit is at level 21, where your limit is 100000 coins.\n**"$paydebt"**- Pay off all of your debt, if you have the coins for it.`;
    message.author.send(theHelpMessage);
  }

  if (
    message.content.toLowerCase() === "$leaderboard" ||
    message.content.toLowerCase() === "$lb"
) {
    const topUsers = await wallet.getTopUsers(message); // Get top 5 users with display names
    console.log(topUsers);

    // Build the leaderboard message
    let leaderboardMessage = "🏆 **Leaderboard - Top 5** 🏆\n";
    
    // Iterate over each top user and build the message
    for (const [index, user] of topUsers.entries()) {
        const theirDebt = await wallet.getDebt(user.userId); // Await debt retrieval
        const theirLevel = await xpSystem.xpOverview(user.userId, true); // Ensure this is async if needed
        
        leaderboardMessage += `${index + 1}. ${user.displayName} (${theirLevel.level}) - **${user.coins}** coins. ${
            theirDebt ? `${theirDebt} coins in debt.` : ``
        }\n`;
    }

    // Send the leaderboard message
    await message.reply(leaderboardMessage);
}

  // $GRID
  // Command to generate the grid with an amount of coins
  if (message.content.toLowerCase().startsWith("$grid")) {
    const args = message.content.split(" ");

    // Ensure both bet amount and mines amount are provided
    if (args.length < 3) {
      return message.reply(
        "Please provide both the bet amount and the number of mines. Usage: $grid [bet amount] [mines amount]"
      );
    }

    const amount = parseInt(args[1]); // Get the coin amount
    const mineCount = parseInt(args[2]); // Get the mine count

    // Validate the bet amount and mine count
    if (
      isNaN(amount) ||
      amount <= 0 ||
      isNaN(mineCount) ||
      mineCount < 4 ||
      mineCount > 15
    ) {
      return message.reply(
        "Please provide a valid amount of coins and a number of mines between 4 and 15."
      );
    }

    const userId = message.author.id;
    const userCoins = wallet.getCoins(userId);
    const bettingLimit = 100000;
    // Check if the user has enough coins
    if (userCoins < amount) {
      return message.reply("You don't have enough coins to start the grid.");
    }
    if (amount > 100000) {
      return message.reply(
        `You've hit the betting limit! The limit is ${bettingLimit}.`
      );
    }
    // Deduct the coins from the user's wallet
    wallet.removeCoins(userId, Number(amount));

    const buttonGrid = grid.createButtonGrid(mineCount); // Pass the mine count to createButtonGrid

    const sentMessage = await message.reply({
      content: `You have started a grid game with **${amount}** coins and **${mineCount}** mines! Click a button to unlock!`,
      components: buttonGrid,
    });

    gridOwners[sentMessage.id] = {
      userId: message.author.id,
      isComplete: false,
      betAmount: amount,
      mineCount: mineCount, // Store the mine count
      revealedMultipliers: [],
      fromButton: false,
    };
  }

  // Command to start a coinflip challenge
  if (message.content.toLowerCase().startsWith("$flip")) {
    const args = message.content.split(" ");
    const amount = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      return message.reply("Please provide a valid bet amount.");
    }

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      return message.reply("Please mention a user to challenge.");
    }

    if (mentionedUser.id === userId) {
      return message.reply("You can't challenge yourself!");
    }

    const challengeMessage = coinflip.startFlipChallenge(
      userId,
      mentionedUser.id,
      amount,
      message
    ); // Pass the message object
    return message.reply(challengeMessage);
  }

  // Command to confirm the challenge
  if (message.content.toLowerCase() === "$confirm") {
    const confirmationMessage = coinflip.confirmChallenge(userId);
    return message.reply(confirmationMessage);
  }

  // Command to deny the challenge
  if (message.content.toLowerCase() === "$deny") {
    const denyMessage = coinflip.denyChallenge(userId);
    return message.reply(denyMessage);
  }

  // Command to pick heads or tails
  if (
    message.content.toLowerCase() === "$heads" ||
    message.content.toLowerCase() === "$tails"
  ) {
    const choice = message.content.toLowerCase().substring(1); // Get 'heads' or 'tails'
    const choiceMessage = await coinflip.pickChoice(userId, choice, `flip`);
    message.reply(choiceMessage);
    const resultMessage = await coinflip.pickChoice(userId, choice);
    return message.reply(resultMessage);
  }

  // Track messages for the daily message challenge
  daily.incrementChallenge(userId, false);

  // Track image posts for the daily image challenge
  if (message.attachments.size > 0) {
    message.attachments.forEach((attachment) => {
      if (
        attachment.contentType &&
        attachment.contentType.startsWith("image/")
      ) {
        daily.incrementChallenge(userId, true);
        // message.reply("Your image counts towards today's challenge!");
      }
    });
  }

  // Command to check daily challenge progress
  if (message.content.toLowerCase() === "$daily") {
    const status = daily.getDailyStatus(userId);
    await message.reply(status);
  }

  // Command to check wallet balance
  if (message.content === '$w') {
    const userId = message.author.id;
    
    try {
        // Make sure to await the database query
        const user = await User.findOne({ userId });
        
        if (user) {
            // Send the user's coins and free spins as a response
            message.channel.send(`You have **${user.coins}** coins in your wallet 💰.`);
        } else {
            message.channel.send("You don't have a wallet yet.");
        }
    } catch (error) {
        console.error('Error fetching wallet:', error);
        message.channel.send('There was an error retrieving your wallet.');
    }
}

  // Command to check free spins balance
  if (
    message.content.toLowerCase() === "$freespins" ||
    message.content.toLowerCase() === "$fs"
  ) {
    const coins = wallet.getFreeSpins(userId); // Get the user's balance
    const debt = wallet.getFreeSpins(userId);
    await message.reply(`You have **${coins}** free spins remaining.`);
  }

  if (message.content.toLowerCase().startsWith("$cleardebt")) {
    if (message.author.id !== ownerId && message.author.id !== ownerId2) {
      return message.reply("You don't have permission to use this command.");
    }

    // const args = message.content.split(" ");

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) {
      return message.reply(
        "Please mention a valid user to clear their debt."
      );
    }
    const targetUserId = mentionedUser.id;

    // Add coins to the mentioned user's wallet
    wallet.clearDebt(targetUserId);
    await message.reply(
      `You have cleared **${mentionedUser.username}'s** debt.`
    );
  }

  // ADD COINS
  if (message.content.toLowerCase().startsWith("$add")) {
    if (message.author.id !== ownerId && message.author.id !== ownerId2) {
        return message.reply("You don't have permission to use this command.");
    }

    const args = message.content.split(" ");
    const amount = parseInt(args[1]);

    // Check if the amount is valid
    if (isNaN(amount) || amount <= 0) {
        return message.reply("Please provide a valid amount of coins to add.");
    }

    // Get the tagged user from the message (the second argument)
    const mentionedUser = message.mentions.users.first();

    // Check if a user is tagged
    if (!mentionedUser) {
        return message.reply(
            "Please mention a valid user to add coins to their wallet."
        );
    }

    // Extract the user ID of the mentioned user
    const targetUserId = mentionedUser.id;
    const debtFreeAdd = args[3];

    // Add coins to the mentioned user's wallet
    await wallet.addCoins(targetUserId, amount, true); // Ensure addCoins is awaited if async
    if (debtFreeAdd !== "debtFree") {
        await wallet.addDebt(targetUserId, amount); // Ensure addDebt is awaited if async
    }
    
    // Fetch and await the debt amount for the mentioned user
    const userDebt = await wallet.getDebt(targetUserId); // Await getDebt to get actual value

    // Send a confirmation message
    await message.reply(
        `You have added **${amount}** coins to **${mentionedUser.username}**'s wallet. Their debt: ${userDebt}`
    );
}

  // LOAN
  if (message.content.toLowerCase().startsWith("$loan")) {
    const args = message.content.split(" ");
    const amount = parseInt(args[1]);
    if (message.content.toLowerCase() === `$loan`) {
      generateLoanButtons(message.channel, userId);
      return;
    }
    // Check if the amount is valid
    if (isNaN(amount) || amount <= 0) {
      return message.reply("Please provide a valid amount of coins to add.");
    }

    // Extract the user ID of the mentioned user
    const targetUserId = userId;
    let limit = 0;
    const xpDataForUser = xpSystem.xpOverview(userId, true);
    if (xpDataForUser.level < 3) {
      return message.reply(
        `You can't get loans until you are level 3 or above!`
      );
    }
    if (wallet.getDebt(targetUserId) > 0) {
      return message.reply(
        `You haven't paid off your debt! You can't get a loan if you have a debt!`
      );
    }
    limit = findLoanLimit(userId);

    if (amount > limit) {
      return message.reply(
        `You can't get that much coins. Your limit is ${limit} coins.`
      );
    }
    wallet.addCoins(targetUserId, amount, true);
    wallet.addDebt(targetUserId, amount);
    await message.reply(
      `You have added **${amount}** coins to your wallet. Your debt: ${wallet.getDebt(
        targetUserId
      )}.You can pay off your debt fully with "$paydebt".`
    );
  }
  if (message.content.toLowerCase().startsWith("$paydebt")) {
    const playerCoins = wallet.getCoins(userId);
    const playerDebt = wallet.getDebt(userId);
    if (playerDebt <= 0) {
      await message.reply(`You don't have any debt!`);
      return;
    }
    if (playerDebt > playerCoins) {
      await message.reply(
        `You don't have enough coins to pay off your debt!`
      );
      return;
    }
    if (playerCoins >= playerDebt) {
      wallet.removeCoins(userId, playerDebt);
      wallet.payDebt(userId, playerDebt);
      await message.reply(`You have paid off your debt!`);
      return;
    }
  }

  if (message.content.toLowerCase().startsWith("$give")) {
    // if (message.author.id !== ownerId && message.author.id !== ownerId2) {
    //   return message.reply("You don't have permission to use this command.");
    // }

    const args = message.content.split(" ");
    const amount = parseInt(args[1]);

    // Check if the amount is valid
    if (isNaN(amount) || amount <= 0) {
      return message.reply("Please provide a valid amount of coins to add.");
    }

    // Get the tagged user from the message (the second argument)
    const mentionedUser = message.mentions.users.first();

    // Check if a user is tagged
    if (!mentionedUser) {
      return message.reply(
        "Please mention a valid user to add coins to their wallet."
      );
    }

    // Extract the user ID of the mentioned user
    const targetUserId = mentionedUser.id;
    if (userId === mentionedUser.id) {
      return message.reply("You can't give yourself coins.");
    }
    // Add coins to the mentioned user's wallet
    wallet.addCoins(targetUserId, amount);
    wallet.removeCoins(userId, amount);
    await message.reply(
      `<@${userId}> has added ${amount} coins to ${mentionedUser.username}'s wallet.`
    );
  }

  if (message.content.toLowerCase().startsWith("$toggleanim")) {
    if (!toggleAnimState) {
      roll.skipAnimChange(true);
      toggleAnimState = true;
      message.reply(`Animation for rolling will be skipped!`);
      return;
    }
    if (toggleAnimState) {
      roll.skipAnimChange(false);
      toggleAnimState = false;
      message.reply(`Animation for rolling will not be skipped!`);
      return;
    }
  }

  // $ROLL
  if (message.content.toLowerCase().startsWith("$roll")) {
    const args = message.content.split(" ");
    let betAmount = parseInt(args[1]);

    console.log(`Received $roll command with bet amount: ${betAmount}`);

    if (!isNaN(betAmount) && betAmount > 0) {
      const coins = wallet.getCoins(userId);
      const freeSpinBetAmount =
        wallet.getFreeSpins(userId) > 0
          ? wallet.getFreeSpinBetAmount(userId)
          : null;

      console.log(`User's balance before betting: ${coins}`);
      console.log(
        `Free spins available with bet amount: ${freeSpinBetAmount}`
      );

      // Restrict roll if user has free spins and the bet amount doesn’t match the free spin's bet amount
      if (freeSpinBetAmount !== null && betAmount !== freeSpinBetAmount) {
        await message.reply(
          `You have free spins available with a bet amount of ${freeSpinBetAmount}. Use this amount to roll with your free spins.`
        );
        return;
      }

      if (coins >= betAmount || freeSpinBetAmount !== null) {
        if (freeSpinBetAmount !== null) {
          betAmount = freeSpinBetAmount;
          await message.reply(
            `Using a free spin with a bet of ${betAmount}! 🎁`
          );
          wallet.useFreeSpin(userId); // Only consume one free spin here
        } else {
          console.log(
            `User has enough coins. Attempting to remove ${betAmount} coins...`
          );
          wallet.removeCoins(userId, betAmount);
        }

        const result = await roll.roll(userId, betAmount, message);
        generateRollPreviousButton(message.channel, result.betAmount);
        generateWalletButton();
      } else {
        await message.reply("You don't have enough coins to place this bet.");
      }
    } else {
      await message.reply("Please provide a valid bet amount.");
    }
  }

  // $LEVEL
  if (message.content.toLowerCase().startsWith("$level")) {
    return message.reply(xpSystem.xpOverview(userId));
  }

  if (message.content.toLowerCase().startsWith("$joinbj")) {
    if (
      blackjackRooms.areWePlaying(channelId) ||
      blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
    ) {
      message.reply(`A game is currently in session.`);
      return;
    }
    const coins = wallet.getCoins(userId);
    if (coins <= 0) {
      message.channel.send(`Guys! <@${userId}> is BROKE!`);
      return;
    }
    const whatDoItSay = await blackjackRooms.makeRoom(userId, channelId);
    generateStartBjButton(message.channel);
    // message.reply(whatDoItSay);
  }
  if (message.content.toLowerCase().startsWith("$deleteroombj")) {
    if (userId !== ownerId2) {
      message.reply(`You can't do that!`);
      return;
    }
    const whatDoItSay = await blackjackRooms.deleteRoom(channelId);
    message.channel.send(whatDoItSay);
  }
  if (message.content.toLowerCase().startsWith("$betbj")) {
    if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
      message.reply(`You aren't in a room!`);
      return;
    }
    if (
      blackjackRooms.areWePlaying(channelId) ||
      blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
    ) {
      message.reply(`You can't bet now!`);
      return;
    }
    if (!blackjackRooms.areWeBetting(channelId)) {
      message.reply(`The game must be started to bet.`);
      return;
    }

    const args = message.content.split(" ");
    const betAmount = parseInt(args[1]);

    if (betAmount > 100000001) {
      message.reply(`You've hit the betting limit!`);
      return;
    }
    // Ne mozes da betujes ako nisi u room

    // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
    if (isNaN(betAmount) || betAmount <= 0 || betAmount > 10000001) {
      message.reply(`Bet amount invalid!`);
      return;
    }
    if (wallet.getCoins(userId) <= 0) {
      message.reply(
        `You don't have any more money to play with... Removing you from the room...`
      );
      blackjackRooms.removePersonFromRoom(userId, channelId);
      return;
    }
    if (wallet.getCoins(userId) < betAmount) {
      message.reply(`You don't have enough money to make this bet!`);
      return;
    }
    wallet.removeCoins(userId, betAmount);
    const whatDoItSay = await blackjackBets.addBet(
      userId,
      channelId,
      betAmount
    );
    // stard da gamez
    if (whatDoItSay === "true") {
      setTimeout(() => {
        blackjackGame.startDealing(eventEmitter, channelId, message.channel);
      }, 2000);
      blackjackRooms.changeGameState(channelId, "betting", false);
      blackjackRooms.changeGameState(channelId, "dealing", true);
      message.channel.send(
        `All bets are placed, **the game is starting...**`
      );
      return;
    }
    message.channel.send(whatDoItSay);
  }
  if (message.content.toLowerCase().startsWith("$leavebj")) {
    if (
      blackjackRooms.areWePlaying(channelId) ||
      blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
    ) {
      message.reply(`Can't leave the room mid game.`);
      return;
    }
    if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
      message.reply(`You are not in a room.`);
      return;
    }
    message.reply(`Removing you from the room...`);
    const thatRoom = blackjackRooms.findRoom(channelId);
    blackjackRooms.removePersonFromRoom(userId, channelId);
    if (thatRoom.players.length === 0) {
      blackjackRooms.deleteRoom(channelId);
      return;
    }
    if (thatRoom.players.every((player) => player.betAmount > 0)) {
      setTimeout(() => {
        blackjackGame.startDealing(eventEmitter, channelId, message.channel);
      }, 2000);
      blackjackRooms.changeGameState(channelId, "betting", false);
      blackjackRooms.changeGameState(channelId, "dealing", true);
      message.channel.send(
        `All bets are placed, **the game is starting...**`
      );
      return;
    }
  }
  if (message.content.toLowerCase().startsWith("$startbj")) {
    if (blackjackRooms.areWePlaying(channelId)) {
      message.reply(`The game has already started.`);
      return;
    }
    if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
      message.reply(`You aren't in a room!`);
      return;
    }

    blackjackGame.startBettingPhase(channelId, eventEmitter, message.channel);
    generateBetButtons(message.channel, true);
    // message.channel.send(
    //   `Starting the game. Please place your bets using **"$betbj (amount)"**`
    // );
  }
  if (message.content.toLowerCase().startsWith("$hit")) {
    if (
      !blackjackRooms.areWePlaying(channelId) ||
      !blackjackRooms.checkIfAlreadyInRoom(userId)
    ) {
      message.channel.send(`pa gde si krenuo buraz`);
      return;
    }
    if (!blackjackRooms.isItYoTurn(userId, channelId)) {
      message.reply(`pa gde si krenuo buraz`);
      return;
    }
    const infoAboutPlayer = blackjackGame.hit(
      userId,
      channelId,
      eventEmitter,
      message.channel
    );
    if (infoAboutPlayer.theirSum === 21) {
      const messagezz = blackjackGame.stand(
        userId,
        channelId,
        eventEmitter,
        message.channel
      );
      message.channel.send(
        `:fireworks: <@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is.... no... it can't be..... **${infoAboutPlayer.theirSum}**!!!! :fireworks:`
      );
      return;
    }
    if (infoAboutPlayer.bust) {
      message.channel.send(
        `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**, and so they have **BUST**!`
      );
      blackjackRooms.playerLose(userId, channelId);
      blackjackGame.stand(userId, channelId, eventEmitter, message.channel);
    } else {
      message.channel.send(
        `<@${userId}> got a **${
          infoAboutPlayer.cardTheyGot
        }**, their sum is **${infoAboutPlayer.theirSum}**.${
          infoAboutPlayer.aceSave
            ? `They've got an **ACE**, so their 11 is now counted as a 1.`
            : ``
        } **$hit** , or **$stand** ?`
      );
    }
  }
  if (message.content.toLowerCase().startsWith("$dd")) {
    if (
      !blackjackRooms.areWePlaying(channelId) ||
      !blackjackRooms.checkIfAlreadyInRoom(userId)
    ) {
      message.channel.send(`pa gde si krenuo buraz`);
      return;
    }
    if (!blackjackRooms.isItYoTurn(userId, channelId)) {
      message.reply(`pa gde si krenuo buraz`);
      return;
    }
    const infoAboutPlayer = blackjackGame.doubleDown(
      userId,
      channelId,
      eventEmitter,
      message.channel
    );
    if (infoAboutPlayer.theirSum === 21) {
      const messagezz = blackjackGame.stand(
        userId,
        channelId,
        eventEmitter,
        message.channel
      );
      message.channel.send(
        `:fireworks: <@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is.... no... it can't be..... **${infoAboutPlayer.theirSum}**!!!! :fireworks:`
      );
      return;
    }
    if (infoAboutPlayer.bust) {
      message.channel.send(
        `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**, and so they have **BUST**!`
      );
      blackjackRooms.playerLose(userId, channelId);
      blackjackGame.stand(userId, channelId, eventEmitter, message.channel);
    } else {
      message.channel.send(
        `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**.`
      );
      blackjackGame.stand(userId, channelId, eventEmitter, message.channel);
    }
  }
  if (message.content.toLowerCase().startsWith("$stand")) {
    if (
      !blackjackRooms.areWePlaying(channelId) ||
      !blackjackRooms.checkIfAlreadyInRoom(userId)
    ) {
      message.channel.send(`:question: pa gde si krenuo buraz :question:`);
      return;
    }
    if (!blackjackRooms.isItYoTurn(userId, channelId)) {
      message.reply(`:question: pa gde si krenuo buraz :question:`);
      return;
    }
    const messageszzz = blackjackGame.stand(
      userId,
      channelId,
      eventEmitter,
      message.channel
    );
    // message.channel.send(messageszzz);
  }
  if (message.content.toLowerCase().startsWith("pusi ga")) {
    message.reply(`That's not very nice!`);
  }
  if (message.content.toLowerCase().startsWith("fuckyou")) {
    if (wallet.getCoins(userId) > 10) {
      message.reply(
        `The DEALER has taken 10 coins from <@${userId}>'s wallet`
      );
      wallet.removeCoins(userId, 10);
      return;
    } else {
      message.reply(
        `The DEALER tried to take 10 coins from <@${userId}>'s wallet, but realized that <@${userId}> didn't have 10 coins to take.`
      );
      return;
    }
  }
  if (message.content.toLowerCase().startsWith("$bj")) {
    generateBlackjackButtons(message.channel);
  }
});

eventEmitter.on("beginningBJ", (messageThatWasSent, channelToSendTo) => {
  channelToSendTo.send(messageThatWasSent);
});

eventEmitter.on("upNext", (messageThatWasSent, channelToSendTo, occasion) => {
  if (occasion === "dealer") {
    setTimeout(() => {
      channelToSendTo.send(
        `:bust_in_silhouette: Its now the dealers turn. :bust_in_silhouette:`
      );
      blackjackGame.dealerTurn(
        channelToSendTo.id,
        eventEmitter,
        channelToSendTo
      );
      return;
    }, 300);
  }
  if (!messageThatWasSent) {
    return;
  }
  const thatRoom = blackjackRooms.findRoom(channelToSendTo.id);
  let theirSum;
  thatRoom.players.forEach((e) => {
    if (e.userId === messageThatWasSent) {
      theirSum = e.sum;
    }
  });
  // channelToSendTo.send(
  //   `:stopwatch: <@${messageThatWasSent}>, your turn. Your sum is **${theirSum}** :stopwatch:`
  // );
  sendPlayerTurnButtons(messageThatWasSent, channelToSendTo, theirSum);
});

eventEmitter.on("dealerTurn", (messageThatWasSent, channelToSendTo) => {
  const dealer = blackjackRooms.findRoom(channelToSendTo.id).dealer;
  if (messageThatWasSent === "stand") {
    channelToSendTo.send(
      `:bust_in_silhouette: The DEALER **stands**, with a sum of **${dealer.sum}** :bust_in_silhouette:`
    );
    blackjackGame.endGame(channelToSendTo.id, channelToSendTo, eventEmitter);
  }
  if (messageThatWasSent === "hit") {
    channelToSendTo.send(
      `:bust_in_silhouette: The DEALER **hits**, and gets a **${dealer.cards.at(
        -1
      )}**, and has a sum of **${dealer.sum}** :bust_in_silhouette:`
    );
  }
  if (messageThatWasSent === "bust") {
    channelToSendTo.send(
      `:bust_in_silhouette: :boom: The DEALER **BUSTS** **all ova** the place :bust_in_silhouette: :boom:`
    );
    blackjackGame.endGame(channelToSendTo.id, channelToSendTo, eventEmitter);
  }
  if (messageThatWasSent === `aceSave`) {
    channelToSendTo.send(
      `:bust_in_silhouette: The DEALER was about to bust, but got saved by their **ACE**. Their sum is **${dealer.sum}** :bust_in_silhouette:`
    );
  }
});
eventEmitter.on(`endGame`, (messageThatWasSent, channelToSendTo) => {
  channelToSendTo.send(messageThatWasSent);
});
eventEmitter.on("restartGame", (channelToSendTo) => {
  generateBetButtons(channelToSendTo);
  blackjackRooms.restartRoom(
    channelToSendTo.id,
    eventEmitter,
    channelToSendTo
  );

  // channelToSendTo.send(
  //   `**Restarting game...** Use **$betbj (amount)** to place a new bet...`
  // );
});
eventEmitter.on(`startBettingPhase`, (channelToSendTo) => {
  blackjackGame.startBettingPhase(
    channelToSendTo.id,
    eventEmitter,
    channelToSendTo
  );
});
eventEmitter.on(`afkRoom`, (channelId) => {
  const channelToSendTo = client.channels.fetch(channelId);
  channelToSendTo.send(`Deleting blackjack room due to inactivity....`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.id;

  // Check if the user joined a voice channel
  if (!oldState.channel && newState.channel) {
    // User joined a voice channel
    console.log(`${userId} has joined the voice chat`);
    voiceReward.userJoinedVoice(userId);
  }

  // Check if the user left a voice channel
  if (oldState.channel && !newState.channel) {
    // User left a voice channel
    console.log(`${userId} has left the voice chat`);

    voiceReward.userLeftVoice(userId);
  }
});

function sendPlayerTurnButtons(userId, channel, theirSum) {
  const thatRoom = blackjackRooms.findRoom(channel.id);
  let buttonCounter;
  let turn;
  let canDD = false;
  thatRoom.players.forEach((e) => {
    if (e.userId === userId) {
      buttonCounter = e.buttonCounter;
      turn = e.turn;
      if (wallet.getCoins(userId) >= e.betAmount * 2) {
        canDD = true;
      }
    }
  });
  const hitButton = new ButtonBuilder()
    .setCustomId(`bj_hit_${userId}_${buttonCounter}`) // unique custom ID with player ID
    .setLabel("Hit")
    .setStyle(ButtonStyle.Primary);

  const standButton = new ButtonBuilder()
    .setCustomId(`bj_stand_${userId}_${buttonCounter}`) // unique custom ID with player ID
    .setLabel("Stand")
    .setStyle(ButtonStyle.Danger);
  const doubleDownButton = new ButtonBuilder()
    .setCustomId(`bj_dd_${userId}_${buttonCounter}`) // unique custom ID with player ID
    .setLabel("Double Down")
    .setStyle(ButtonStyle.Success);
  if (canDD) {
    const row = new ActionRowBuilder().addComponents(
      hitButton,
      standButton,
      doubleDownButton
    );
    channel.send({
      content: `<@${userId}>, it's your turn! Your sum is ${theirSum}`,
      components: [row],
    });
    return;
  }
  const row = new ActionRowBuilder().addComponents(hitButton, standButton);

  channel.send({
    content: `<@${userId}>, it's your turn! Your sum is ${theirSum}`,
    components: [row],
  });
}
function generateLoanButtons(channel, userId) {
  const requestAmountButton = new ButtonBuilder()
    .setCustomId(`loan_place`)
    .setLabel("Request Amount")
    .setStyle(ButtonStyle.Success);
  const payDebtButton = new ButtonBuilder()
    .setCustomId(`loan_pay`)
    .setLabel("Pay off debt")
    .setStyle(ButtonStyle.Secondary);
  const walletButton = generateWalletButton();
  const xpForPlayer = xpSystem.getXpData(userId);
  if (wallet.getDebt(userId) > 0) {
    const row = new ActionRowBuilder().addComponents(
      requestAmountButton,
      payDebtButton,
      walletButton
    );

    channel.send({
      content: `Welcome to the *bank*! If you came here for a loan, you most likely won't be able to get one, because you haven't paid off your debt. You can do so with "$paydebt" or typing "$loan" again.`,
      components: [row],
    });
  } else {
    const row = new ActionRowBuilder().addComponents(
      requestAmountButton,
      walletButton
    );
    if (xpForPlayer.level < 3) {
      channel.send({
        content: `Welcome to the *bank*! You seem like you're too low of a level to be here. Come back when you're level 3 or above.`,
        components: [],
      });
      return;
    }
    channel.send({
      content: `Welcome to the *bank*! How many coins would you like to loan from us? Remember, *you have to pay your debts*, and we have a 5% interest rate.`,
      components: [row],
    });
  }
}
function generateWalletButton() {
  return new ButtonBuilder()
    .setCustomId(`bj_wallet`)
    .setLabel(`Wallet`)
    .setStyle(ButtonStyle.Primary);
}

function generateBetButtons(channel, start = false) {
  const betPrevButton = new ButtonBuilder()
    .setCustomId(`bj_betPrev`)
    .setLabel("Bet Previous")
    .setStyle(ButtonStyle.Success);

  const betAllButton = new ButtonBuilder()
    .setCustomId(`bj_betAll`) // unique custom ID with player ID
    .setLabel("Bet All")
    .setStyle(ButtonStyle.Secondary);
  const betCustomButton = new ButtonBuilder()
    .setCustomId(`bj_betCustom`)
    .setLabel(`${start ? `Place Bet` : `Custom Bet`}`)
    .setStyle(ButtonStyle.Primary);
  const leaveButton = new ButtonBuilder()
    .setCustomId(`bj_leaveRoom`)
    .setLabel(`Leave Room`)
    .setStyle(ButtonStyle.Danger);
  const walletButton = new ButtonBuilder()
    .setCustomId(`bj_wallet`)
    .setLabel(`Wallet`)
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(
    betPrevButton,
    betAllButton,
    betCustomButton,
    walletButton,
    leaveButton
  );
  const startRow = new ActionRowBuilder().addComponents(
    betCustomButton,
    betAllButton,
    walletButton
  );
  if (!start) {
    channel.send({
      content: `**Restarting game...** Please place your bets.`,
      components: [row],
    });
  } else {
    channel.send({
      content: `**Starting the game...** Please place your bets.`,
      components: [startRow],
    });
  }
}
function generateStartBjButton(channel) {
  const startBjButton = new ButtonBuilder()
    .setCustomId(`bj_start`)
    .setLabel("Start Game")
    .setStyle(ButtonStyle.Success);
  const row = new ActionRowBuilder().addComponents(startBjButton);
  let stringOfPeople = ``;
  const thatRoom = blackjackRooms.findRoom(channel.id);
  thatRoom.players.forEach((e) => {
    stringOfPeople += `\n<@${e.userId}>`;
  });
  channel.send({
    content: `Start the game when everyone has joined the table. People in room: ${stringOfPeople}`,
    components: [row],
  });
}
function generateBlackjackButtons(channel) {
  const blackjackButton = new ButtonBuilder()
    .setCustomId(`bj_portal`)
    .setLabel("Join Blackjack Room")
    .setStyle(ButtonStyle.Success);
  const row = new ActionRowBuilder().addComponents(blackjackButton);
  channel.send({
    content: `Welcome to the blackjack table. To start a game, you must join a room.`,
    components: [row],
  });
}
function generateRollPreviousButton(channel, betAmount) {
  const rollPrev = new ButtonBuilder()
    .setCustomId(`roll_prev_${betAmount}`)
    .setLabel(`Roll Previous Amount (${betAmount})`)
    .setStyle(ButtonStyle.Success);
  const walletButton = generateWalletButton();
  const row = new ActionRowBuilder().addComponents(rollPrev, walletButton);
  channel.send({
    components: [row],
  });
}
function findLoanLimit(userId) {
  let limit = 0;
  const xpDataForUser = xpSystem.xpOverview(userId, true);

  if (xpDataForUser.level >= 3) {
    if (xpDataForUser.level >= 3) {
      limit = 5000;
    }
    if (xpDataForUser.level >= 5) {
      limit = 10000;
    }
    if (xpDataForUser.level >= 7) {
      limit = 15000;
    }
    if (xpDataForUser.level >= 9) {
      limit = 20000;
    }
    if (xpDataForUser.level >= 11) {
      limit = 25000;
    }
    if (xpDataForUser.level >= 13) {
      limit = 30000;
    }
    if (xpDataForUser.level >= 15) {
      limit = 40000;
    }
    if (xpDataForUser.level >= 17) {
      limit = 50000;
    }
    if (xpDataForUser.level >= 19) {
      limit = 75000;
    }
    if (xpDataForUser.level >= 21) {
      limit = 100000;
    }
  }
  //yandere dev
  return limit;
}
// Handle button interaction

client.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "custom_bet_modal") {
      // Retrieve the user's input from the modal
      const customBet =
        interaction.fields.getTextInputValue("custom_bet_input");
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;
      // Validate the input to ensure it's a valid number
      const betAmount = parseInt(customBet, 10);
      // Process the custom bet (this is where you would add your bet logic)

      if (betAmount > 100000001) {
        await interaction.reply({
          content: `You've hit the betting limit!`,
          ephemeral: true,
        });
        return;
      }
      // Ne mozes da betujes ako nisi u room

      // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
      if (isNaN(betAmount) || betAmount <= 0 || betAmount > 10000001) {
        await interaction.reply({
          content: `Bet amount invalid!`,
          ephemeral: true,
        });
        return;
      }
      if (wallet.getCoins(userId) <= 0) {
        await interaction.reply({
          content: `You don't have any more money to play with... Removing you from the room...`,
          ephemeral: true,
        });
        blackjackRooms.removePersonFromRoom(userId, channelId);
        return;
      }
      if (wallet.getCoins(userId) < betAmount) {
        await interaction.reply({
          content: `You don't have enough money to make this bet!`,
          ephemeral: true,
        });
        return;
      }
      wallet.removeCoins(userId, Number(betAmount));
      const whatDoItSay = await blackjackBets.addBet(
        userId,
        channelId,
        betAmount
      );
      // stard da gamez
      if (whatDoItSay === "true") {
        setTimeout(() => {
          blackjackGame.startDealing(
            eventEmitter,
            channelId,
            interaction.channel
          );
        }, 2000);
        blackjackRooms.changeGameState(channelId, "betting", false);
        blackjackRooms.changeGameState(channelId, "dealing", true);
        await interaction.reply({
          content: `All bets are placed, **the game is starting...**`,
          components: [],
        });
        return;
      }
      await interaction.reply(whatDoItSay);
      return;

      // Add custom logic to handle bet (e.g., store bet amount, etc.)
    }
    if (interaction.customId === "custom_loan") {
      const inputAmount =
        interaction.fields.getTextInputValue("custom_loan_input");
      const userId = interaction.user.id;
      const channelId = interaction.channel.id;
      // Validate the input to ensure it's a valid number
      const amount = parseInt(inputAmount, 10);
      // Check if the amount is valid
      if (isNaN(amount) || amount <= 0) {
        return interaction.reply(
          "Please provide a valid amount of coins to add."
        );
      }
      const xpDataForUser = xpSystem.xpOverview(userId, true);
      // Extract the user ID of the mentioned user
      const limit = findLoanLimit(userId);
      if (xpDataForUser.level < 3) {
        return interaction.reply({
          content: `You can't get loans until you are level 3 or above!`,
          ephemeral: true,
        });
      }
      if (wallet.getDebt(userId) > 0) {
        return interaction.reply({
          content: `You haven't paid off your debt! You can't get a loan if you have a debt!`,
          ephemeral: true,
        });
      }
      if (amount > limit) {
        return interaction.reply({
          content: `You can't get that many coins. Your limit is ${limit} coins.`,
          ephemeral: true,
        });
      }
      wallet.addCoins(userId, amount, true);
      wallet.addDebt(userId, amount);
      const row = new ActionRowBuilder().addComponents(
        generateWalletButton()
      );
      await interaction.reply({
        content: `You have added **${amount}** coins to your wallet. Your debt: ${wallet.getDebt(
          userId
        )}.You can pay off your debt fully with "$paydebt" or "$loan".`,
        components: [row],
      });
    }
  }
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("roll")) {
    let match = interaction.customId.match(/\d+/);
    let betAmount;

    if (match) {
      betAmount = parseInt(match[0], 10);
      console.log(`Button roll with bet amount: ${betAmount}`);
    } else {
      await interaction.reply({
        content: `Can't find previous roll amount!`,
        ephemeral: true,
      });
      console.log(`Can't find bet amount!`);
      return;
    }

    const userId = interaction.user.id;

    if (!isNaN(betAmount) && betAmount > 0) {
      const coins = wallet.getCoins(userId);
      const freeSpinBetAmount =
        wallet.getFreeSpins(userId) > 0
          ? wallet.getFreeSpinBetAmount(userId)
          : null;

      console.log(`User's balance before betting: ${coins}`);
      console.log(
        `Free spins available with bet amount: ${freeSpinBetAmount}`
      );

      if (freeSpinBetAmount !== null && betAmount !== freeSpinBetAmount) {
        //await interaction.reply({
        //  content: `You have free spins available with a bet amount of ${freeSpinBetAmount}. Use this amount to roll with your free spins.`,
        //  ephemeral: true,
        //});
        return;
      }

      if (coins >= betAmount || freeSpinBetAmount !== null) {
        if (freeSpinBetAmount !== null) {
          betAmount = freeSpinBetAmount;
          //await interaction.reply({
          //  content: `Using a free spin with a bet of ${betAmount}! 🎁`,
          //  ephemeral: true,
          //});
          wallet.useFreeSpin(userId); // Only consume one free spin here
        } else {
          console.log(
            `User has enough coins. Attempting to remove ${betAmount} coins...`
          );
          wallet.removeCoins(userId, betAmount);
        }

        const result = await roll.roll(userId, betAmount, interaction, true);
        generateRollPreviousButton(interaction.channel, result.betAmount);
        generateWalletButton();
      } else {
        await interaction.reply({
          content: "You don't have enough coins to place this bet.",
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({
        content: "Please provide a valid bet amount.",
        ephemeral: true,
      });
    }
    return;
  }

  if (interaction.customId.startsWith("bj_")) {
    // Extract the userId and action from the customId
    let [action, userId] = interaction.customId.split("_").slice(1); // bj_hit_userId or bj_stand_userId
    const channelId = interaction.channel.id;
    userId = interaction.user.id;
    if (action === `portal`) {
      if (
        blackjackRooms.areWePlaying(channelId) ||
        blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
      ) {
        interaction.reply({
          content: `A game is currently in session.`,
          ephemeral: true,
        });
        return;
      }
      const coins = wallet.getCoins(userId);
      if (coins <= 0) {
        interaction.reply({
          content: `You don't have enough money to play a game of blackjack.`,
          ephemeral: true,
        });
        return;
      }
      const whatDoItSay = await blackjackRooms.makeRoom(userId, channelId);
      await interaction.reply({ content: whatDoItSay, ephemeral: true });
      generateStartBjButton(interaction.channel);
      return;
    }
    if (action === `wallet`) {
      const coins = wallet.getCoins(userId); // Get the user's balance
      const debt = wallet.getDebt(userId);
      await interaction.reply({
        content: `You have **${coins}** coins in your wallet.${
          debt > 0 ? `\nYour debt: ${debt}` : ``
        }`,
        ephemeral: true,
      });
      return;
    }
    if (action === `start`) {
      if (blackjackRooms.areWePlaying(channelId)) {
        interaction.reply({
          content: `The game has already started.`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
        interaction.reply({
          content: `You aren't in a room!`,
          ephemeral: true,
        });
        return;
      }

      blackjackGame.startBettingPhase(
        channelId,
        eventEmitter,
        interaction.channel
      );
      await interaction.reply({
        content: `Starting game...`,
        ephemeral: true,
      });

      generateBetButtons(interaction.channel, true);
      return;
    }
    if (action === "betCustom") {
      const modal = new ModalBuilder()
        .setCustomId("custom_bet_modal")
        .setTitle("Enter Your Custom Bet");

      // Add a text input field to the modal
      const betInput = new TextInputBuilder()
        .setCustomId("custom_bet_input")
        .setLabel("Your Bet")
        .setStyle(TextInputStyle.Short) // A short text input
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(betInput);
      modal.addComponents(actionRow);

      // Show the modal to the user
      await interaction.showModal(modal);
      return;
    }
    if (action === "betPrev" || action === "betAll") {
      if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
        await interaction.reply({
          content: `You aren't in a room!`,
          ephemeral: true,
        });
        return;
      }
      if (
        blackjackRooms.areWePlaying(channelId) ||
        blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
      ) {
        await interaction.reply({
          content: `You can't bet now!`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.areWeBetting(channelId)) {
        await interaction.reply({
          content: `The game must be started to bet.`,
          ephemeral: true,
        });
        return;
      }

      // const args = message.content.split(" ");
      const thatRoom = blackjackRooms.findRoom(channelId);
      let betAmount;
      if (action === "betPrev") {
        thatRoom.players.forEach((e) => {
          if (e.userId === userId) {
            betAmount = e.prevBetAmount;
          }
        });
      }
      if (action === "betAll") {
        betAmount = wallet.getCoins(userId);
      }

      if (betAmount > 100000001) {
        await interaction.reply({
          content: `You've hit the betting limit!`,
          ephemeral: true,
        });
        return;
      }
      // Ne mozes da betujes ako nisi u room

      // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
      if (isNaN(betAmount) || betAmount <= 0 || betAmount > 10000001) {
        await interaction.reply({
          content: `Bet amount invalid!`,
          ephemeral: true,
        });
        return;
      }
      if (wallet.getCoins(userId) <= 0) {
        await interaction.reply({
          content: `You don't have any more money to play with... Removing you from the room...`,
          ephemeral: true,
        });
        blackjackRooms.removePersonFromRoom(userId, channelId);
        return;
      }
      if (wallet.getCoins(userId) < betAmount) {
        await interaction.reply({
          content: `You don't have enough money to make this bet!`,
          ephemeral: true,
        });
        return;
      }
      wallet.removeCoins(userId, betAmount);
      const whatDoItSay = await blackjackBets.addBet(
        userId,
        channelId,
        betAmount
      );
      // stard da gamez
      if (whatDoItSay === "true") {
        setTimeout(() => {
          blackjackGame.startDealing(
            eventEmitter,
            channelId,
            interaction.channel
          );
        }, 2000);
        blackjackRooms.changeGameState(channelId, "betting", false);
        blackjackRooms.changeGameState(channelId, "dealing", true);
        await interaction.reply({
          content: `All bets are placed, **the game is starting...**`,
          components: [],
        });
        return;
      }
      await interaction.reply(whatDoItSay);
      return;
    }
    if (action === `leaveRoom`) {
      if (
        blackjackRooms.areWePlaying(channelId) ||
        blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
      ) {
        interaction.reply({
          content: `Can't leave the room mid game.`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.checkIfAlreadyInRoom(userId)) {
        interaction.reply({
          content: `You are not in a room.`,
          ephemeral: true,
        });
        return;
      }
      const thatRoom = blackjackRooms.findRoom(channelId);
      blackjackRooms.removePersonFromRoom(userId, channelId);

      if (thatRoom.players.length === 0) {
        await interaction.reply(`Removing <@${userId}> from the room...`);

        blackjackRooms.deleteRoom(channelId);
        return;
      }
      if (thatRoom.players.every((player) => player.betAmount > 0)) {
        setTimeout(() => {
          blackjackGame.startDealing(
            eventEmitter,
            channelId,
            interaction.channel
          );
        }, 2000);

        blackjackRooms.changeGameState(channelId, "betting", false);
        blackjackRooms.changeGameState(channelId, "dealing", true);
        await interaction.reply({
          content: `<@${userId}> left the room, and everyone else has placed their bet.**The game is starting...**`,
          components: [],
        });
        return;
      }
      await interaction.reply(`Removing <@${userId}> from the room...`);

      return;
    }
    // Handle blackjack button interactions
    if (interaction.user.id !== userId) {
      await interaction.reply({
        content: "It's not your turn to act in the blackjack game.",
        ephemeral: true,
      });
      return;
    }

    if (action === "hit") {
      // ovde sam picko
      // Handle hit logic here
      if (
        !blackjackRooms.areWePlaying(channelId) ||
        !blackjackRooms.checkIfAlreadyInRoom(userId)
      ) {
        await interaction.reply({
          content: `pa gde si krenuo buraz`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.isItYoTurn(userId, channelId)) {
        await interaction.reply({
          content: `pa gde si krenuo buraz`,
          ephemeral: true,
        });
        return;
      }
      const infoAboutPlayer = blackjackGame.hit(
        userId,
        channelId,
        eventEmitter,
        interaction.channel
      );
      if (infoAboutPlayer.theirSum === 21) {
        const messagezz = blackjackGame.stand(
          userId,
          channelId,
          eventEmitter,
          interaction.channel
        );
        await interaction.update({
          content: `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**. Their turn has been skipped.`,
          components: [],
        });

        return;
      }
      if (infoAboutPlayer.bust) {
        await interaction.update({
          content: `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**, and so they have **BUST**!`,
          components: [],
        });
        blackjackRooms.playerLose(userId, channelId);
        blackjackGame.stand(
          userId,
          channelId,
          eventEmitter,
          interaction.channel
        );
      } else {
        await interaction.update({
          content: `<@${userId}> got a **${
            infoAboutPlayer.cardTheyGot
          }**, their sum is **${infoAboutPlayer.theirSum}**.${
            infoAboutPlayer.aceSave
              ? `They've got an **ACE**, so their 11 is now counted as a 1.`
              : ``
          }`,
          components: [],
        });
        sendPlayerTurnButtons(
          userId,
          interaction.channel,
          infoAboutPlayer.theirSum
        );
      }
    } else if (action === "stand") {
      // Handle stand logic here
      if (
        !blackjackRooms.areWePlaying(channelId) ||
        !blackjackRooms.checkIfAlreadyInRoom(userId)
      ) {
        interaction.reply({
          content: `:question: pa gde si krenuo buraz :question:`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.isItYoTurn(userId, channelId)) {
        interaction.reply({
          content: `:question: pa gde si krenuo buraz :question:`,
          ephemeral: true,
        });
        return;
      }
      const messageszzz = blackjackGame.stand(
        userId,
        channelId,
        eventEmitter,
        interaction.channel
      );
      await interaction.update({
        content: `<@${userId}> chose to stand!`,
        components: [],
      });
      // Regenerate buttons for next action if necessary
    } else if (action === `dd`) {
      if (
        !blackjackRooms.areWePlaying(channelId) ||
        !blackjackRooms.checkIfAlreadyInRoom(userId)
      ) {
        await interaction.reply({
          content: `:question: pa gde si krenuo buraz :question:`,
          ephemeral: true,
        });
        return;
      }
      if (!blackjackRooms.isItYoTurn(userId, channelId)) {
        await interaction.reply({
          content: `:question: pa gde si krenuo buraz :question:`,
          ephemeral: true,
        });
        return;
      }
      const infoAboutPlayer = blackjackGame.doubleDown(
        userId,
        channelId,
        eventEmitter,
        interaction.channel
      );
      if (infoAboutPlayer.theirSum === 21) {
        const interactionzz = blackjackGame.stand(
          userId,
          channelId,
          eventEmitter,
          interaction.channel
        );
        await interaction.update({
          content: `:fireworks: <@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is.... no... it can't be..... **${infoAboutPlayer.theirSum}**!!!! :fireworks:`,
          components: [],
        });
        return;
      }
      if (infoAboutPlayer.bust) {
        await interaction.update({
          content: `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**, and so they have **BUST**!`,
          components: [],
        });
        blackjackRooms.playerLose(userId, channelId);
        blackjackGame.stand(
          userId,
          channelId,
          eventEmitter,
          interaction.channel
        );
      } else {
        await interaction.update({
          content: `<@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their sum is **${infoAboutPlayer.theirSum}**.`,
          components: [],
        });
        blackjackGame.stand(
          userId,
          channelId,
          eventEmitter,
          interaction.channel
        );
      }
    }

    // Ensure the interaction is acknowledged
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    return; // Exit since the blackjack logic is done
  }
  if (interaction.customId.startsWith("loan_")) {
    let [action] = interaction.customId.split("_").slice(1);
    if (action === "place") {
      const modal = new ModalBuilder()
        .setCustomId("custom_loan")
        .setTitle("Enter your loan amount");

      // Add a text input field to the modal
      const loanInput = new TextInputBuilder()
        .setCustomId("custom_loan_input")
        .setLabel(
          `Your Loan Amount: (Your limit is:${findLoanLimit(
            interaction.user.id
          )} coins)`
        )
        .setStyle(TextInputStyle.Short) // A short text input
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(loanInput);
      modal.addComponents(actionRow);

      // Show the modal to the user
      await interaction.showModal(modal);
      return;
    }
    if (action === "pay") {
      const userId = interaction.user.id;
      const playerCoins = wallet.getCoins(userId);
      const playerDebt = wallet.getDebt(userId);
      if (playerDebt <= 0) {
        await interaction.reply({
          content: `You don't have any debt!`,
          ephemeral: true,
        });
        return;
      }
      if (playerDebt > playerCoins) {
        await interaction.reply({
          content: `You don't have enough coins to pay off your debt!`,
          ephemeral: true,
        });
        return;
      }
      const row = new ActionRowBuilder().addComponents(
        generateWalletButton()
      );
      if (playerCoins >= playerDebt) {
        wallet.removeCoins(userId, playerDebt);
        wallet.payDebt(userId, playerDebt);
        await interaction.reply({
          content: `You have paid off your debt!`,
          components: [row],
        });
        return;
      }
      return;
    }
  }

  if (interaction.customId.startsWith("grid_")) {
    // Extract the userId and action from the customId
    let [action, betAmount, mineCount, userThatStarted] = interaction.customId
      .split("_")
      .slice(1); // bj_hit_userId or bj_stand_userId
    console.log(userThatStarted);
    console.log(interaction.customId);

    if (action === `play`) {
      // Check if the amount is a valid number
      if (isNaN(betAmount) || betAmount <= 0) {
        return interaction.reply("Please provide a valid amount of coins.");
      }

      const userId = interaction.user.id;
      // console.log(userThatStarted);
      // console.log(userId);
      if (userId !== userThatStarted) {
        return interaction.reply({
          content: `You can't interact with buttons created by others!`,
          ephemeral: true,
        });
      }
      const userCoins = wallet.getCoins(userId); // Get the user's coin balance

      // Check if the user has enough coins
      if (userCoins < betAmount) {
        return interaction.reply(
          "You don't have enough coins to start the grid."
        );
      }
      console.log(gridOwners);
      // Check if the user already has an active grid
      if (
        Object.values(gridOwners).some(
          (grid) => grid.userId === userId && !grid.isComplete
        )
      ) {
        return interaction.reply(
          "You already have an active grid! Complete it before creating a new one."
        );
      }
      console.log(betAmount);
      console.log(`type shit`);
      wallet.removeCoins(userId, Number(betAmount));
      const buttonGrid = grid.createButtonGrid(
        Number(mineCount),
        interaction.id
      ); // Use the createButtonGrid function from grid.js

      // Send the grid of buttons as a message
      const sentMessage = await interaction.update({
        content: `<@${userId}> have started a grid game with **${betAmount}** coins! Click a button to unlock!`,
        components: buttonGrid, // Attach the button grid to the message
      });

      // Initialize the grid in gridOwners and include revealedMultipliers as an empty array
      gridOwners[interaction.id] = {
        userId: interaction.user.id,
        isComplete: false,
        betAmount: Number(betAmount),
        mineCount: Number(mineCount), // Add mineCount here
        revealedMultipliers: [],
        fromButton: true,
      };
    }
    return;
  }
  let gridData = gridOwners[interaction.message.id]; // Get the grid data for this message
  let idOfGridData = interaction.message.id;
  if (!gridData) {
    let [action, somebullshit, pustime, customIdType] = interaction.customId
      .split("_")
      .slice(1);
    idOfGridData = customIdType;
    gridData = gridOwners[customIdType];
  }
  if (!gridData) {
    let [action, customIdTypeShit] = interaction.customId.split("_").slice(1);
    idOfGridData = customIdTypeShit;
    gridData = gridOwners[customIdTypeShit];
  }

  // Check if the grid data exists before proceeding
  if (!gridData) {
    console.error(
      `No grid data found for message ID: ${interaction.message.id}`
    );
    // Get the last key
    const lastKey = Object.keys(gridOwners).pop();
    // Delete the last object
    delete gridOwners[lastKey];
    await interaction.message.delete(); // Remove the grid message
    return interaction.reply({
      content: "Something went wrong with the grid data.",
      ephemeral: true,
    });
  }

  // Check if the user who clicked the button is the same as the one who created the grid
  if (interaction.user.id !== gridData.userId) {
    if (!interaction.replied) {
      await interaction.reply({
        content: "You are not allowed to interact with this grid.",
        ephemeral: true,
      });
    }
    return;
  }

  // Prevent further interactions if the game is already complete
  if (gridData.isComplete) {
    return interaction.reply({
      content: "This game has already ended.",
      ephemeral: true,
    });
  }

  // Handle the "End Game" button
  if (
    interaction.customId === "end_game" ||
    interaction.customId.startsWith(`end_game`)
  ) {
    if (gridData.isComplete) {
      return interaction.reply({
        content: "The game has already ended.",
        ephemeral: true,
      });
    }

    // Calculate the payout based on the revealed multipliers
    const totalMultiplier = gridData.revealedMultipliers.reduce(
      (sum, multiplier) => sum + multiplier,
      0
    );
    const payout = gridData.betAmount * totalMultiplier;

    if (totalMultiplier >= 4) {
      const xpGainForHugeWin = xpSystem.calculateXpGain(
        gridData.betAmount,
        gridXpGainHuge
      );
      xpSystem.addXp(gridData.userId, xpGainForHugeWin);
    } else if (totalMultiplier > 1) {
      const xpGainForSmallWin = xpSystem.calculateXpGain(
        gridData.betAmount,
        gridXpGainSmall
      );
      xpSystem.addXp(gridData.userId, xpGainForSmallWin);
    }
    const coinMessage = wallet.addCoins(gridData.userId, payout);

    // Add the payout to the user's wallet
    // wallet.addCoins(gridData.userId, payout);
    gridData.isComplete = true; // Mark the grid as complete

    const prevButton = new ButtonBuilder()
      .setCustomId(
        `grid_play_${gridData.betAmount}_${gridData.mineCount}_${gridData.userId}`
      ) // Custom ID for button interaction
      .setLabel(
        `Bet Previous (${gridData.betAmount} bet with ${gridData.mineCount} mines)`
      ) // The text on the button
      .setStyle(ButtonStyle.Success);
    const walletButton = generateWalletButton();
    const row = new ActionRowBuilder().addComponents(
      prevButton,
      walletButton
    );
    await interaction.reply({
      content: `Game ended! <@${
        interaction.user.id
      }> earned ${payout} coins.${
        coinMessage !== `` ? `\n*${coinMessage}*` : ``
      }`,
      components: [row],
    });
    await interaction.message.delete(); // Remove the grid message
    delete gridOwners[idOfGridData];

    return;
  }
  let multiplier;
  // Reveal the multiplier for the clicked button
  console.log(interaction.customId);
  if (gridData.fromButton) {
    multiplier = grid.revealMultiplier(interaction.customId, true);
  } else {
    multiplier = grid.revealMultiplier(interaction.customId);
  }

  // If the multiplier is 0, end the game, display the "X", and change the button to red
  if (multiplier === 0) {
    gridData.isComplete = true;
    gridData.revealedMultipliers = []; // Reset multipliers

    // Update the clicked button to show "X" and change its style to red
    const updatedButton = ButtonBuilder.from(interaction.component)
      .setLabel("X")
      .setStyle(ButtonStyle.Danger) // Change the button style to Danger (red)
      .setDisabled(true); // Disable the button

    await interaction.update({
      components: interaction.message.components.map((row) =>
        new ActionRowBuilder().addComponents(
          row.components.map((button) =>
            button.customId === interaction.customId ? updatedButton : button
          )
        )
      ),
    });
    const prevButton = new ButtonBuilder()
      .setCustomId(
        `grid_play_${gridData.betAmount}_${gridData.mineCount}_${gridData.userId}`
      ) // Custom ID for button interaction
      .setLabel(
        `Bet Previous (${gridData.betAmount} bet with ${gridData.mineCount} mines)`
      ) // The text on the button
      .setStyle(ButtonStyle.Success);
    const walletButton = generateWalletButton();
    const row = new ActionRowBuilder().addComponents(
      prevButton,
      walletButton
    );
    delete gridOwners[idOfGridData];
    // End the game with no payout
    setTimeout(async () => {
      await interaction.followUp({
        content: `Game over! <@${interaction.user.id}> lost everything!`,
        components: [row],
      });
      await interaction.message.delete(); // Remove the grid message after the delay
    }, 0);
    return;
  }

  // Add the multiplier to the list of revealed multipliers if it's not 0
  gridData.revealedMultipliers.push(multiplier);

  // Update the button with the revealed multiplier
  const updatedButton = ButtonBuilder.from(interaction.component)
    .setLabel(`x${multiplier}`)
    .setStyle(ButtonStyle.Success)
    .setDisabled(true);

  // Update the grid message with the updated button
  await interaction.update({
    components: interaction.message.components.map((row) =>
      new ActionRowBuilder().addComponents(
        row.components.map((button) =>
          button.customId === interaction.customId ? updatedButton : button
        )
      )
    ),
  });

  // Ensure the interaction is acknowledged
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }
});

client.login(process.env.DISCORD_TOKEN);
}

async function initializeBot() {
  await connectToDatabase(); // Wait until connection is established
  //await migrateData();       // Run migration after connecting
  startBot();                // Start bot after migration completes
}

initializeBot();

