// test.js

function getWinner(a, b) {
  if (a === b) return 'draw';
  if (
    (a === 'rock' && b === 'scissors') ||
    (a === 'scissors' && b === 'paper') ||
    (a === 'paper' && b === 'rock')
  ) return 'a';
  return 'b';
}

// Simple tests
console.assert(getWinner('rock', 'scissors') === 'a', 'Rock should beat Scissors');
console.assert(getWinner('scissors', 'rock') === 'b', 'Scissors should lose to Rock');
console.assert(getWinner('paper', 'rock') === 'a', 'Paper should beat Rock');
console.assert(getWinner('rock', 'rock') === 'draw', 'Same choices should draw');

console.log("✅ All tests passed.");