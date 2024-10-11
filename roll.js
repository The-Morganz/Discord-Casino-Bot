const wallet = require('./wallet');

// Define emoji set with rarity, payout, and multiplier for betting
const emojiSet = [
    { emoji: '🍋', rarity: 25, multiplier: 1 },
    { emoji: '🍊', rarity: 22, multiplier: 2 },
    { emoji: '🍒', rarity: 17, multiplier: 4 }, 
    { emoji: '🍉', rarity: 15, multiplier: 6 },   
    { emoji: '🍀', rarity: 12, multiplier: 10 },   
    { emoji: '7️⃣', rarity: 6, multiplier: 50 },  
    { emoji: '💎', rarity: 3, multiplier: 200 } 
];

// Function to get a random emoji based on rarity
function getRandomEmoji() {
    const rand = Math.random() * 100;  // Generate a random number between 0 and 100
    let cumulativeChance = 0;

    for (const item of emojiSet) {
        cumulativeChance += item.rarity;
        if (rand < cumulativeChance) {
            return item;  // Return the emoji object (with emoji, rarity, and multiplier)
        }
    }

    // If no emoji matched (rare case), return the least rare emoji (fallback)
    return emojiSet[0];
}

// Function to check for matches in rows, columns, and diagonals
function checkForMatch(matrix) {
    const matchCount = {};

    // Check rows for matches
    matrix.forEach(row => {
        const emoji = row[0].emoji;
        if (row.every(item => item.emoji === emoji)) {
            matchCount[emoji] = (matchCount[emoji] || 0) + 1;  // Count the matches
        }
    });

    /*
    // Check columns for matches
    for (let col = 0; col < 3; col++) {
        const emoji = matrix[0][col].emoji;
        if (matrix[0][col].emoji === matrix[1][col].emoji && matrix[1][col].emoji === matrix[2][col].emoji) {
            matchCount[emoji] = (matchCount[emoji] || 0) + 1;  // Count the matches
        }
    }
    */

    // Check diagonals for matches
    const diag1Emoji = matrix[0][0].emoji;
    const diag2Emoji = matrix[0][2].emoji;
    if (matrix[0][0].emoji === matrix[1][1].emoji && matrix[1][1].emoji === matrix[2][2].emoji) {
        matchCount[diag1Emoji] = (matchCount[diag1Emoji] || 0) + 1;  // Count the matches
    }
    if (matrix[0][2].emoji === matrix[1][1].emoji && matrix[1][1].emoji === matrix[2][0].emoji) {
        matchCount[diag2Emoji] = (matchCount[diag2Emoji] || 0) + 1;  // Count the matches
    }

    return matchCount; // Return the matches count
}

// Function to handle a roll with betting
function roll(userId, betAmount) {
    // Generate a 3x3 matrix of random emojis
    const rollResult = [
        [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
        [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
        [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()]
    ];

    const matches = checkForMatch(rollResult);
    let totalMultiplier = 0;

    // Calculate total multiplier based on matches count
    for (const emoji in matches) {
        if (matches.hasOwnProperty(emoji)) {
            const matchCount = matches[emoji];  // How many times this emoji matched
            const emojiInfo = emojiSet.find(item => item.emoji === emoji);
            totalMultiplier += matchCount * (emojiInfo ? emojiInfo.multiplier : 0);  // Total multiplier
        }
    }

    let payout = 0;
    if (totalMultiplier > 0) {
        payout = Math.round(betAmount * totalMultiplier);  // Calculate payout based on total multiplier
        wallet.addCoins(userId, payout);  // Add payout to user's wallet
    //} else {
    //    wallet.removeCoins(userId, betAmount);  // Deduct the bet if no match
    }

    // Format the output as a 3x3 matrix string
    const formattedResult = rollResult.map(row => row.map(item => item.emoji).join(' ')).join('\n');

    return {
        result: formattedResult,  // Return the formatted string for display
        payout
    };
}

module.exports = {
    roll
};
