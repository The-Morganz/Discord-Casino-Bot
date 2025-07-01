const wallet = require(`../wallet`);
const shopAndItems = require(`../shop/shop`);
const xpSystem = require(`../xp/xp`);
const dailyChallenges = require(`../daily/daily`);
const UserStats = require(`../models/UserStats`);

let pendingChallenges = [];
function generateRandomGame() {
  const gamesToPlay = [
    `quickSum`,
    `quickSubtract`,
    `fastSpelling`,
    `reverseTyping`,
    `missingLetter`,
    `typingSpeed`,
    `unscrambleWord`,
  ];
  return gamesToPlay[Math.floor(Math.random() * gamesToPlay.length)];
}
function generateRandomHardWord() {
  const words = [
    `conscientious`,
    `handkerchief`,
    `nauseous`,
    `rhythm`,
    `embarrass`,
    `accommodate`,
    `occurrence`,
    `exaggerate`,
    `unnecessary`,
    `millennium`,
    `surveillance`,
    `privilege`,
    `psychiatrist`,
    `bureaucracy`,
    `miscellaneous`,
  ];
  return words[Math.floor(Math.random() * words.length)];
}
function generateBackwardsWord() {
  const words = [
    "apple",
    "table",
    "chair",
    "house",
    "pencil",
    "garden",
    "window",
    "bottle",
    "mirror",
    "purple",
    `shadow`,
    `tunnel`,
    `planet`,
    `danger`,
    `forest`,
    `bubble`,
    `castle`,
    `puzzle`,
    `blanket`,
  ];
  const oneWord = words[Math.floor(Math.random() * words.length)];
  const reversed = oneWord.split("").reverse().join("");

  return { oneWord: oneWord, reversed: reversed };
}
function generateHiddenWord() {
  const words = [
    "elephant",
    "bicycle",
    "kitchen",
    "octopus",
    "giraffe",
    "mountain",
    "jungle",
    "fireplace",
    "airplane",
    "backpack",
    `umbrella`,
    `chocolate`,
    `diamond`,
    `calendar`,
    `sandwich`,
    `tomorrow`,
    `hospital`,
    `computer`,
    `football`,
  ];
  let oneWord = words[Math.floor(Math.random() * words.length)];

  const theWord = oneWord;
  let wordArray = [];
  for (let i = 0; i < 2; i++) {
    let randomIndex = Math.floor(Math.random() * oneWord.length);

    oneWord = String(oneWord);
    wordArray = oneWord.split(``);
    wordArray[randomIndex] = "_";
    oneWord = wordArray.join("");
  }
  return { oneWord: oneWord, theWord: theWord };
}

