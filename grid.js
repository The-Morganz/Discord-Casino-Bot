const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Function to create the 4x4 grid of buttons
function createButtonGrid() {
  const rows = [];
  
  // Create 4 rows, each with 4 buttons
  for (let i = 0; i < 4; i++) {
    const row = new ActionRowBuilder();
    
    for (let j = 0; j < 4; j++) {
      const button = new ButtonBuilder()
        .setCustomId(`button_${i}_${j}`) // Assign a unique ID based on position
        .setLabel('🔒') // Lock emoji as the initial label
        .setStyle(ButtonStyle.Primary); // Button style

      row.addComponents(button);
    }
    
    rows.push(row); // Add the row of buttons to the rows array
  }
  
  return rows;
}

module.exports = {
  createButtonGrid, // Export the grid creation function
};
