require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const wallet = require('./wallet');
const roll = require('./roll');  // Import the roll module

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

const ownerId = '237903516234940416';
const ownerId2 = '294522326182002710';

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;  // Ignore bot messages

    const userId = message.author.id;

    // Initialize the user's wallet if it doesn't exist
    wallet.initializeWallet(userId);

    // Command to check wallet balance
    if (message.content.toLowerCase() === "$wallet" || message.content.toLowerCase() === "$w") {
        const coins = wallet.getCoins(userId);  // Get the user's balance
        await message.reply(`You have ${coins} coins in your wallet.`);
    }


    // Command to add coins (restricted to bot owner)
    if (message.content.toLowerCase().startsWith('$add')) {
        if (message.author.id !== ownerId) {
            return message.reply("You don't have permission to use this command.");
        }

        const args = message.content.split(' ');
        const amount = parseInt(args[1]);

        // Check if the amount is valid
        if (isNaN(amount) || amount <= 0) {
            return message.reply("Please provide a valid amount of coins to add.");
        }

        // Get the tagged user from the message (the second argument)
        const mentionedUser = message.mentions.users.first();

        // Check if a user is tagged
        if (!mentionedUser) {
            return message.reply("Please mention a valid user to add coins to their wallet.");
        }

        // Extract the user ID of the mentioned user
        const targetUserId = mentionedUser.id;

        // Add coins to the mentioned user's wallet
        wallet.addCoins(targetUserId, amount);
        await message.reply(`You have added ${amount} coins to ${mentionedUser.username}'s wallet.`);
    }


    // Command to roll with betting
    if (message.content.toLowerCase().startsWith("$roll")) {
        const args = message.content.split(' ');
        const betAmount = parseInt(args[1]);

        // Debugging logs
        console.log(`Received $roll command with bet amount: ${betAmount}`);

        // Check if bet amount is valid
        if (!isNaN(betAmount) && betAmount > 0) {
            const coins = wallet.getCoins(userId);
            console.log(`User's balance before betting: ${coins}`);  // Log the user's balance

            // Check if user has enough coins to bet
            if (coins >= betAmount) {
                // User has enough coins
                console.log(`User has enough coins. Attempting to remove ${betAmount} coins...`);
                wallet.removeCoins(userId, betAmount);  // Remove the bet amount from the user's wallet
                
                // Perform the roll
                const rollResult = roll.roll(userId, betAmount);
                const resultString = rollResult.result.join(' ');

                // Log the result of the roll
                console.log(`Roll result: ${resultString}, Payout: ${rollResult.payout}`);

                // Handle payout logic
                if (rollResult.payout > 0) {
                    // Display payout
                    await message.reply(`🎰 You rolled: ${resultString}\nYou won ${rollResult.payout} coins!`);
                } else {
                    await message.reply(`🎰 You rolled: ${resultString}\nBetter luck next time.`);
                }
            } else {
                await message.reply("Broke ass nigga");
            }
        } else {
            await message.reply("Please provide a valid bet amount.");
        }
    }
    
});

client.login(process.env.DISCORD_TOKEN);
