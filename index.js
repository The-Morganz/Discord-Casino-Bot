require("dotenv").config();
const { Client, GatewayIntentBits, channelLink } = require("discord.js");
const wallet = require("./wallet");
const roll = require("./roll");
const blackjackRooms = require("./blackjack/rooms");
const blackjackBets = require(`./blackjack/bettingBJ`);
const blackjackGame = require("./blackjack/game");
const EventEmitter = require("events");
const daily = require("./daily/daily");
const voiceReward = require("./voiceReward");
const { info } = require("console");
const { makeDeck, randomNumber } = require("./blackjack/makeDeck");
const eventEmitter = new EventEmitter();

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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Ignore bot messages

  const userId = message.author.id;
  const channelId = message.channel.id;

  // Initialize the user's wallet if it doesn't exist
  wallet.initializeWallet(userId);

  if (message.content.toLowerCase() === "$help") {
    const theHelpMessage = `Hello! I'm a gambling bot. To start using my services, use one of my commands:\n\n**"$wallet", or "$w"**- Check your wallet.\n\n**"$daily"**- Get assigned a daily challenge for some quick coins.\n\nYou can gain coins by being in a voice chat, each minute is equal to 10 coins.\n\n**"$roll [amount of coins]"** to use a slot machine.\n\n**"$joinbj"**- Join a blackjack room.\n\n**"$startbj"**- Used to start a game of blackjack\n\n**"$betbj [amount of coins]"**- Place a bet in a blackjack game.\n\n**"$leaderboard", or "$lb"**- To show the top 5 most wealthy people in the server.\n\n**"$give [amount of coins] [@PersonYouWantToGiveTo]"**- Give your hard earned coins to someone else.`;
    message.author.send(theHelpMessage);
  }

  // Leaderboard command
  // if (
  //   message.content.toLowerCase() === "$leaderboard" ||
  //   message.content.toLowerCase() === "$lb"
  // ) {
  //   const topUsers = wallet.getTopUsers(); // Get the top 5 users

  //   // Build the leaderboard message
  //   let leaderboardMessage = "🏆 **Leaderboard - Top 5** 🏆\n";
  //   topUsers.forEach((user, index) => {
  //     leaderboardMessage += `${index + 1}. <@${user.userId}> - **${
  //       user.coins
  //     }** coins\n`;
  //   });

  //   // Send the leaderboard message
  //   await message.reply(leaderboardMessage);
  // }
  if (
    message.content.toLowerCase() === "$leaderboard" ||
    message.content.toLowerCase() === "$lb"
  ) {
    const topUsers = await wallet.getTopUsers(message); // Pass 'message' to get the top 5 users with display names

    // Build the leaderboard message
    let leaderboardMessage = "🏆 **Leaderboard - Top 5** 🏆\n";
    topUsers.forEach((user, index) => {
      leaderboardMessage += `${index + 1}. ${user.displayName} - **${
        user.coins
      }** coins\n`;
    });

    // Send the leaderboard message
    await message.reply(leaderboardMessage);
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
        //message.reply('Your image counts towards today\'s challenge!');
      }
    });
  }

  // Command to check daily challenge progress
  if (message.content.toLowerCase() === "$daily") {
    const status = daily.getDailyStatus(userId);
    await message.reply(status);
  }

  // Command to check wallet balance
  if (
    message.content.toLowerCase() === "$wallet" ||
    message.content.toLowerCase() === "$w"
  ) {
    const coins = wallet.getCoins(userId); // Get the user's balance
    await message.reply(`You have **${coins}** coins in your wallet.`);
  }

  // Command to add coins (restricted to bot owner)
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

    // Add coins to the mentioned user's wallet
    wallet.addCoins(targetUserId, amount);
    await message.reply(
      `You have added **${amount}** coins to **${mentionedUser.username}'s** wallet.`
    );
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

    // Add coins to the mentioned user's wallet
    wallet.addCoins(targetUserId, amount);
    wallet.removeCoins(userId, amount);
    await message.reply(
      `<@${userId}> has added ${amount} coins to ${mentionedUser.username}'s wallet.`
    );
  }

  // Command to roll with betting
  if (message.content.toLowerCase().startsWith("$roll")) {
    const args = message.content.split(" ");
    const betAmount = parseInt(args[1]);

    // Debugging logs
    console.log(`Received $roll command with bet amount: ${betAmount}`);

    // Check if bet amount is valid
    if (!isNaN(betAmount) && betAmount > 0) {
      const coins = wallet.getCoins(userId);
      console.log(`User's balance before betting: ${coins}`); // Log the user's balance

      // Check if user has enough coins to bet
      if (coins >= betAmount) {
        // User has enough coins
        console.log(
          `User has enough coins. Attempting to remove ${betAmount} coins...`
        );
        wallet.removeCoins(userId, betAmount); // Remove the bet amount from the user's wallet

        // Perform the roll
        const rollResult = roll.roll(userId, betAmount);

        // Log the result of the roll
        console.log(
          `Roll result: ${rollResult.result}, Payout: ${rollResult.payout}`
        );

        // Handle payout logic
        if (rollResult.payout > 0) {
          // Display payout
          await message.reply(
            `🎰 You rolled:\n${rollResult.result}\nYou won **${rollResult.payout} coins!**  🎉 `
          );
        } else {
          await message.reply(
            `🎰 You rolled:\n${rollResult.result}\nBetter luck next time.`
          );
        }
      } else {
        await message.reply("You don't have enough coins to place this bet.");
      }
    } else {
      await message.reply("Please provide a valid bet amount.");
    }
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
    message.reply(whatDoItSay);
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
      message.channel.send(`All bets are placed, **the game is starting...**`);
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
    console.log(thatRoom.players.length);
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
      message.channel.send(`All bets are placed, **the game is starting...**`);
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
    message.channel.send(
      `Starting the game. Please place your bets using **"$betbj (amount)"**`
    );
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
            ? `They've got an ace, so their 11 is now counted as a 1.`
            : ``
        } **$hit** , or **$stand** ?`
      );
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
  console.log(messageThatWasSent);
  channelToSendTo.send(
    `:stopwatch: <@${messageThatWasSent}>, your turn. **$hit** , or **$stand** ? Your sum is **${theirSum}** :stopwatch:`
  );
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
  blackjackRooms.restartRoom(channelToSendTo.id, eventEmitter, channelToSendTo);
  channelToSendTo.send(
    `**Restarting game...** Use **$betbj (amount)** to place a new bet...`
  );
});
eventEmitter.on(`startBettingPhase`, (channelToSendTo) => {
  blackjackGame.startBettingPhase(
    channelToSendTo.id,
    eventEmitter,
    channelToSendTo
  );
});
eventEmitter.on(`afkRoom`, (channelToSendTo) => {
  channelToSendTo.send(`Deleting blackjack room due to inactivity....`);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.id;

  // Check if the user joined a voice channel
  if (!oldState.channel && newState.channel) {
    // User joined a voice channel
    voiceReward.userJoinedVoice(userId);
  }

  // Check if the user left a voice channel
  if (oldState.channel && !newState.channel) {
    // User left a voice channel
    voiceReward.userLeftVoice(userId);
  }
});

client.login(process.env.DISCORD_TOKEN);
