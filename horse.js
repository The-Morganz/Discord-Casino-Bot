const { EmbedBuilder } = require('discord.js');

// Function to handle placing bets
let bets = [];  // Stores the bets placed by users
let raceInProgress = false;  // Flag to track when the race animation starts
let shuffledChances = [];

const initialWinningChances = [35, 20, 15, 10, 8, 6, 4, 2];  // Sum should be 100

// Initialize stats on bot startup (for the first race)
const initializeHorseStats = () => {
    shuffledChances = shuffleArray(initialWinningChances);  // Shuffle the chances only once at bot startup
};

// Function to get the shuffled chances
const getShuffledChances = () => {
    return shuffledChances;
};

// Place a bet
const placeBet = (user, amount, horseNumber) => {
    if (raceInProgress) {
        return "The race has already started, no more bets can be placed.";
    }

    // Record the bet
    bets.push({ user, amount, horseNumber });
    return `${user.username} placed a bet of ${amount} on horse number ${horseNumber}!`;
};

// Start the race process
const startRace = async (message) => {
    try {
        // Allow only the admin to start the race
        if (raceInProgress) return "A race is already in progress!";

        // Assign stats to horses when the owner starts the race
        shuffledChances = shuffleArray(initialWinningChances);

        // Inform the users that betting has started
        message.channel.send("Betting is now open! Type `$horse stats` to see the current horse stats and `$horsebet [amount] [horse number]` to place your bets.");

        // Set a timer to start the race after 1 minute (60,000 milliseconds)
        setTimeout(async () => {
            raceInProgress = true;  // After 1 minute, start the race and prevent further bets
            await startRaceAnimation(message);  // Start the race animation
        }, 10000);  // 60 seconds = 1 minute

        return "The race has started! You have 1 minute to place your bets.";
    } catch (error) {
        console.error('Error starting race:', error);
        return 'There was an error starting the race!';
    }
};

// Start race animation
const startRaceAnimation = async (message) => {
    try {
        let raceMessage = await message.channel.send(generateRaceTrack());
        let positions = [0, 0, 0, 0, 0, 0, 0, 0]; // Track positions of 8 horses
        let frameCount = 0;

        // Run the race for 5 frames
        while (frameCount < 5) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second interval

            // Move horses by a random distance (between 5 and 10)
            for (let i = 0; i < positions.length; i++) {
                if (positions[i] < 50) positions[i] += Math.floor(Math.random() * 6) + 5; // Move between 5 to 10 units
            }

            frameCount++;

            // Update the race progress with swapped emojis (jockey at the finish and flag at the start)
            let raceFrame = positions.map((pos, idx) => {
                return `${idx + 1}🏁` + "-".repeat(50 - pos) + "🏇";
            }).join("\n");

            // Edit the message with the updated race track
            await raceMessage.edit({ embeds: [new EmbedBuilder().setDescription(raceFrame)] });
        }

        // Wait for the same 2-second interval after the 5th frame before showing the winner
        await new Promise(resolve => setTimeout(resolve, 2000));

        // After all frames are completed, ensure the winner is the horse with the highest position
        let randomChance = Math.random() * 100;  // Generate a random number between 0 and 100
        let winnerIndex = getWinnerIndex(randomChance);

        positions[winnerIndex] = 50; // Move the winner to the finish line

        // Final message showing the winner with swapped emojis
        let finalRaceFrame = positions.map((pos, idx) => {
            return `${idx + 1}🏁` + "-".repeat(50 - pos) + (idx === winnerIndex ? "🏇 *Winner!*" : "🏇");
        }).join("\n");

        // Edit the race message to show the final race frame
        await raceMessage.edit({ embeds: [new EmbedBuilder().setDescription(finalRaceFrame)] });

        raceInProgress = false;
        return getRaceResults(winnerIndex);
    } catch (error) {
        console.error('Error in race animation:', error);
        return 'There was an error during the race!';
    }
};

// Helper function to get the winner based on the shuffled chances
const getWinnerIndex = (randomChance) => {
    let cumulativeChance = 0;
    for (let i = 0; i < shuffledChances.length; i++) {
        cumulativeChance += shuffledChances[i];
        if (randomChance <= cumulativeChance) {
            return i;
        }
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

// Helper function to shuffle the array randomly
const shuffleArray = (array) => {
    let shuffledArray = [...array];  // Copy the original array to avoid modifying it directly
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];  // Swap elements
    }
    return shuffledArray;
};

module.exports = { placeBet, startRace, getShuffledChances, initializeHorseStats };
