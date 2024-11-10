const { MessageEmbed } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

// Function to handle placing bets
let bets = [];  // Stores the bets placed by users
let raceInProgress = false;

const placeBet = (user, amount, horseNumber) => {
    if (raceInProgress) {
        return "A race is already in progress!";
    }

    // Record the bet
    bets.push({ user, amount, horseNumber });
    return `${user.username} placed a bet of ${amount} on horse number ${horseNumber}!`;
};

const startRace = async (message) => {
    try {
        if (raceInProgress) return "A race is already in progress!";

        raceInProgress = true;
        let raceMessage = await message.channel.send(generateRaceTrack());
        let positions = [0, 0, 0, 0, 0, 0, 0, 0]; // Track positions of 8 horses
        let frameCount = 0;

        while (frameCount < 5) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second interval

            // Move horses by a larger random distance (between 5 and 10)
            for (let i = 0; i < positions.length; i++) {
                if (positions[i] < 50) positions[i] += Math.floor(Math.random() * 6) + 5; // Move between 5 to 10 units
            }

            frameCount++;

            // Update the race progress
            let raceFrame = positions.map((pos, idx) => {
                return `${idx + 1}🏁` + "-".repeat(50 - pos) + "🏇";
            }).join("\n");

            // Edit the message with the updated race track
            await raceMessage.edit({ embeds: [new EmbedBuilder().setDescription(raceFrame)] });

            if (frameCount === 5) {
                // Randomly pick a winner
                let winner = Math.floor(Math.random() * 8);
                positions[winner] = 50; // Move the winner to the finish line

                // Final message showing the winner
                raceFrame = positions.map((pos, idx) => {
                    return `${idx + 1}🏁` + "-".repeat(50 - pos) + (idx === winner ? "🏇 *Winner!*" : "🏇");
                }).join("\n");

                await raceMessage.edit({ embeds: [new EmbedBuilder().setDescription(raceFrame)] });
                raceInProgress = false;
                return getRaceResults(winner);
            }
        }
    } catch (error) {
        console.error('Error starting race:', error);
        return 'There was an error starting the race!';
    }
};

// Function to display race results
const getRaceResults = (winnerIndex) => {
    let winner = bets.filter(bet => bet.horseNumber === winnerIndex + 1);
    if (winner.length > 0) {
        winner.forEach(bet => {
            // Payout logic (double the bet amount for the winner)
            bet.user.send(`You won the race and earned ${bet.amount * 2} coins!`);
        });
        return `Horse ${winnerIndex + 1} is the winner!`;
    } else {
        return "No one bet on the winning horse.";
    }
};

// Function to generate the initial race track
const generateRaceTrack = () => {
    let raceTrack = '';
    for (let i = 0; i < 8; i++) {
        raceTrack += `${i + 1}🏁` + "-".repeat(50) + "🏇\n";
    }
    return raceTrack;
};

module.exports = { placeBet, startRace };