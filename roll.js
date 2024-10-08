const wallet = require('./wallet');

// Define emoji set with rarity, payout, and multiplier for betting
const emojiSet = [
    { emoji: '🍋', rarity: 50, multiplier: 2 },   // Lemon, 50% chance, x2 multiplier
    { emoji: '🍒', rarity: 20, multiplier: 4 },   // Cherry, 30% chance, x4 multiplier
    { emoji: '🍉', rarity: 13, multiplier: 8 },   // Watermelon, 15% chance, x8 multiplier
    { emoji: '7️⃣', rarity: 10, multiplier: 16 },  // Seven, 15% chance, x16 multiplier
    { emoji: '💎', rarity: 7, multiplier: 50 }    // Diamond, 7% chance, x50 multiplier
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

// Function to handle a roll with betting
function roll(userId, betAmount) {
    const rollResult = [
        getRandomEmoji(),
        getRandomEmoji(),
        getRandomEmoji()
    ];

    const allMatch = rollResult.every(item => item.emoji === rollResult[0].emoji);  // Check if all three emojis match
    let payout = 0;

    if (allMatch) {
        const multiplier = rollResult[0].multiplier;  // Get multiplier based on the matching emoji
        payout = betAmount * multiplier;  // Calculate payout based on bet amount and multiplier
        wallet.addCoins(userId, payout);  // Add payout to user's wallet
    //} else {
    //    wallet.removeCoins(userId, betAmount);  // Deduct the bet if no match
    }

    return {
        result: rollResult.map(item => item.emoji),  // Return only the emojis for display
        payout
    };
}

module.exports = {
    roll
};
