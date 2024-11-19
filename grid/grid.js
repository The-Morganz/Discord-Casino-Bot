const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Function to create the 4x4 grid of buttons with multipliers assigned
function createButtonGrid(mineCount, customId = ``) {
  const multipliers = assignMultipliers(mineCount); // Now using mineCount for multipliers
  const rows = [];
  let multiplierIndex = 0;
  console.log(multipliers);
  // Create 4 rows, each with 4 buttons
  for (let i = 0; i < 4; i++) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 4; j++) {
      const multiplier = multipliers[multiplierIndex++];

      const button = new ButtonBuilder()
        .setCustomId(
          `button_${i}_${j}_${multiplier}${
            customId !== `` ? `_${customId}` : ``
          }`
        )
        .setLabel("🔒")
        .setStyle(ButtonStyle.Primary);

      row.addComponents(button);
    }
    rows.push(row);
  }

  // Add "End Game" button
  const endGameRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`end_game${customId !== `` ? `_${customId}` : ``}`)
      .setLabel("End Game")
      .setStyle(ButtonStyle.Danger)
  );

  rows.push(endGameRow);
  return rows;
}

function assignMultipliers(mineCount) {
  console.log(mineCount);
  const multiplierMap = {
    4: [...Array(12).fill(0.5)], // 4 mines => remaining 12 cells are 0.25x
    5: [...Array(11).fill(1)], // 5 mines => remaining 11 cells are 0.5x
    6: [...Array(10).fill(1.5)], // 6 mines => remaining 10 cells are 1.5x
    7: [...Array(9).fill(2)], // 7 mines => remaining 9 cells are 1x
    8: [...Array(8).fill(4)], // 8 mines => remaining 8 cells are 2x
    9: [...Array(7).fill(5)], // 9 mines => remaining 7 cells are 4x
    10: [...Array(6).fill(6)], // 10 mines => remaining 6 cells are 8x
  };

  const multipliers = multiplierMap[mineCount] || multiplierMap[4]; // Default to 4 mines if invalid
  const mines = Array(Math.min(mineCount, 10)).fill(0); // Cap the mines at 10

  const fullGrid = [...multipliers, ...mines]; // Combine multipliers and mines

  // Shuffle the grid so that mines and multipliers are randomized
  for (let i = fullGrid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fullGrid[i], fullGrid[j]] = [fullGrid[j], fullGrid[i]];
  }

  return fullGrid;
}

// Function to reveal the multiplier on a clicked button
function revealMultiplier(customId, fromButton = false) {
  // Extract the multiplier from the customId (it's the last part after the last underscore)
  const parts = customId.split("_");
  console.log(parts);
  if (fromButton) {
    return parseFloat(parts[parts.length - 2]); // Return the hidden multiplier as a float
  } else {
    return parseFloat(parts[parts.length - 1]);
  }
}

module.exports = {
  createButtonGrid,
  assignMultipliers,
  revealMultiplier,
};
