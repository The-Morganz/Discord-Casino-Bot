function makeDeck() {
  const suits = [`clubs`, `diamonds`, `hearts`, `spades`];
  const specials = [`jack`, `queen`, `king`];
  let startNumber = 2;
  let currentNumber = startNumber;
  let currentSpecial = specials[0];
  let currentSuit = suits[0];
  let completeCardSet = [`${currentNumber}_of_${currentSuit}`];
  let cards = [`${currentNumber}_of_${currentSuit}`];
  // Za Brojeve
  for (let ii = 0; ii < 39; ii++) {
    let nextCard;
    const previous = cards.at(-1);
    if (!previous.includes(`spades`)) {
      let nextSuit = suits[suits.indexOf(currentSuit) + 1];

      currentSuit = nextSuit;
      nextCard = `${currentNumber}_of_${nextSuit}`;
    } else {
      currentNumber++;
      currentSuit = suits[0];
      nextCard = `${currentNumber}_of_${currentSuit}`;
    }
    cards.push(nextCard);
    completeCardSet.push(nextCard);
  }
  //   Za Jacks, Queens, Kings
  for (let iii = 0; iii < 12; iii++) {
    let nextCard;
    const previous = cards.at(-1);
    if (!previous.includes(`spades`) || iii === 0) {
      let nextSuit = suits[suits.indexOf(currentSuit) + 1];

      if (!nextSuit) nextSuit = suits[0];
      currentSuit = nextSuit;
      nextCard = `10${currentSpecial}_of_${nextSuit}`;
    } else {
      currentSpecial = specials[specials.indexOf(currentSpecial) + 1];
      currentSuit = suits[0];
      nextCard = `10${currentSpecial}_of_${currentSuit}`;
    }
    cards.push(nextCard);
    completeCardSet.push(nextCard);
  }
  return completeCardSet;
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + 1) + min;
}

// const randomNumberFromDeck = randomNumber(0, cards.length - 1);
//   const randomCard = cards[randomNumberFromDeck];
//   const numberOnCard = randomCard.replace(/\D/g, "");
//   cards.splice(randomNumberFromDeck, 1);

module.exports = { makeDeck, randomNumber };
