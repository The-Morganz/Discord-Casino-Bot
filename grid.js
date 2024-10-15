const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Function to create the 4x4 grid of buttons with multipliers assigned
function createButtonGrid() {
  const multipliers = assignMultipliers(); // Get the randomly assigned multipliers
  const rows = [];

  let multiplierIndex = 0; // To assign multipliers in order

  // Create 4 rows, each with 4 buttons
  for (let i = 0; i < 4; i++) {
    const row = new ActionRowBuilder();
    
    for (let j = 0; j < 4; j++) {
      const button = new ButtonBuilder()
        .setCustomId(`button_${i}_${j}`) // Assign a unique ID based on position
        .setLabel('🔒') // Lock emoji as the initial label
        .setStyle(ButtonStyle.Primary); // Button style

      // Add the multiplier data as metadata to the button
      button.data = { multiplier: multipliers[multiplierIndex++] };

      row.addComponents(button);
    }
    
    rows.push(row); // Add the row of buttons to the rows array
  }
  
  return rows;
}

// Function to randomly assign multipliers to the grid
function assignMultipliers() {
  const multipliers = [
    ...Array(7).fill(1.5),  // 1.5x under 7 buttons
    ...Array(4).fill(2),    // 2x under 4 buttons
    ...Array(2).fill(5),    // 5x under 2 buttons
    ...Array(1).fill(10),   // 10x under 1 button
    ...Array(2).fill(0),    // 0x under 2 buttons (end game buttons)
  ];

  // Shuffle the multipliers array
  for (let i = multipliers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [multipliers[i], multipliers[j]] = [multipliers[j], multipliers[i]];
  }

  return multipliers; // Return the shuffled multipliers
}

// Function to reveal the multiplier on a clicked button
function revealMultiplier(button) {
  return button.data.multiplier; // Return the hidden multiplier
}

module.exports = {
  createButtonGrid,
  assignMultipliers,
  revealMultiplier,
};
