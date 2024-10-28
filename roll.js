const wallet = require("./wallet");
const xpSystem = require("./xp/xp");
const normalXpGain = 5;
// Define emoji set with rarity, payout, and multiplier for betting
const emojiSet = [
  { emoji: "🍋", rarity: 25, multiplier: 2, freeSpins: 3 },
  { emoji: "🍊", rarity: 22, multiplier: 3, freeSpins: 5 },
  { emoji: "🍒", rarity: 17, multiplier: 5, freeSpins: 7 },
  { emoji: "🍉", rarity: 15, multiplier: 10, freeSpins: 10 },
  { emoji: "🍀", rarity: 12, multiplier: 20, freeSpins: 15 },
  { emoji: "7️⃣", rarity: 6, multiplier: 50, freeSpins: 25 },
  { emoji: "💎", rarity: 3, multiplier: 200, freeSpins: 50 },
];

// Function to get a random emoji with a 10% chance for 
function getRandomEmoji() {
  const isGift = Math.random() < 0.05; // 10% chance for 🎁
  if (isGift) {
    return { emoji: "🎁", multiplier: 0 }; // No payout, only special effect
  }

  const rand = Math.random() * 100;
  let cumulativeChance = 0;

  for (const item of emojiSet) {
    cumulativeChance += item.rarity;
    if (rand < cumulativeChance) {
      return item;
    }
  }
  return emojiSet[0]; // Fallback to least rare emoji
}

// Function to check for matches in rows and diagonals
function checkForMatch(matrix) {
  const matchCount = {};

  matrix.forEach((row) => {
    const emoji = row[0].emoji;
    if (row.every((item) => item.emoji === emoji)) {
      matchCount[emoji] = (matchCount[emoji] || 0) + 1;
    }
  });

  const diag1Emoji = matrix[0][0].emoji;
  const diag2Emoji = matrix[0][2].emoji;
  if (
    matrix[0][0].emoji === matrix[1][1].emoji &&
    matrix[1][1].emoji === matrix[2][2].emoji
  ) {
    matchCount[diag1Emoji] = (matchCount[diag1Emoji] || 0) + 1;
  }
  if (
    matrix[0][2].emoji === matrix[1][1].emoji &&
    matrix[1][1].emoji === matrix[2][0].emoji
  ) {
    matchCount[diag2Emoji] = (matchCount[diag2Emoji] || 0) + 1;
  }

  return matchCount;
}

let skipAnim = false;

function skipAnimChange(state) {
  skipAnim = state;
}

// Function to handle a roll with betting
async function roll(userId, betAmount, message, button = false) {
  const frames = 3;
  const delay = 200; // 0.2 seconds

  let rollResult = [
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
    [getRandomEmoji(), getRandomEmoji(), getRandomEmoji()],
  ];

  // Check if 🎁 is present and only allow one 🎁
  let giftPresent = false;
  rollResult.forEach((row) => {
    row.forEach((cell, index) => {
      if (cell.emoji === "🎁") {
        if (giftPresent) {
          row[index] = getRandomEmoji(); // Replace extra 🎁
        } else {
          giftPresent = true;
        }
      }
    });
  });

  let interimResult;
  let sentMessage;
  if (button) {
    skipAnim = true;
  }

  // Send the initial message with the first frame
  if (!skipAnim) {
    sentMessage = await message.reply("🎰 Rolling...");

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
  }

  // Now, process the final roll
  const finalRollResult = rollResult
    .map((row) => row.map((item) => item.emoji).join(" "))
    .join("\n");

  const matches = checkForMatch(rollResult);
  let totalMultiplier = 0;
  let totalFreeSpins = 0;
  
  for (const emoji in matches) {
    const matchCount = matches[emoji];
    const emojiInfo = emojiSet.find((item) => item.emoji === emoji);
    if (emojiInfo) {
      totalMultiplier += matchCount * emojiInfo.multiplier;
      totalFreeSpins += matchCount * emojiInfo.freeSpins; // Accumulate free spins
    }
  }

  let payout = 0;
  let coinMessage = ``;
  if (totalMultiplier > 0) {
    payout = Math.round(betAmount * totalMultiplier);
    coinMessage = wallet.addCoins(userId, payout);
  }

  // Create the final message string
  let finalMessage = `🎰 <@${userId}> rolled:\n${finalRollResult}\n${
    payout > 0
      ? `You won **${payout}** coins! 🎉${
          coinMessage !== `` ? `\n*${coinMessage}*` : ``
        }`
      : "Better luck next time."
  }`;

  if (giftPresent && totalMultiplier > 0) {
    console.log(`Awarding free spins. Bet amount is: ${betAmount}`); // Debugging to check betAmount
    wallet.addFreeSpins(userId, totalFreeSpins, betAmount);
    finalMessage += `\n🎁 You won ${totalFreeSpins} free spins! Use $fs to display your free spins 🎁`;
}

  // Edit the same message to show the final result
  if (!skipAnim || button) {
    if (!button) {
      await sentMessage.edit(finalMessage);
    } else {
      await message.update({ content: finalMessage, components: [] });
    }
  } else {
    if (!button) {
      message.reply(finalMessage);
    } else {
      await message.update({ content: finalMessage, components: [] });
    }
  }

  const xpGain = xpSystem.calculateXpGain(betAmount, normalXpGain);
  console.log(xpGain);
  xpSystem.addXp(userId, xpGain);

  // Return the final result and payout (if needed)
  return {
    result: finalRollResult,
    payout: payout,
    finalMessage: finalMessage,
    betAmount: betAmount, // Final message returned (if needed in index.js)
  };
}

module.exports = {
  roll,
  skipAnimChange,
};
