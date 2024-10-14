const wallet = require("./wallet");

// Define emoji set with rarity, payout, and multiplier for betting
const emojiSet = [
  { emoji: "🍋", rarity: 25, multiplier: 2 },
  { emoji: "🍊", rarity: 22, multiplier: 3 },
  { emoji: "🍒", rarity: 17, multiplier: 5 },
  { emoji: "🍉", rarity: 15, multiplier: 10 },
  { emoji: "🍀", rarity: 12, multiplier: 20 },
  { emoji: "7️⃣", rarity: 6, multiplier: 50 },
  { emoji: "💎", rarity: 3, multiplier: 200 },
];

// Function to get a random emoji based on rarity
function getRandomEmoji() {
  const rand = Math.random() * 100; // Generate a random number between 0 and 100
  let cumulativeChance = 0;

  for (const item of emojiSet) {
    cumulativeChance += item.rarity;
    if (rand < cumulativeChance) {
      return item; // Return the emoji object (with emoji, rarity, and multiplier)
    }
  }

  return emojiSet[0]; // Fallback to least rare emoji
}

// Function to check for matches in rows and diagonals
function checkForMatch(matrix) {
  const matchCount = {};

  // Check rows for 3-in-a-row matches
  matrix.forEach((row) => {
    const emoji = row[0].emoji;
    if (row.every((item) => item.emoji === emoji)) {
      matchCount[emoji] = (matchCount[emoji] || 0) + 1; // Count the matches
    }
  });

  // Check diagonals for matches
  const diag1Emoji = matrix[0][0].emoji;
  const diag2Emoji = matrix[0][2].emoji;
  if (
    matrix[0][0].emoji === matrix[1][1].emoji &&
    matrix[1][1].emoji === matrix[2][2].emoji
  ) {
    matchCount[diag1Emoji] = (matchCount[diag1Emoji] || 0) + 1; // Count the diagonal matches
  }
  if (
    matrix[0][2].emoji === matrix[1][1].emoji &&
    matrix[1][1].emoji === matrix[2][0].emoji
  ) {
    matchCount[diag2Emoji] = (matchCount[diag2Emoji] || 0) + 1; // Count the diagonal matches
  }

  return matchCount;
}

// Function to handle a roll with betting
async function roll(userId, betAmount, message) {
  const frames = 5;
  const delay = 500; // 0.5 seconds

  const rollResult = [
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
  ];

  let interimResult;

  // Send the initial message with the first frame
  let sentMessage = await message.reply("🎰 Rolling...");

  for (let i = 0; i < frames; i++) {
    interimResult = [
      [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
      [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
      [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
    ];

    const interimDisplay = interimResult
      .map((row) => row.map((item) => item.emoji).join(" "))
      .join("\n");

    // Edit the message with the interim result
    await sentMessage.edit(`🎰 Rolling...\n${interimDisplay}`);

    // Wait for 0.5 seconds before showing the next frame
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Now, process the final roll
  const finalRollResult = rollResult
    .map((row) => row.map((item) => item.emoji).join(" "))
    .join("\n");

  const matches = checkForMatch(rollResult);
  let totalMultiplier = 0;

  // Calculate the total multiplier based on matches
  for (const emoji in matches) {
    if (matches.hasOwnProperty(emoji)) {
      const matchCount = matches[emoji];
      const emojiInfo = emojiSet.find((item) => item.emoji === emoji);
      totalMultiplier += matchCount * (emojiInfo ? emojiInfo.multiplier : 0);
    }
  }

  let payout = 0;
  if (totalMultiplier > 0) {
    payout = Math.round(betAmount * totalMultiplier);
    wallet.addCoins(userId, payout);
  }

  // Create the final message string
  const finalMessage = `🎰 You rolled:\n${finalRollResult}\n${
    payout > 0 ? `You won **${payout}** coins! 🎉` : "Better luck next time."
  }`;

  // Edit the same message to show the final result
  await sentMessage.edit(finalMessage);

  // Return the final result and payout (if needed)
  return {
    result: finalRollResult,
    payout: payout,
    finalMessage: finalMessage, // Final message returned (if needed in index.js)
  };
}

module.exports = {
  roll,
};
