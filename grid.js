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
      const multiplier = multipliers[multiplierIndex++]; // Get the current multiplier

      const button = new ButtonBuilder()
        .setCustomId(`button_${i}_${j}_${multiplier}`) // Store the multiplier in the customId
        .setLabel('🔒') // Lock emoji as the initial label
        .setStyle(ButtonStyle.Primary); // Button style

      row.addComponents(button);
    }
    
    rows.push(row); // Add the row of buttons to the rows array
  }

  // Add an additional row for the "End Game" button
  const endGameRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('end_game') // Custom ID for the "End Game" button
      .setLabel('End Game') // Label for the button
      .setStyle(ButtonStyle.Danger) // Use Danger style (red)
  );
  
  rows.push(endGameRow); // Add the "End Game" button row to the rows array
  
  return rows;
}

// Function to randomly assign multipliers to the grid
function assignMultipliers() {
  const multipliers = [
    ...Array(7).fill(0.5),  
    ...Array(2).fill(2),    
    ...Array(1).fill(4),    
    ...Array(1).fill(5),   
    ...Array(5).fill(0),    
  ];

  // Shuffle the multipliers array
  for (let i = multipliers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [multipliers[i], multipliers[j]] = [multipliers[j], multipliers[i]];
  }

  return multipliers; // Return the shuffled multipliers
}

// Function to reveal the multiplier on a clicked button
function revealMultiplier(customId) {
  // Extract the multiplier from the customId (it's the last part after the last underscore)
  const parts = customId.split('_');
  return parseFloat(parts[parts.length - 1]); // Return the hidden multiplier as a float
}

module.exports = {
  createButtonGrid,
  assignMultipliers,
  revealMultiplier,
};
