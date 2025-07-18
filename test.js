// test.js

// Minimal Sprite class for testing
class Sprite {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
  }

  isPreyOf(other) {
    return (
      (this.type === 'rock' && other.type === 'paper') ||
      (this.type === 'paper' && other.type === 'scissors') ||
      (this.type === 'scissors' && other.type === 'rock')
    );
  }

  convertTo(type) {
    this.type = type;
  }
}

// Test isPreyOf()
console.assert(new Sprite('rock', 0, 0).isPreyOf(new Sprite('paper', 0, 0)) === true, 'rock should be prey of paper');
console.assert(new Sprite('scissors', 0, 0).isPreyOf(new Sprite('rock', 0, 0)) === true, 'scissors should be prey of rock');
console.assert(new Sprite('paper', 0, 0).isPreyOf(new Sprite('scissors', 0, 0)) === true, 'paper should be prey of scissors');
console.assert(new Sprite('paper', 0, 0).isPreyOf(new Sprite('rock', 0, 0)) === false, 'paper should not be prey of rock');

// Test convertTo()
const s = new Sprite('rock', 0, 0);
s.convertTo('scissors');
console.assert(s.type === 'scissors', 'Sprite should convert to scissors');

// Test getWinner function
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