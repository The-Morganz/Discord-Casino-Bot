const horse2 = require(`./horse`);
const HorseRacing = require(`../models/HorseRacing`);
async function betOnOneHorse(interaction, inputAmount = undefined) {
  const action = interaction.customId.split(`_`);
  if (action[1] === `win` || action[1] === `place`) {
    await HorseRacing.findOneAndUpdate(
      { userId: interaction.user.id },
      { typeOfBet: `${action[1]}` },
      { upsert: true }
    );
  }
  if (action[2] && inputAmount) {
    if (action[1] === `horseNumber`) {
      await HorseRacing.findOneAndUpdate(
        { userId: interaction.user.id },
        { horseNumber: inputAmount },
        { upsert: true }
      );
    }
    if (action[1] === `betAmount`) {
      const isThatValid = await horse2.isBetValid(
        inputAmount,
        interaction.user.id,
        false,
        interaction
      );
      if (isThatValid === true) {
        await horse2.addHorseBet(userId, inputAmount, interaction);
        await horse2.theFinalCountdown(interaction);
      }
      console.log(isThatValid);
    }
    console.log(action);
  }
}

function betOnMultiplehorses(interaction) {}

module.exports = { betOnOneHorse, betOnMultiplehorses };