function generateRandomSentence() {
  const sentences = [
    `hello how are you today`,
    `the sun is shining bright`,
    `i love playing games a lot`,
    `cats are very curious animals`,
    `jump over the lazy dog`,
    `typing fast is a useful skill`,
    `please bring me two cups of coffee`,
    `it is important to practice daily`,
    `my favorite color is blue or green`,
    `the quick brown fox jumps high`,
    `she sells seashells by the sea`,
    `some words are hard to spell well`,
    `phenomenal experiences are rare`,
    `lightning flashes and thunder roars`,
    `proper typing skills are required`,
  ];
  return sentences[Math.floor(Math.random() * sentences.length)];
}
function generateUnscrambleWord() {
  const words = [
    `stop`,
    `love`,
    `time`,
    `wolf`,
    `earth`,
    `garden`,
    `silver`,
    `pencil`,
    `travel`,
    `listen`,
    `hospital`,
    `elephant`,
    `passport`,
  ];
  let word = words[Math.floor(Math.random() * words.length)];
  const originalWord = word;
  let letters = word.split(""); // Convert word to an array of letters
  do {
    letters = letters.sort(() => Math.random() - 0.5); // Shuffle the letters
  } while (letters.join("") === word); // Ensure it's not the same as the original
  return { challengeWord: letters.join(""), originalWord: originalWord }; // Convert back to a string
}
function findGame(userId) {
  let gameToReturn;
  pendingChallenges.forEach((e) => {
    if (e.targetId === userId || userId === e.challengerId) {
      gameToReturn = e;
    }
  });
  if (!gameToReturn) {
    return false;
  }
  return gameToReturn;
}
function isItStillOn(userId) {
  let thatGame = findGame(userId);
  if (!thatGame) {
    return false;
  }
  clearTimeout(thatGame.timeout);
  return true;
}
function startSkillChallenge(challengerId, targetId, amount, message) {
  let thatGame = findGame(targetId);
  let challengerGame = findGame(challengerId);
  if (thatGame) {
    return "The tagged user already has a pending challenge.";
  }
  if (challengerGame) {
    return `You already have a pending challenge.`;
  }
  // Create the challenge
  pendingChallenges.push({
    targetId,
    challengerId,
    amount,
    targetId,
    timeout: null,
    message,
    game: generateRandomGame(),
    correctAnswer: undefined,
    someoneFinished: false,
    returnString: undefined,
    playing: false,
    index: pendingChallenges.length,
  });
  thatGame = findGame(targetId);
  // Set a timeout for 1 minute to abort the challenge if no response
  thatGame.timeout = setTimeout(() => {
    if (thatGame) {
      const abortMessage = `<@${challengerId}>, your skill challenge has been aborted due to inactivity.`;
      thatGame.message.reply(abortMessage); // Send the message in the same channel
      pendingChallenges.splice(thatGame.index, 1);
    }
  }, 60000); // 1 minute timeout
  const formattedAmount = wallet.formatNumber(amount);
  return `:crossed_swords: <@${challengerId}> has challenged <@${targetId}> to a skill battle for **${formattedAmount}** coins! <@${targetId}>, do you accept? :crossed_swords:`;
}
function acceptChallenge(userId) {
  thatGame = findGame(userId);
  if (!thatGame) {
    return;
  }
  if (thatGame.playing) {
    return;
  }
  thatGame.playing = true;
}
function declineChallenge(userId) {
  let gameToReturn;
  let gameIndex;
  pendingChallenges.forEach((e, i) => {
    if (e.targetId === userId || userId === e.challengerId) {
      gameToReturn = e;
      gameIndex = i;
    }
  });
  if (!gameToReturn) {
    return;
  }
  let thatGame = gameToReturn;
  if (thatGame.playing) {
    return;
  }
  clearTimeout(thatGame.timeout);
  pendingChallenges.splice(gameIndex, 1);
}
function generateGameTitle(targetId) {
  let thatGame = findGame(targetId);

  const challengeType = thatGame.game;

  let returnMessage = ``;
  switch (challengeType) {
    case `quickSum`:
      returnMessage = `Quickly sum up these two numbers!`;
      break;
    case `quickSubtract`:
      returnMessage = `Quickly subtract these two numbers!`;
      break;
    case `fastSpelling`:
      returnMessage = `Quickly spell this word exactly!`;
      break;
    case `reverseTyping`:
      returnMessage = `Quickly type this reversed word correctly!`;
      break;
    case `missingLetter`:
      returnMessage = `Quickly type this word correctly!`;
      break;
    case `typingSpeed`:
      returnMessage = `Quickly type this sentence back!`;
      break;
    case `unscrambleWord`:
      returnMessage = `Quickly unscramble this word!`;
      break;
  }
  return returnMessage;
}
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + 1) + min;
}
function generateGame(targetId) {
  let thatGame = findGame(targetId);

  if (thatGame.correctAnswer) {
    return thatGame.returnMessage;
  }
  const challengeType = thatGame.game;
  let returnString = ``;
  switch (challengeType) {
    case `quickSum`:
      const firstNumber = randomNumber(11, 99);
      const secondNumber = randomNumber(11, 99);
      const correctAnswer = Number(firstNumber) + Number(secondNumber);
      returnString = `SUM UP: ${firstNumber} + ${secondNumber} = ?`;
      thatGame.correctAnswer = String(correctAnswer).toLowerCase();
      thatGame.returnMessage = returnString;

      break;
    case `quickSubtract`:
      const firstNumberSubtract = randomNumber(11, 99);
      const secondNumberSubtract = randomNumber(11, 99);
      const correctAnswerSubtract =
        Number(firstNumberSubtract) - Number(secondNumberSubtract);
      returnString = `SUBTRACT: ${firstNumberSubtract} - ${secondNumberSubtract} = ?`;
      thatGame.returnMessage = returnString;
      thatGame.correctAnswer = String(correctAnswerSubtract).toLowerCase();
      returnMessage = `Quickly subtract these two numbers!`;
      break;
    case `fastSpelling`:
      const hardWord = generateRandomHardWord();
      returnString = `SPELL: ${hardWord}`;
      thatGame.returnMessage = returnString;

      thatGame.correctAnswer = hardWord.toLowerCase();

      break;
    case `reverseTyping`:
      const { oneWord: normalWord, reversed } = generateBackwardsWord();
      returnString = `REVERSE BACK: ${reversed}`;
      thatGame.returnMessage = returnString;

      thatGame.correctAnswer = normalWord.toLowerCase();
      break;
    case `missingLetter`:
      const { oneWord: fillInTheGapString, theWord: actualWord } =
        generateHiddenWord();
      returnString = `COMPLETE WORD: ${fillInTheGapString}`;
      thatGame.returnMessage = returnString;

      thatGame.correctAnswer = actualWord.toLowerCase();

      break;
    case `typingSpeed`:
      const sentence = generateRandomSentence();
      returnString = `TYPE: "${sentence}"`;
      thatGame.correctAnswer = sentence.toLowerCase();
      thatGame.returnMessage = returnString;

      break;
    case `unscrambleWord`:
      const { challengeWord, originalWord } = generateUnscrambleWord();
      returnString = `UNSCRAMBLE: ${challengeWord}`;
      thatGame.correctAnswer = originalWord.toLowerCase();
      thatGame.returnMessage = returnString;
      break;
  }
  return returnString;
}
async function startAfkTimer(userId, interaction) {
  let thatGame = findGame(userId);
  clearTimeout(thatGame.timeout);
  thatGame.timeout = setTimeout(async () => {
    if (thatGame) {
      await interaction.message.edit({
        content: `Nobody finished in time.`,
        components: [],
      });
      pendingChallenges.splice(thatGame.index, 1);
    }
  }, 60000 * 2);
}
function giveInformation(targetId) {
  let thatGame = findGame(targetId);

  // customId,title,input custom id, label text (ono sto je bitno)
  //   clearTimeout(thatGame.timeout);

  const information = {
    targetId: thatGame.targetId,
    challengerId: thatGame.challengerId,
    customId: `sc_${targetId}_${thatGame.game}`,
    title: `${generateGameTitle(targetId)}`,
    inputCustomId: `sc_input_${targetId}_${thatGame.game}`,
    labelText: generateGame(targetId),
    betAmount: thatGame.amount,
  };
  return information;
}
async function checkInput(userId, input) {
  let gameToReturn;
  let gameIndex;
  pendingChallenges.forEach((e, i) => {
    if (e.targetId === userId || userId === e.challengerId) {
      gameToReturn = e;
      gameIndex = i;
    }
  });
  if (!gameToReturn) {
    return `Your opponent already finished...`;
  }
  let thatGame = gameToReturn;
  console.log(thatGame.correctAnswer);
  if (thatGame.correctAnswer === input) {
    if (thatGame.someoneFinished) {
      return `Your opponent already finished...`;
    }
    // WINNER BELOW

    const doTheyHaveXPStealer = await shopAndItems.checkIfHaveInInventory(
      `XP Stealer`,
      userId
    );
    let winnerId;
    let loserId;
    if (userId === thatGame.challengerId) {
      winnerId = thatGame.challengerId;
      loserId = thatGame.targetId;
    } else {
      winnerId = thatGame.targetId;
      loserId = thatGame.challengerId;
    }
    if (doTheyHaveXPStealer) {
      if (userId === thatGame.challengerId) {
        await xpSystem.removeXp(thatGame.targetId, 250);
        await xpSystem.addXp(thatGame.challengerId, 250);
      } else {
        await xpSystem.removeXp(thatGame.challengerId, 250);
        await xpSystem.addXp(thatGame.targetId, 250);
      }
    }
    thatGame.someoneFinished = true;
    clearTimeout(thatGame.timeout);

    pendingChallenges.splice(gameIndex, 1);

    await dailyChallenges.incrementChallenge(
      thatGame.challengerId,
      `skillChallenge`
    );
    await dailyChallenges.incrementChallenge(
      thatGame.targetId,
      `skillChallenge`
    );
    await UserStats.findOneAndUpdate(
      { userId: winnerId },
      {
        $inc: {
          "games.skillChallenge.gamesPlayed": 1,
          "games.skillChallenge.gamesWon": 1,
          "games.skillChallenge.coinsWon": thatGame.amount,
        },
      },
      { upsert: true }
    );
    await UserStats.findOneAndUpdate(
      { userId: loserId },
      {
        $inc: {
          "games.skillChallenge.gamesPlayed": 1,
          "games.skillChallenge.gamesLost": 1,
          "games.skillChallenge.coinsLost": thatGame.amount,
        },
      },
      { upsert: true }
    );
    return false;
  }
  return `That's not quite right, you can still try again!`;
}

module.exports = {
  startSkillChallenge,
  giveInformation,
  checkInput,
  acceptChallenge,
  declineChallenge,
  startAfkTimer,
  isItStillOn,
};
