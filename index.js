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
  TextInputComponent,
  MessageActionRow,
  channelLink,
  GuildForumThreadManager,
  StringSelectMenuBuilder,
  EmbedBuilder,
  MessageReaction,
} = require("discord.js");
const wallet = require("./wallet");
const roll = require("./roll/roll");
const blackjackRooms = require("./blackjack/rooms");
const blackjackBets = require(`./blackjack/bettingBJ`);
const blackjackGame = require("./blackjack/game");
const EventEmitter = require("events");
const daily = require("./daily/daily");
const voiceReward = require("./voiceReward");
const coinflip = require("./flip/coinflip");
const grid = require("./grid/grid");
const { makeDeck, randomNumber } = require("./blackjack/makeDeck");
const xpSystem = require("./xp/xp");
const path = require("path");
const eventEmitter = new EventEmitter();
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("./models/User");
const DailyChallenge = require("./models/DailyChallenge");
const UserXP = require("./models/UserXP");
const { format } = require("date-fns");
const shop = require("./shop/shop");
const { generateShop } = require(`./shop/generateShop`);
const playerInfo = require(`./playerinfo`);
const horse2 = require(`./horse/horse`);
const horseBetting = require(`./horse/horsebetting`);
const {
  generateRollThemeButtons,
  generateChooseThemeButtons,
} = require("./roll/generateRollThemeButtons");
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
client.on("guildCreate", (guild) => {
  // Find a channel to send the welcome message
  const channel = guild.channels.cache.find(
    (ch) =>
      ch.type === "GUILD_TEXT" &&
      ch.permissionsFor(guild.me).has("SEND_MESSAGES")
  );

  if (channel) {
    channel.send(
      `Hello! Thanks for inviting me to your server!\nTo get started, type **"$help"** to see all the services i offer!\nMade by tomazdravkovic and kalukalu.`
    );
  }
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
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Modified migrateData with connection check
async function migrateData() {
  // Wait until mongoose is fully connected
  if (mongoose.connection.readyState !== 1) {
    console.log("Waiting for MongoDB connection...");
    await new Promise((resolve) =>
      mongoose.connection.once("connected", resolve)
    );
  }

  console.log("Running migration...");
  const data = JSON.parse(fs.readFileSync("./data.json", "utf8"));

  for (const userId in data) {
    if (userId === "undefined") continue;

    const {
      coins = 0,
      debt = 0,
      freeSpins = 0,
      freeSpinsBetAmount = 0,
    } = data[userId];

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

async function migrateDailyChallenges() {
  if (mongoose.connection.readyState !== 1) {
    console.log("Waiting for MongoDB connection...");
    await new Promise((resolve) =>
      mongoose.connection.once("connected", resolve)
    );
  }

  console.log("Migrating daily challenges...");

  // Check if the daily.json file exists
  const dailyDataPath = "./daily/daily.json";
  if (!fs.existsSync(dailyDataPath)) {
    console.log(
      "daily.json file not found. Skipping daily challenge migration."
    );
    return;
  }

  // Read and parse daily.json data
  const dailyData = JSON.parse(fs.readFileSync(dailyDataPath, "utf8"));
  const today = format(new Date(), "yyyy-MM-dd"); // Format date as "YYYY-MM-DD"

  for (const userId in dailyData) {
    try {
      const {
        completed = false,
        challengeType = "message",
        messages = 0,
        requiredMessages = 0,
        imagesSent = 0,
        requiredImages = 0,
      } = dailyData[userId];

      // Check if a daily challenge already exists for the user and today’s date
      const existingChallenge = await DailyChallenge.findOne({
        userId,
        date: today,
      });
      if (!existingChallenge) {
        // Create a new DailyChallenge document if none exists
        const newChallenge = new DailyChallenge({
          userId,
          date: today,
          completed,
          challengeType,
          messages: challengeType === "message" ? messages : 0,
          requiredMessages: challengeType === "message" ? requiredMessages : 0,
          imagesSent: challengeType === "image" ? imagesSent : 0,
          requiredImages: challengeType === "image" ? requiredImages : 0,
        });
        await newChallenge.save();
        console.log(`Saved daily challenge for user ${userId} to MongoDB.`);
      } else {
        console.log(
          `Daily challenge for user ${userId} on ${today} already exists.`
        );
      }
    } catch (error) {
      console.error(
        `Error migrating daily challenge for user ${userId}:`,
        error
      );
    }
  }
  console.log("Daily challenges migration completed.");
}

async function migrateXpData() {
  if (mongoose.connection.readyState !== 1) {
    console.log("Waiting for MongoDB connection...");
    await new Promise((resolve) =>
      mongoose.connection.once("connected", resolve)
    );
  }

  console.log("Migrating XP data...");

  const xpDataPath = "./xp/xp.json";
  if (!fs.existsSync(xpDataPath)) {
    console.log("xp.json file not found. Skipping XP data migration.");
    return;
  }

  const xpData = JSON.parse(fs.readFileSync(xpDataPath, "utf8"));

  for (const userId in xpData) {
    const {
      xp = 0,
      level = 1,
      multiplier = 1,
      nextLevelXpReq = 100,
    } = xpData[userId];

    try {
      let userXP = await UserXP.findOne({ userId });
      if (!userXP) {
        userXP = new UserXP({ userId, xp, level, multiplier, nextLevelXpReq });
        await userXP.save();
        console.log(`Saved XP data for user ${userId} to MongoDB.`);
      } else {
        console.log(`XP data for user ${userId} already exists.`);
      }
    } catch (error) {
      console.error(`Error migrating XP data for user ${userId}:`, error);
    }
  }

  console.log("XP data migration completed.");
}

let gridOwners = {}; // Object to store the grid owner by message ID
let bettingOpen = false;
let raceInProgress = false; // Track whether the race animation has started

function startBot() {
  client.once("ready", () => {
    console.log("Bot is ready!");
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return; // Ignore bot messages
    if (message.channel.id === `1293305339743174837`) return;
    const userId = message.author.id;
    const channelId = message.channel.id;

    // Initialize the user's wallet if it doesn't exist
    await wallet.initializeWallet(userId);

    //
    if (message.content.toLowerCase() === "$help") {
      const theHelpMessagePt1 = `Hello! I'm a gambling bot. To start using my services, use one of my commands:\n\n💰**"$wallet", or "$w"**- Check your wallet.💰\n\n📅**"$daily"**- Get assigned daily challenges for some quick coins.📅\n:information:Doing all of the challenges increases your daily streak! Your daily streak increases the bonus you get when completing all challenges.:information:\n\n📞You can gain coins by being in a voice chat, each minute is equal to 10 coins (at level 1).📞\n\n🎰**"$roll [amount of coins]"** to use a slot machine.🎰\n 🎁**"$fs"**- See how many free spins you have, and with what amount!🎁\n\n :spades: **"$bj"**- Play Blackjack. :spades: \n :information: **You can do everything with buttons, but if they don't work, you can use these commands instead.**:information:\n:spades:**"$joinbj"**- Join a Blackjack room. You can also join a room if the room is in the betting phase.:spades:\n:spades:**"$startbj"**- Used to start a game of Blackjack.:spades:\n:spades:**"$betbj [amount of coins]"**- Place a bet in a Blackjack game.:spades:\n\n:coin:**"$flip [amount of coins] [@PersonYouWantToChallenge]"**- Challenge a player to a coinflip. Heads or tails?:coin:\n\n💣**"$grid [amount of coins] [mine amount]"**- Start a game of grid slots!💣\n\n🏆**"$leaderboard", or "$lb"**- To show the top 5 most wealthy people in the world.🏆\n\n:currency_exchange:**"$give [amount of coins] [@PersonYouWantToGiveTo]"**- Give your hard earned coins to someone else.:currency_exchange:\n\n:arrow_up:**"$level"**- Shows your level, how much xp you have,and need for the next level.:arrow_up:\n:information:When you level up, you gain an increased amount of coins when doing challenges or by being in a voice chat.:information:\n:information:You can gain xp by playing our various games!:information:\n\n🏇**"$horsebet [bet amount] [horse number]"**- Place a bet in a horse race. This also starts the horse race.🏇\n🏇**"$horsestats"**- Shows you the odds of each horse winning, the lower the odds, the higher the chance to win.🏇\n`;
      const theHelpMessagePt2 = `🏇**"$horserace"**- See when the horse race is starting.🏇\n🏇**"$horsenotify"**-Get notified via direct message a few moments before the race starts.🏇\n\n:bank:**"$loan"**- Go to the bank and ask for a loan! Your limit depends on your level, and you can start requesting loans at level 3.Every 2 levels after level 3, your limit grows.:bank:\n:information:**"$loan [amount of coins]"**- If your discord buttons don't work, try this command.:information:\n:bank:**"$paydebt"**- Pay off all of your debt, if you have the coins for it.:bank:\n\n:information:**"$playerinfo [@User]"**- Display information about tagged player.:information:\n\n🛒**"$shop"**- Go to the shop.🛒\n🛒**"$shophelp"**- Get details about items in the shop.🛒`;
      message.author.send(theHelpMessagePt1);
      message.author.send(theHelpMessagePt2);
    }
    // HOOORSE IM HORSING AROUND
    if (message.content.startsWith(`$horseracechange`)) {
      if (message.author.id !== ownerId && message.author.id !== ownerId2) {
        return message.reply("You don't have permission to use this command.");
      }
      let args = message.content.split(" ");
      let amount = parseInt(args[1]);
      let horseNumber = parseInt(args[2]);
      horse2.adminChangeRules(amount, horseNumber);
      message.reply(`Yes sir!`);
      return;
    }
    if (
      message.content.startsWith(`$horsebet`) ||
      message.content.startsWith(`$hb`)
    ) {
      // const row = generateHorseBetButtons();
      // message.channel.send({
      //   content: `Welcome to the world of horse betting! To get started, do you want to place a bet on a single horse, or a connected bet on multiple horses?`,
      //   components: [row],
      // });
      let args = message.content.split(" ");
      let amount = parseInt(args[1]);
      let horseNumber = parseInt(args[2]);
      const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
        `High Roller Pass`,
        userId
      );
      const isBetValid = await horse2.isBetValid(
        amount,
        horseNumber,
        userId,
        doTheyHaveHighRollerPass,
        message
      );
      if (isBetValid !== true) return message.reply(isBetValid);
      const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
        `Risk Taker's Badge`,
        userId
      );
      let riskTakerExtra = 0;
      if (doTheyHaveRiskTaker) {
        const theirCoinAmount = await wallet.getCoins(userId);
        // Define the threshold (80% of their total coins)
        const riskThreshold = theirCoinAmount * 0.8;
        // Check if the bet amount is greater than or equal to the threshold
        if (amount >= riskThreshold) {
          // Increase bet amount by 20% of their total coins
          riskTakerExtra = amount * 0.2;
          riskTakerExtra = Math.round(riskTakerExtra);
          await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
        }
      }
      await horse2.addHorseBet(userId, amount, horseNumber, message);
      await horse2.theFinalCountdown(message);
    }
    // YES IM STILL HORSING
    if (
      message.content.startsWith(`$horserace`) ||
      message.content.startsWith(`$hr`)
    ) {
      return horse2.whenDoesRaceStart(message);
    }
    // WHAT ARE MY HORSING STATISTICS
    if (
      message.content.startsWith(`$horsestats`) ||
      message.content.startsWith(`$hs`)
    ) {
      horse2.getHorseStats(message);
    }
    // CAN YOU CALL ME
    if (
      message.content.startsWith(`$horsenotify`) ||
      message.content.startsWith(`$hn`)
    ) {
      const user = await client.users.fetch(userId);
      const messageToSend = await horse2.notify(user, message);
      message.reply(messageToSend);
    }

    if (message.content.toLowerCase() === "$shop") {
      await shop.saveInDB();
      const { embed, rows } = await generateShop(
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        EmbedBuilder,
        userId,
        wallet
      );
      return message.reply({ embeds: [embed], components: rows });
    }
    // SHOP
    if (message.content.toLowerCase() === `$shophelp`) {
      const theHelpMessage = `Hi, and welcome to the shop! Oh? You need some help? Okay, i'll tell you what the items do.\n\n**"XP Booster"**- Doubles your xp gain for a day.\n**"Double Challenge Rewards"**- Doubles your daily challenge earnings forever.\n**"Coin Shield"**- Keep 10% of your bet after a loss. Removes after two hours.\n**"High Roller Pass"**- Raises the betting limit on all games by a significant amount.\n**"Custom Name License"**- Set your own custom name that will show up on the leaderboards! Usage: "$customname [your custom name]". Your custom name can have up to 5 words. Becomes invalid after one use.\n**"Change Custom Name"**- Changes another players' custom name on the leaderboards to whatever you want! Usage: "$changename [@user] [new custom name]". The custom name can have up to 5 words. Becomes invalid after one use.\n**"Wealth Multiplier"**- Earn x1.2 more coins on every win! Expires after an hour\n**"Interest-Free Loan"**- When taking a loan, remove the 5% interest rate. Becomes invalid after one use.\n**"Invisible Player"**- You will not appear on the leaderboards for two hours. "$playerinfo" also doesn't work on you.\n**"XP Stealer"**- In PVP modes (like coinflip), when you win, also take 20xp from the opponent. Becomes invalid after a day.\n**"Level Jump"**- Instantly ups your level by 1. Removes after use.\n**"Risk Taker's Badge"**- If you bet 80% or more of your wallet, 20% of your bet will be added extra to the bet amount. Removes after one use, win or loss.\n**"XP Converter"**- Gain xp when gaining coins. Lasts for two hours.\n\n**"Roll Themes"**- Enter a new part of the shop, where you can buy themes for the slot machines!`;
      // **"Debt Eraser"**- Cuts your debt in half. You can buy this item while you have debt, which will use the item instantly.Removes after one use.
      message.author.send(theHelpMessage);
      return;
    }
    if (message.content.toLowerCase() === `$removeitem`) {
      if (message.author.id !== ownerId && message.author.id !== ownerId2) {
        return message.reply("You don't have permission to use this command.");
      }

      const args = message.content.split(" ");
      const itemName = parseInt(args[1]);

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

      await shop.removeSpecificItem(mentionedUser, itemName);

      // Send a confirmation message
      await message.reply(
        `You have removed ${itemName} from <@${mentionedUser}>`
      );
    }

    if (message.content.toLowerCase().startsWith("$customname")) {
      const doTheyHaveLicense = await shop.checkIfHaveInInventory(
        `Custom Name License`,
        userId
      );
      if (!doTheyHaveLicense) {
        return message.reply(
          `You don't have the Custom Name License to be able to do this!`
        );
      }

      const args = message.content.split(" ");
      if (args.length === 1) {
        return message.reply(`Invalid custom name.`);
      }
      if (args.length > 6) {
        return message.reply(
          `Your custom name is too long! Custom names can only be 5 words long.`
        );
      }

      shop.customNameSetter(args, userId);
      message.reply(
        `Your custom name has been set.\n*The Custom Name License disappears from your hands.* `
      );
      shop.removeSpecificItem(userId, `Custom Name License`);
      return;
    }

    // Change Custom Name
    if (message.content.toLowerCase().startsWith("$changename")) {
      const doTheyHaveLicense = await shop.checkIfHaveInInventory(
        `Change Custom Name`,
        userId
      );
      if (!doTheyHaveLicense) {
        return message.reply(
          `You don't have the Change Custom Name item to be able to do this!`
        );
      }

      const args = message.content.split(" ");
      // Get the tagged user from the message (the second argument)
      const mentionedUser = message.mentions.users.first();
      // Check if a user is tagged
      if (!mentionedUser) {
        return message.reply("Please mention a valid user.");
      }

      const targetUserId = mentionedUser.id;
      if (args.length === 2) {
        return message.reply(`Invalid custom name.`);
      }
      if (args.length > 7) {
        return message.reply(
          `Your custom name is too long! Custom names can only be 5 words long.\n*The Change Players Custom Name item disappears from your hands.*`
        );
      }
      shop.customNameSetter(args, targetUserId, true);
      message.reply(`${mentionedUser.username} custom name has been changed. `);
      shop.removeSpecificItem(userId, `Change Custom Name`);
      return;
    }

    if (message.content.toLowerCase().startsWith(`$playerinfo`)) {
      const args = message.content.split(" ");
      // Get the tagged user from the message (the second argument)
      const mentionedUser = message.mentions.users.first();
      // Check if a user is tagged
      if (!mentionedUser) {
        return message.reply("Please mention a valid user.");
      }

      const targetUserId = mentionedUser.id;
      const playerInfoString = await playerInfo.getPlayerInfoString(
        mentionedUser,
        targetUserId,
        userId
      );
      message.reply(playerInfoString);
      return;
    }

    if (
      message.content.toLowerCase() === `$inventory` ||
      message.content.toLowerCase() === `$inv`
    ) {
      const inventory = await shop.getUserInventory(userId);
      let messageToSend = `You have:`;
      inventory.forEach((item) => {
        messageToSend += `\n${item.itemName}`;
      });
      if (messageToSend === `You have:`) {
        return message.reply(`You don't have any items!`);
      }
      return await message.author.send(messageToSend);
    }

    if (
      message.content.toLowerCase() === "$leaderboard" ||
      message.content.toLowerCase() === "$lb"
    ) {
      const topUsers = await wallet.getTopUsers(message); // Get top 5 users with display names

      // Build the leaderboard message
      let leaderboardMessage = ``;
      let leaderboardFirst = `🏆 **Leaderboard - Top 5** 🏆\n\n`;
      // Iterate over each top user and build the message
      for (const [index, user] of topUsers.entries()) {
        const theirDebt = await wallet.getDebt(user.userId); // Await debt retrieval
        const theirLevel = await xpSystem.xpOverview(user.userId, true); // Ensure this is async if needed
        const formattedCoins = wallet.formatNumber(user.coins);
        const formattedDebt = wallet.formatNumber(theirDebt);
        if (index === 0) {
          leaderboardFirst += `${index + 1}. ${user.displayName} (${
            user.originalName
          })  (${theirLevel.level}) - **${formattedCoins}** coins. ${
            theirDebt ? `${formattedDebt} coins in debt.` : ``
          }`;
          continue;
        }
        leaderboardMessage += `${index + 1}. ${user.displayName} (${
          user.originalName
        }) (${theirLevel.level}) - **${formattedCoins}** coins. ${
          theirDebt ? `${formattedDebt} coins in debt.` : ``
        }\n`;
      }
      leaderboardMessage += `\n${topUsers[4]?.mysteriousMessage}`;
      const embed = new EmbedBuilder()
        .setTitle(`${leaderboardFirst}`)
        .setDescription(leaderboardMessage)
        .setColor("#FFD700");
      // Send the leaderboard message
      return message.reply({ embeds: [embed] });

      // await message.reply(leaderboardMessage);
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

      let amount = parseInt(args[1]); // Get the coin amount
      const mineCount = parseInt(args[2]); // Get the mine count

      // Validate the bet amount and mine count
      if (
        isNaN(amount) ||
        amount <= 0 ||
        isNaN(mineCount) ||
        mineCount < 1 ||
        mineCount > 10 // Updated max mines to 10
      ) {
        return message.reply(
          "Please provide a valid amount of coins and a number of mines between 1 and 10."
        );
      }

      const userId = message.author.id;
      const userCoins = await wallet.getCoins(userId);
      let bettingLimit = 100000;
      const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
        `High Roller Pass`,
        userId
      );
      if (doTheyHaveHighRollerPass) bettingLimit = 100000000;

      // Check if the user has enough coins
      if (userCoins < amount) {
        return message.reply("You don't have enough coins to start the grid.");
      }
      if (amount > 100000) {
        if (doTheyHaveHighRollerPass && amount <= 100000000) {
          message.reply(
            `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`
          );
        } else {
          return message.reply(
            `You've hit the betting limit! The limit is ${bettingLimit}.`
          );
        }
      }

      const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
        `Risk Taker's Badge`,
        userId
      );
      let riskTakerExtra = 0;
      if (doTheyHaveRiskTaker) {
        const theirCoinAmount = await wallet.getCoins(userId);

        // Define the threshold (80% of their total coins)
        const riskThreshold = theirCoinAmount * 0.8;
        // Check if the bet amount is greater than or equal to the threshold
        if (amount >= riskThreshold) {
          // Increase bet amount by 20% of their total coins
          riskTakerExtra = amount * 0.2;
          riskTakerExtra = Math.round(riskTakerExtra);
          await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
        }
      }

      // Deduct the coins from the user's wallet
      await wallet.removeCoins(userId, Number(amount));

      const buttonGrid = grid.createButtonGrid(mineCount); // Pass the mine count to createButtonGrid
      const formattedAmount = wallet.formatNumber(amount);
      const sentMessage = await message.reply({
        content: `You have started a grid game with **${formattedAmount}** coins and **${mineCount}** mines! Click a button to unlock!`,
        components: buttonGrid,
      });

      gridOwners[sentMessage.id] = {
        userId: message.author.id,
        isComplete: false,
        betAmount: amount + riskTakerExtra,
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
      const confirmationMessage = await coinflip.confirmChallenge(userId);
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
    await daily.incrementChallenge(userId, `message`);

    // Track image posts for the daily image challenge
    if (message.attachments.size > 0) {
      for (const attachment of message.attachments.values()) {
        if (
          attachment.contentType &&
          attachment.contentType.startsWith("image/")
        ) {
          await daily.incrementChallenge(userId, `image`);
          // Optionally, send a reply message
          // await message.reply("Your image counts towards today's challenge!");
        }
      }
    }

    // Command to check daily challenge progress
    if (message.content.toLowerCase() === "$daily") {
      const status = await daily.getDailyStatus(userId); // Ensure to await the async call
      await message.reply(status);
    }

    // Command to check wallet balance
    if (message.content === "$w" || message.content === "$wallet") {
      const userId = message.author.id;
      try {
        // Make sure to await the database query
        const user = await User.findOne({ userId });
        const theirDebt = await wallet.getDebt(userId);
        const formattedCoins = wallet.formatNumber(user.coins);
        if (user) {
          // Send the user's coins and free spins as a response
          message.channel.send(
            `You have **${formattedCoins}** coins in your wallet 💰.${
              theirDebt ? `\nYour debt: ${theirDebt}` : ``
            }`
          );
        } else {
          message.channel.send("You don't have a wallet yet.");
        }
      } catch (error) {
        console.error("Error fetching wallet:", error);
        message.channel.send("There was an error retrieving your wallet.");
      }
    }

    // Command to check free spins balance
    if (
      message.content.toLowerCase() === "$freespins" ||
      message.content.toLowerCase() === "$fs"
    ) {
      const coins = await wallet.getFreeSpins(userId); // Get the user's balance
      const freeSpinsBetAmount = await wallet.getFreeSpinBetAmount(userId);
      const formattedAmount = wallet.formatNumber(freeSpinsBetAmount);
      await message.reply(
        `You have **${coins}** free spins remaining${
          freeSpinsBetAmount ? ` with a bet amount of ${formattedAmount}.` : `.`
        }`
      );
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
      await wallet.clearDebt(targetUserId);
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
        return message.reply(
          `Please provide a valid amount of coins to add. Remember, "$give [amount] [@person]"`
        );
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
      await wallet.addCoins(targetUserId, amount, true, true, true); // Ensure addCoins is awaited if async
      if (debtFreeAdd !== "debtFree") {
        await wallet.addDebt(targetUserId, amount); // Ensure addDebt is awaited if async
      }

      // Fetch and await the debt amount for the mentioned user
      const userDebt = await wallet.getDebt(targetUserId); // Await getDebt to get actual value
      const formattedAmount = wallet.formatNumber(amount);
      const formattedDebt = wallet.formatNumber(userDebt);
      // Send a confirmation message
      await message.reply(
        `You have added **${formattedAmount}** coins to **${mentionedUser.username}**'s wallet. Their debt: ${formattedDebt}`
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
      if ((await wallet.getDebt(targetUserId)) > 0) {
        return message.reply(
          `You haven't paid off your debt! You can't get a loan if you have a debt!`
        );
      }
      limit = await findLoanLimit(userId);

      if (amount > limit) {
        return message.reply(
          `You can't get that much coins. Your limit is ${limit} coins.`
        );
      }
      const doTheyHaveDebtEraser = await shop.checkIfHaveInInventory(
        `Debt Eraser`,
        userId
      );

      await wallet.addCoins(targetUserId, amount, true, true, true);
      await wallet.addDebt(targetUserId, amount);
      const theirDebt = await wallet.getDebt(targetUserId);
      const formattedAmount = wallet.formatNumber(amount);
      const formattedDebt = wallet.formatNumber(theirDebt);
      await message.reply(
        `You have added **${formattedAmount}** coins to your wallet.${
          doTheyHaveDebtEraser ? `*Your debt has been cut in half*` : ``
        } Your debt: ${formattedDebt}.You can pay off your debt fully with "$paydebt".`
      );
    }
    if (message.content.toLowerCase().startsWith("$paydebt")) {
      const playerCoins = await wallet.getCoins(userId);
      const playerDebt = await wallet.getDebt(userId);
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
        await wallet.removeCoins(userId, playerDebt, true, true);
        await wallet.payDebt(userId, playerDebt);
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
      await wallet.addCoins(targetUserId, amount, true, true, true);
      await wallet.removeCoins(userId, amount, true, true);
      await daily.incrementChallenge(userId, `santaGive`, amount);
      const formattedAmount = wallet.formatNumber(amount);
      await message.reply(
        `<@${userId}> has added ${formattedAmount} coins to ${mentionedUser.username}'s wallet.`
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
    if (message.content.toLowerCase().startsWith(`$changeroll`)) {
      await generateChooseThemeButtons(
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        userId,
        message
      );
    }

    // $ROLL
    if (message.content.toLowerCase().startsWith("$roll")) {
      const args = message.content.split(" ");
      let betAmount = parseInt(args[1]);

      const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
        `High Roller Pass`,
        userId
      );
      const doTheyHaveFreeSpinz = await wallet.getFreeSpins(userId);
      if (betAmount > 10000) {
        if (
          (doTheyHaveHighRollerPass && betAmount <= 1000000) ||
          doTheyHaveFreeSpinz > 0
        ) {
          message.reply(
            `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`
          );
        } else {
          return message.reply(`You've hit the betting limit!`);
        }
      }

      if (!isNaN(betAmount) && betAmount > 0) {
        const coins = await wallet.getCoins(userId);
        const freeSpinBetAmount =
          (await wallet.getFreeSpins(userId)) > 0
            ? await wallet.getFreeSpinBetAmount(userId)
            : null;

        // Restrict roll if user has free spins and the bet amount doesn’t match the free spin's bet amount
        if (freeSpinBetAmount !== null && betAmount !== freeSpinBetAmount) {
          await message.reply(
            `You have free spins available with a bet amount of ${freeSpinBetAmount}. Use this amount to roll with your free spins.`
          );
          return;
        }
        const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
          `Risk Taker's Badge`,
          userId
        );
        let riskTakerExtra = 0;

        if (coins >= betAmount || freeSpinBetAmount !== null) {
          if (freeSpinBetAmount !== null) {
            betAmount = freeSpinBetAmount;
            await message.reply(
              `Using a free spin with a bet of ${betAmount}! 🎁`
            );
            await wallet.useFreeSpin(userId); // Only consume one free spin here
          } else {
            if (doTheyHaveRiskTaker) {
              const theirCoinAmount = await wallet.getCoins(userId);
              const riskThreshold = betAmount * 0.8;
              if (betAmount >= riskThreshold) {
                riskTakerExtra = betAmount * 0.2;
                riskTakerExtra = Math.round(riskTakerExtra);
                await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
              }
            }
            await wallet.removeCoins(userId, betAmount);
          }

          const result = await roll.roll(
            userId,
            betAmount + riskTakerExtra,
            message
          );
          generateRollPreviousButton(message.channel, result.betAmount, userId);
          generateWalletButton();
        } else {
          await message.reply("You don't have enough coins to place this bet.");
        }
      } else {
        await message.reply("Please provide a valid bet amount.");
      }
    }

    // $LEVEL
    if (
      message.content.toLowerCase().startsWith("$level") ||
      message.content.toLowerCase().startsWith("$lvl")
    ) {
      return message.reply(await xpSystem.xpOverview(userId));
    }

    if (message.content.toLowerCase().startsWith("$joinbj")) {
      if (
        blackjackRooms.areWePlaying(channelId) ||
        blackjackRooms.areWeLettingTheDealerDealSoWeCantDoCommands(channelId)
      ) {
        message.reply(`A game is currently in session.`);
        return;
      }
      const coins = await wallet.getCoins(userId);
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

      const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
        `High Roller Pass`,
        userId
      );
      if (betAmount > 100000) {
        if (doTheyHaveHighRollerPass && amount <= 100000000) {
          message.reply(
            `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`
          );
        } else {
          message.reply(`You've hit the betting limit!`);
          return;
        }
      }
      // Ne mozes da betujes ako nisi u room

      // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
      if (isNaN(betAmount) || betAmount <= 0 || betAmount > 100000000) {
        message.reply(`Bet amount invalid!`);
        return;
      }
      if ((await wallet.getCoins(userId)) <= 0) {
        message.reply(
          `You don't have any more money to play with... Removing you from the room...`
        );
        blackjackRooms.removePersonFromRoom(userId, channelId);
        return;
      }
      if ((await wallet.getCoins(userId)) < betAmount) {
        message.reply(`You don't have enough money to make this bet!`);
        return;
      }
      const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
        `Risk Taker's Badge`,
        userId
      );
      let riskTakerExtra = 0;
      if (doTheyHaveRiskTaker) {
        const theirCoinAmount = await wallet.getCoins(userId);

        // Define the threshold (80% of their total coins)
        const riskThreshold = theirCoinAmount * 0.8;
        // Check if the bet amount is greater than or equal to the threshold
        if (betAmount >= riskThreshold) {
          // Increase bet amount by 20% of their total coins
          riskTakerExtra = betAmount * 0.2;
          riskTakerExtra = Math.round(riskTakerExtra);
          await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
        }
      }
      await wallet.removeCoins(userId, betAmount);
      const whatDoItSay = await blackjackBets.addBet(
        userId,
        channelId,
        betAmount + riskTakerExtra
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
          `:fireworks: <@${userId}> got a **${infoAboutPlayer.cardTheyGot}**, their turn has been skipped. :fireworks:`
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
      const infoAboutPlayer = await blackjackGame.doubleDown(
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
      if ((await wallet.getCoins(userId)) > 10) {
        message.reply(
          `The DEALER has taken 10 coins from <@${userId}>'s wallet`
        );
        await wallet.removeCoins(userId, 10, true);

        return;
      } else {
        message.reply(
          `The DEALER tried to take 10 coins from <@${userId}>'s wallet, but realized that <@${userId}> didn't have 10 coins to take.`
        );
        return;
      }
    }
    if (message.content.startsWith(`$devilsblessing`)) {
      return message.reply(
        `*We can't talk about him here... I hope you don't end up like those cups...*`
      );
    }

    // yeah, im blackjack
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
      const bustMessages = [
        `The DEALER **BUSTS** **all ova** the place`,
        `The DEALER has gone over 21,meaning they have **BUST**`,
        `The DEALER has gone overboard and have **BUST**`,
        `The DEALER **BUSTED**`,
      ];
      const bustMessage =
        bustMessages[Math.floor(Math.random() * bustMessages.length)];

      channelToSendTo.send(
        `:bust_in_silhouette: :boom: ${bustMessage} :bust_in_silhouette: :boom:`
      );
      blackjackGame.endGame(channelToSendTo.id, channelToSendTo, eventEmitter);
    }
    if (messageThatWasSent === `aceSave`) {
      channelToSendTo.send(
        `:bust_in_silhouette: The DEALER was about to **BUST**, but got saved by their **ACE**. Their sum is **${dealer.sum}** :bust_in_silhouette:`
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
  async function sendPlayerTurnButtons(userId, channel, theirSum) {
    const thatRoom = blackjackRooms.findRoom(channel.id);
    let buttonCounter;
    let turn;
    let canDD = false;
    const usersCoins = await wallet.getCoins(userId);
    thatRoom.players.forEach((e) => {
      if (e.userId === userId) {
        buttonCounter = e.buttonCounter;
        turn = e.turn;
        if (usersCoins >= e.betAmount * 2) {
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

  async function generateLoanButtons(channel, userId) {
    const requestAmountButton = new ButtonBuilder()
      .setCustomId(`loan_place`)
      .setLabel("Request Amount")
      .setStyle(ButtonStyle.Success);
    const payDebtButton = new ButtonBuilder()
      .setCustomId(`loan_pay`)
      .setLabel("Pay off debt")
      .setStyle(ButtonStyle.Secondary);
    const walletButton = generateWalletButton();
    const xpForPlayer = await xpSystem.getXpData(userId);
    if ((await wallet.getDebt(userId)) > 0) {
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
  function generateHorseBetButtons() {
    const oneHorseButton = new ButtonBuilder()
      .setCustomId(`hb_one`)
      .setLabel(`Bet on One Horse`)
      .setStyle(ButtonStyle.Success);
    const multipleHorses = new ButtonBuilder()
      .setCustomId(`hb_multiple`)
      .setLabel(`Bet on Multiple Horses`)
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(
      oneHorseButton,
      multipleHorses
    );
    return row;
  }
  function generateWinPlaceButtons() {
    const winBetButton = new ButtonBuilder()
      .setCustomId(`hb_win`)
      .setLabel(`Win Bet`)
      .setStyle(ButtonStyle.Success);
    const placeBetButton = new ButtonBuilder()
      .setCustomId(`hb_place`)
      .setLabel(`Place Bet`)
      .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(
      winBetButton,
      placeBetButton
    );
    return row;
  }
  function generateHorseModalButton() {
    const placeBetButton = new ButtonBuilder()
      .setCustomId(`hb_betAmount`)
      .setLabel(`Place Bet`)
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(placeBetButton);
    return row;
  }
  function generateHorseNumberModalButton() {
    const placeBetButton = new ButtonBuilder()
      .setCustomId(`hb_horseNumber`)
      .setLabel(`Place Horse Number`)
      .setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(placeBetButton);
    return row;
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
  function generateRollPreviousButton(channel, betAmount, userId) {
    const formattedPrevBet = wallet.formatNumber(betAmount);
    const rollPrev = new ButtonBuilder()
      .setCustomId(`roll_prev_${betAmount}_${userId}`)
      .setLabel(`Roll Previous Amount (${formattedPrevBet})`)
      .setStyle(ButtonStyle.Success);
    const walletButton = generateWalletButton();
    const row = new ActionRowBuilder().addComponents(rollPrev, walletButton);
    channel.send({
      components: [row],
    });
  }
  async function findLoanLimit(userId) {
    let limit = 0;
    const xpDataForUser = await xpSystem.xpOverview(userId, true);

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
        limit = 50000;
      }
      if (xpDataForUser.level >= 15) {
        limit = 70000;
      }
      if (xpDataForUser.level >= 17) {
        limit = 100000;
      }
      if (xpDataForUser.level >= 19) {
        limit = 150000;
      }
      if (xpDataForUser.level >= 21) {
        limit = 200000;
      }
    }
    //yandere dev
    return limit;
  }
  // Handle button interaction

  client.on("interactionCreate", async (interaction) => {
    if (interaction.channel.id === `1293305339743174837`) return;
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "custom_bet_modal") {
        // Retrieve the user's input from the modal
        const customBet =
          interaction.fields.getTextInputValue("custom_bet_input");
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
        // Validate the input to ensure it's a valid number
        const betAmount = parseInt(customBet, 10);
        let highRollerMessage = ``;
        // Process the custom bet (this is where you would add your bet logic)
        const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
          `High Roller Pass`,
          userId
        );
        if (betAmount > 100000) {
          if (doTheyHaveHighRollerPass && betAmount <= 100000000) {
            highRollerMessage = `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`;
          } else {
            await interaction.reply({
              content: `You've hit the betting limit!`,
              ephemeral: true,
            });
            return;
          }
        }
        // Ne mozes da betujes ako nisi u room

        // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
        if (isNaN(betAmount) || betAmount <= 0 || betAmount > 100000000) {
          await interaction.reply({
            content: `Bet amount invalid!`,
            ephemeral: true,
          });
          return;
        }
        if ((await wallet.getCoins(userId)) <= 0) {
          await interaction.reply({
            content: `You don't have any more money to play with... Removing you from the room...`,
            ephemeral: true,
          });
          blackjackRooms.removePersonFromRoom(userId, channelId);
          return;
        }
        if ((await wallet.getCoins(userId)) < betAmount) {
          await interaction.reply({
            content: `You don't have enough money to make this bet!`,
            ephemeral: true,
          });
          return;
        }
        const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
          `Risk Taker's Badge`,
          userId
        );
        let riskTakerExtra = 0;
        if (doTheyHaveRiskTaker) {
          const theirCoinAmount = await wallet.getCoins(userId);

          // Define the threshold (80% of their total coins)
          const riskThreshold = theirCoinAmount * 0.8;
          // Check if the bet amount is greater than or equal to the threshold
          if (Number(betAmount) >= riskThreshold) {
            // Increase bet amount by 20% of their total coins
            riskTakerExtra = betAmount * 0.2;
            riskTakerExtra = Math.round(riskTakerExtra);
            await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
          }
        }
        await wallet.removeCoins(userId, Number(betAmount));
        const whatDoItSay = await blackjackBets.addBet(
          userId,
          channelId,
          betAmount + riskTakerExtra
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
        await interaction.reply(`${highRollerMessage}\n${whatDoItSay}`);
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
        const xpDataForUser = await xpSystem.xpOverview(userId, true);
        // Extract the user ID of the mentioned user
        const limit = await findLoanLimit(userId);
        if (xpDataForUser.level < 3) {
          return interaction.reply({
            content: `You can't get loans until you are level 3 or above!`,
            ephemeral: true,
          });
        }
        if ((await wallet.getDebt(userId)) > 0) {
          return interaction.reply({
            content: `You haven't paid off your debt! You can't get a loan if you have a debt!`,
            ephemeral: true,
          });
        }
        if (amount > limit) {
          const formattedAmount = wallet.formatNumber(limit);
          return interaction.reply({
            content: `You can't get that many coins. Your limit is ${formattedAmount} coins.`,
            ephemeral: true,
          });
        }
        const doTheyHaveDebtEraser = await shop.checkIfHaveInInventory(
          `Debt Eraser`,
          userId
        );
        await wallet.addCoins(userId, amount, true, true, true);
        await wallet.addDebt(userId, amount);
        const theirDebt = await wallet.getDebt(userId);
        const formattedAmount = wallet.formatNumber(amount);
        const formattedDebt = wallet.formatNumber(theirDebt);
        const row = new ActionRowBuilder().addComponents(
          generateWalletButton()
        );
        await interaction.reply({
          content: `You have added **${formattedAmount}** coins to your wallet.${
            doTheyHaveDebtEraser ? `*Your debt has been cut in half*.` : ``
          } Your debt: ${formattedDebt}.You can pay off your debt fully with "$paydebt" or "$loan".`,
          components: [row],
        });
      }
      if (interaction.customId === `hb_horseNumber_modal`) {
        const inputAmount = interaction.fields.getTextInputValue(
          "hb_horseNumber_input"
        );
        await horseBetting.betOnOneHorse(interaction, inputAmount);
        const againARow = generateHorseModalButton();
        await interaction.update({
          content: `And what amount are you betting?`,
          components: [againARow],
        });
        // const isBetValid = await horse2.isBetValid(
        //     inputAmount,
        //     horseNumber,
        //     userId,
        //     doTheyHaveHighRollerPass,
        //     message
        //   );
        //   if (isBetValid !== true) return message.reply(isBetValid);
        //   const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
        //     `Risk Taker's Badge`,
        //     userId
        //   );
        //   let riskTakerExtra = 0;
        //   if (doTheyHaveRiskTaker) {
        //     const theirCoinAmount = await wallet.getCoins(userId);
        //     // Define the threshold (80% of their total coins)
        //     const riskThreshold = theirCoinAmount * 0.8;
        //     // Check if the bet amount is greater than or equal to the threshold
        //     if (amount >= riskThreshold) {
        //       // Increase bet amount by 20% of their total coins
        //       riskTakerExtra = amount * 0.2;
        //       riskTakerExtra = Math.round(riskTakerExtra);
        //       await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
        //     }
        //   }
        //   await horse2.addHorseBet(userId, amount, horseNumber, message);
        //   await horse2.theFinalCountdown(message);
      }
      if (interaction.customId === `hb_betAmount_modal`) {
        const inputAmount =
          interaction.fields.getTextInputValue("hb_betAmount_input");
        await horseBetting.betOnOneHorse(interaction, inputAmount);
      }
    }
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith(`hb_`)) {
      const action = interaction.customId.split(`_`);

      if (action[1] === `one`) {
        const row = generateWinPlaceButtons();
        await interaction.update({
          content: `Okay, one horse. What bet exactly? You cash a win bet only if your horse finishes first. You cash a place bet if your horse finishes first or second. `,
          components: [row],
        });
      }
      if (action[1] === `win` || action[1] === `place`) {
        await horseBetting.betOnOneHorse(interaction);

        const anotherRow = generateHorseNumberModalButton();
        interaction.update({
          content: `On which horse are you placing this bet?`,
          components: [anotherRow],
        });
      }
      if (action[1] === `multiple`) {
        horseBetting.betOnMultiplehorses(interaction);
      }
      if (action[1] === `betAmount`) {
        const modal = new ModalBuilder()
          .setCustomId("hb_betAmount_modal")
          .setTitle("Enter Your Bet");

        // Add a text input field to the modal
        const betInput = new TextInputBuilder()
          .setCustomId("hb_betAmount_input")
          .setLabel("Your Bet")
          .setStyle(TextInputStyle.Short) // A short text input
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(betInput);
        modal.addComponents(actionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
        return;
      }
      if (action[1] === `horseNumber`) {
        const modal = new ModalBuilder()
          .setCustomId("hb_horseNumber_modal")
          .setTitle("Which Horse Are You Betting On?");

        // Add a text input field to the modal
        const betInput = new TextInputBuilder()
          .setCustomId("hb_horseNumber_input")
          .setLabel("Your Desired Horse Number")
          .setStyle(TextInputStyle.Short) // A short text input
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(betInput);
        modal.addComponents(actionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
        return;
      }
      return;
    }
    if (interaction.customId.startsWith("roll")) {
      let match = interaction.customId.match(/\d+/);
      let [action, amount, usersButton] = interaction.customId
        .split("_")
        .slice(1);
      let betAmount;
      const userId = interaction.user.id;
      if (usersButton !== userId) {
        await interaction.reply({
          content: `You can't use other people's buttons!`,
          ephemeral: true,
        });
        return;
      }
      if (match) {
        betAmount = parseInt(match[0], 10);
      } else {
        await interaction.reply({
          content: `Can't find previous roll amount!`,
          ephemeral: true,
        });
        console.log(`Can't find bet amount!`);
        return;
      }
      let highRollerMessage = ``;
      const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
        `High Roller Pass`,
        userId
      );
      const doTheyHaveFreeSpinz = await wallet.getFreeSpins(userId);
      if (betAmount > 10000) {
        if (
          (doTheyHaveHighRollerPass && betAmount <= 1000000) ||
          doTheyHaveFreeSpinz > 0
        ) {
          highRollerMessage = `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`;
        } else {
          return interaction.reply(`You've hit the betting limit!`);
        }
      }

      if (!isNaN(betAmount) && betAmount > 0) {
        const coins = await wallet.getCoins(userId);
        const freeSpinBetAmount =
          (await wallet.getFreeSpins(userId)) > 0
            ? await wallet.getFreeSpinBetAmount(userId)
            : null;

        if (freeSpinBetAmount !== null && betAmount !== freeSpinBetAmount) {
          try {
            await interaction.reply({
              content: `You have free spins available with a bet amount of ${freeSpinBetAmount}. Use this amount to roll with your free spins.`,
              ephemeral: true,
            });
            return;
          } catch (error) {
            console.log(
              `They had free spins available. And rolled with some other value, but some error happened ${error}`
            );
            return;
          }
          return;
        }
        const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
          `Risk Taker's Badge`,
          userId
        );
        let riskTakerExtra = 0;

        if (coins >= betAmount || freeSpinBetAmount !== null) {
          if (freeSpinBetAmount !== null) {
            betAmount = freeSpinBetAmount;
            //await interaction.reply({
            //  content: `Using a free spin with a bet of ${betAmount}! 🎁`,
            //  ephemeral: true,
            //});
            await wallet.useFreeSpin(userId); // Only consume one free spin here
          } else {
            if (doTheyHaveRiskTaker) {
              const theirCoinAmount = await wallet.getCoins(userId);

              // Define the threshold (80% of their total coins)
              const riskThreshold = theirCoinAmount * 0.8;
              // Check if the bet amount is greater than or equal to the threshold
              if (betAmount >= riskThreshold) {
                // Increase bet amount by 20% of their total coins
                riskTakerExtra = betAmount * 0.2;
                riskTakerExtra = Math.round(riskTakerExtra);
                await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
              }
            }
            await wallet.removeCoins(userId, betAmount);
          }
          try {
            const result = await roll.roll(
              userId,
              betAmount + riskTakerExtra,
              interaction,
              true
            );
            generateRollPreviousButton(
              interaction.channel,
              result.betAmount,
              userId
            );
            generateWalletButton();
          } catch (err) {
            return console.log(`Something went wrong ${err}`);
          }
        } else {
          return await interaction.reply({
            content: "You don't have enough coins to place this bet.",
            ephemeral: true,
          });
        }
      } else {
        return await interaction.reply({
          content: "Please provide a valid bet amount.",
          ephemeral: true,
        });
      }
      return;
    }
    if (interaction.customId.startsWith("buy_")) {
      let [action, usersButtonOrThemeName, extraUserIdForRollThemes] =
        interaction.customId.split("_").slice(1);
      const userId = interaction.user.id;

      if (action === `back`) {
        const { embed, rows } = await generateShop(
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
          EmbedBuilder,
          interaction.user.id,
          wallet
        );

        return interaction.update({ embeds: [embed], components: rows });
      }

      if (action === `themesBuy`) {
        if (extraUserIdForRollThemes !== userId) {
          await interaction.reply({
            content: `You can't interact with buttons created by others`,
            ephemeral: true,
          });
          return;
        }
        const message = await shop.buyLogicForRollThemes(
          usersButtonOrThemeName,
          userId,
          wallet
        );
        await interaction.reply({ content: message, ephemeral: true });
        return;
      }
      if (usersButtonOrThemeName !== userId) {
        await interaction.reply({
          content: `You can't interact with buttons created by others`,
          ephemeral: true,
        });
        return;
      }
      if (action === `themes`) {
        const { embed, rows } = await generateRollThemeButtons(
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
          EmbedBuilder,
          userId,
          wallet
        );
        return interaction.update({
          embeds: [embed],
          components: rows,
        });
      }

      const message = await shop.buyLogic(action, userId, wallet);
      const doTheyHaveLevelJump = await shop.checkIfHaveInInventory(
        `Level Jump`,
        userId
      );
      if (doTheyHaveLevelJump) {
        const xpInfo = await xpSystem.getXpData(userId);
        const xpNeededToLevelUp = xpInfo.nextLevelXpReq - xpInfo.xp;
        await xpSystem.addXp(userId, xpNeededToLevelUp, true);
        await shop.removeSpecificItem(userId, `Level Jump`);
        return await interaction.reply({
          content: `You bought Level Jump and used it!`,
          ephemeral: true,
        });
      }
      await interaction.reply({ content: message, ephemeral: true });
      return;
    }

    if (interaction.customId.startsWith(`theme_`)) {
      let [themeName, usersButton] = interaction.customId.split("_").slice(1);
      if (usersButton !== interaction.user.id) {
        return await interaction.reply({
          content: `You can't interact with other people's buttons! If you want to change your roll theme, use "$shop".`,
          ephemeral: true,
        });
      }
      await roll.changeEmotes(interaction.user.id, themeName);
      await interaction.reply({
        content: `Changed your roll theme to ${themeName}!`,
        ephemeral: true,
      });
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
        const coins = await wallet.getCoins(userId);
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
        const coins = await wallet.getCoins(userId); // Get the user's balance
        const debt = await wallet.getDebt(userId);
        const formattedAmount = wallet.formatNumber(coins);
        const formattedDebt = wallet.formatNumber(debt);
        try {
          await interaction.reply({
            content: `You have **${formattedAmount}** coins in your wallet.${
              debt > 0 ? `\nYour debt: ${formattedDebt}` : ``
            }`,
            ephemeral: true,
          });
        } catch (err) {}

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
          betAmount = await wallet.getCoins(userId);
        }
        let highRollerMessage = ``;
        const doTheyHaveHighRollerPass = await shop.checkIfHaveInInventory(
          `High Roller Pass`,
          userId
        );

        if (betAmount > 100000) {
          if (doTheyHaveHighRollerPass && betAmount <= 100000000) {
            highRollerMessage = `You show your High Roller Pass to the dealer, and they allow you to make this larger bet`;
          } else {
            await interaction.reply({
              content: `You've hit the betting limit!`,
              ephemeral: true,
            });
            return;
          }
        }

        // I ne mozes da betujes ako ukucas nesto invalidno za betAmount
        if (isNaN(betAmount) || betAmount <= 0 || betAmount > 100000000) {
          await interaction.reply({
            content: `Bet amount invalid!`,
            ephemeral: true,
          });
          return;
        }
        if ((await wallet.getCoins(userId)) <= 0) {
          await interaction.reply({
            content: `You don't have any more money to play with... Removing you from the room...`,
            ephemeral: true,
          });
          blackjackRooms.removePersonFromRoom(userId, channelId);
          return;
        }
        if ((await wallet.getCoins(userId)) < betAmount) {
          await interaction.reply({
            content: `You don't have enough money to make this bet!`,
            ephemeral: true,
          });
          return;
        }
        const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
          `Risk Taker's Badge`,
          userId
        );
        let riskTakerExtra = 0;
        if (doTheyHaveRiskTaker) {
          const theirCoinAmount = await wallet.getCoins(userId);

          // Define the threshold (80% of their total coins)
          const riskThreshold = theirCoinAmount * 0.8;
          // Check if the bet amount is greater than or equal to the threshold
          if (betAmount >= riskThreshold) {
            // Increase bet amount by 20% of their total coins
            riskTakerExtra = betAmount * 0.2;
            riskTakerExtra = Math.round(riskTakerExtra);
            await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
          }
        }
        await wallet.removeCoins(userId, betAmount);
        const whatDoItSay = await blackjackBets.addBet(
          userId,
          channelId,
          betAmount + riskTakerExtra
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
        await interaction.reply(`${highRollerMessage}\n${whatDoItSay}`);
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
        const infoAboutPlayer = await blackjackGame.doubleDown(
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
        const loanlimit = await findLoanLimit(interaction.user.id);
        const formattedLimit = wallet.formatNumber(loanlimit);
        // Add a text input field to the modal
        const loanInput = new TextInputBuilder()
          .setCustomId("custom_loan_input")
          .setLabel(`Loan Amount: (Your limit:${formattedLimit} coins)`)
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
        const playerCoins = await wallet.getCoins(userId);
        const playerDebt = await wallet.getDebt(userId);
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
          await wallet.removeCoins(userId, playerDebt, true, true);
          await wallet.payDebt(userId, playerDebt);
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

      if (action === `play`) {
        // Check if the amount is a valid number
        if (isNaN(betAmount) || betAmount <= 0) {
          return interaction.reply("Please provide a valid amount of coins.");
        }

        const userId = interaction.user.id;

        if (userId !== userThatStarted) {
          return interaction.reply({
            content: `You can't interact with buttons created by others!`,
            ephemeral: true,
          });
        }
        const userCoins = await wallet.getCoins(userId); // Get the user's coin balance

        // Check if the user has enough coins
        if (userCoins < betAmount) {
          return interaction.reply(
            "You don't have enough coins to start the grid."
          );
        }

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
        const doTheyHaveRiskTaker = await shop.checkIfHaveInInventory(
          `Risk Taker's Badge`,
          userId
        );
        let riskTakerExtra = 0;
        if (doTheyHaveRiskTaker) {
          const theirCoinAmount = await wallet.getCoins(userId);

          // Define the threshold (80% of their total coins)
          const riskThreshold = theirCoinAmount * 0.8;
          // Check if the bet amount is greater than or equal to the threshold
          if (betAmount >= riskThreshold) {
            // Increase bet amount by 20% of their total coins
            riskTakerExtra = betAmount * 0.2;
            riskTakerExtra = Math.round(riskTakerExtra);
            await shop.removeSpecificItem(userId, `Risk Taker's Badge`);
          }
        }

        await wallet.removeCoins(userId, Number(betAmount));
        const buttonGrid = grid.createButtonGrid(
          Number(mineCount),
          interaction.id
        ); // Use the createButtonGrid function from grid.js

        // Send the grid of buttons as a message
        const formattedAmount = wallet.formatNumber(Number(betAmount));
        const sentMessage = await interaction.update({
          content: `<@${userId}> have started a grid game with **${formattedAmount}** coins! Click a button to unlock!`,
          components: buttonGrid, // Attach the button grid to the message
        });

        // Initialize the grid in gridOwners and include revealedMultipliers as an empty array
        gridOwners[interaction.id] = {
          userId: interaction.user.id,
          isComplete: false,
          betAmount: Number(betAmount) + riskTakerExtra,
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
      try {
        await interaction.message.delete(); // Remove the grid message
      } catch (err) {
        console.log(`Something went wrong...`);
      }
      try {
        console.log(`SOMETHING IS GOING WRONG!`);
      } catch (err) {
        console.log(`Something went veery wrong`);
      }
      return;
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

      // Ensure the user has revealed at least three grid buttons before ending the game
      if (gridData.revealedMultipliers.length < 2) {
        return interaction.reply({
          content:
            "You need to reveal at least two buttons before ending the game.",
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
        const xpGainForHugeWin = await xpSystem.calculateXpGain(
          gridData.betAmount,
          gridXpGainHuge
        );
        await xpSystem.addXp(gridData.userId, xpGainForHugeWin);
      } else if (totalMultiplier > 1) {
        const xpGainForSmallWin = await xpSystem.calculateXpGain(
          gridData.betAmount,
          gridXpGainSmall
        );
        await xpSystem.addXp(gridData.userId, xpGainForSmallWin);
      }
      // const doTheyHaveWealthMultiplier = await shop.checkIfHaveInInventory(`Wealth Multiplier`,userId);
      const coinMessage = await wallet.addCoins(gridData.userId, payout);
      await daily.incrementChallenge(gridData.userId, `playGrid`);
      // Add the payout to the user's wallet
      // await wallet.addCoins(gridData.userId, payout);
      gridData.isComplete = true; // Mark the grid as complete
      const formattedBetAmount = wallet.formatNumber(gridData.betAmount);
      const prevButton = new ButtonBuilder()
        .setCustomId(
          `grid_play_${gridData.betAmount}_${gridData.mineCount}_${gridData.userId}`
        ) // Custom ID for button interaction
        .setLabel(
          `Bet Previous (${formattedBetAmount} bet with ${gridData.mineCount} mines)`
        ) // The text on the button
        .setStyle(ButtonStyle.Success);
      const walletButton = generateWalletButton();
      const row = new ActionRowBuilder().addComponents(
        prevButton,
        walletButton
      );
      const formattedPayout = wallet.formatNumber(Number(payout));
      await interaction.reply({
        content: `Game ended! <@${
          interaction.user.id
        }> earned ${formattedPayout} coins.${
          coinMessage !== `` ? `\n${coinMessage}` : ``
        }`,
        components: [row],
      });
      await interaction.message.delete(); // Remove the grid message
      delete gridOwners[idOfGridData];

      return;
    }
    let multiplier;
    // Reveal the multiplier for the clicked button
    if (gridData.fromButton) {
      multiplier = grid.revealMultiplier(
        interaction.customId,
        true,
        gridData.revealedMultipliers,
        gridData.mineCount
      );
    } else {
      multiplier = grid.revealMultiplier(
        interaction.customId,
        false,
        gridData.revealedMultipliers,
        gridData.mineCount
      );
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

      await daily.incrementChallenge(gridData.userId, `playGrid`);
      try {
        await interaction.followUp({
          content: `Game over! <@${interaction.user.id}> lost everything!`,
          components: [row],
        });
        await interaction.message.delete(); // Remove the grid message after the delay
      } catch (err) {
        console.log(`Something went wrong: ${err}`);
      }
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
  //await migrateXpData();
  //await migrateDailyChallenges();
  //await migrateData();       // Run migration after connecting
  startBot(); // Start bot after migration completes
}

initializeBot();
