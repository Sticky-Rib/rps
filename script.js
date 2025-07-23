// ============================
// Main Javascript for RPS Game
// ----------------------------
// This module coordinates the game loop, sprite management,
// audio setup, and user interactions of the RPS simulation.
// 
// All code was integrated, understood, and tested by Simon Nitschke.
// ChatGPT was used as a coding assistant for clarity, learning, and structure.
// ============================


import { initSound, updateSoundMix, cycleBackgroundTrack, playVictorySound, silenceSpriteLoops} from './sound.js';
import { fpsMonitor } from './fps-monitor.js';

// ===============================
// Canvas Setup
// ===============================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Start FPS monitor, used for performance tracking and balancing
fpsMonitor.start(ctx);

// ===============================
// Global State and Constants
// ===============================
let winner = null;
let speedMultiplier = 1;
let aggressionRatio = 0.6; // initial 60% attack
let chartRendered = false;
let isFirstRun = true;
let fullGameData = [];
let interactionEnabled = false;
window.fullGameData = fullGameData;

const GAME_FONT_FAMILY = 'Verdana, Tahoma, sans-serif';

// Some of these values are only used in one place, but are retained to allow easy rebalancing.
const DEFAULT_SPEED = 1.0;
const DEFAULT_AGGRESSION = 60;
const DEFAULT_DENSITY = 33; // Percentage of max sprites per type

const MAX_SPRITES_PER_TYPE = 150;
const MIN_SPRITES_PER_TYPE = 1;

const BASE_JITTER = 0.1;
const BURST_CHANCE = 0.015;
const BURST_STRENGTH = 1;

const isSmallScreen = window.innerWidth < 450;
const BASE_SPRITE_SIZE = isSmallScreen ? 20 : 34;
const BASE_RADIUS = isSmallScreen ? 10 : 16;

const spriteImages = {
  rock: new Image(),
  paper: new Image(),
  scissors: new Image()
};
spriteImages.rock.src = 'assets/rock.png';
spriteImages.paper.src = 'assets/paper.png';
spriteImages.scissors.src = 'assets/scissors.png';

const preyOf = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper'
};

const predatorOf = {
  rock: 'paper',
  paper: 'scissors',
  scissors: 'rock'
};

// ===============================
// Audio Setup
// ===============================

document.body.addEventListener('click', () => {
  initSound();
}, { once: true });

// ===============================
// Slider Setup & Event Handlers
// ===============================

// --- Speed Slider ---
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

speedSlider.value = DEFAULT_SPEED;
speedValue.textContent = `${DEFAULT_SPEED.toFixed(1)}x`;
speedMultiplier = DEFAULT_SPEED;

speedSlider.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value);
  speedValue.textContent = `${speedMultiplier.toFixed(1)}x`;
});

// --- Aggression Slider ---
const aggressionSlider = document.getElementById('aggressionSlider');
const aggressionValue = document.getElementById('aggressionValue');

aggressionSlider.value = DEFAULT_AGGRESSION;
updateAggressionRatioFromSlider(); // Sets initial value and display
aggressionSlider.addEventListener('input', updateAggressionRatioFromSlider);


// --- Density Slider ---
const densitySlider = document.getElementById('densitySlider');
const densityValue = document.getElementById('densityValue');

densitySlider.value = DEFAULT_DENSITY;
const startingCount = getSpriteCountFromSlider();
densityValue.textContent = `${startingCount} each`;

densitySlider.addEventListener('input', () => {
  const count = getSpriteCountFromSlider();
  densityValue.textContent = `${count} each`;
  adjustSpriteCount(count);
});

// Shared helper
function getSpriteCountFromSlider() {
  const percentage = parseInt(densitySlider.value);
  return Math.floor(
    MIN_SPRITES_PER_TYPE +
    ((MAX_SPRITES_PER_TYPE - MIN_SPRITES_PER_TYPE) * (percentage / 100))
  );
}

// Helper to update aggression ratio and label from slider
function updateAggressionRatioFromSlider() {
  const sliderValue = parseInt(aggressionSlider.value);
  aggressionValue.textContent = `${sliderValue}%`;
  const ratio = sliderValue / 100;
  aggressionRatio = 0.4 + (0.6 - 0.4) * ratio;
}

// ===============================
// Sprite Class & Sprite Management
// ===============================

class Sprite {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = BASE_RADIUS;
    this.speed = (1 + Math.random());
    this.dx = Math.random() * 2 - 1;
    this.dy = Math.random() * 2 - 1;
  }

draw() {
  const img = spriteImages[this.type];
  if (img && img.complete) {
    ctx.drawImage(
      img,
      this.x - this.radius,
      this.y - this.radius,
      this.radius * 2,
      this.radius * 2
    );
  } else {
    // fallback to emoji if image isn’t available
    ctx.font = `${BASE_SPRITE_SIZE}px ${GAME_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let symbol = '?';
    switch (this.type) {
      case 'rock': symbol = '🪨'; break;
      case 'paper': symbol = '📄'; break;
      case 'scissors': symbol = '✂️'; break;
    }

    ctx.fillText(symbol, this.x, this.y);
  }
}

  update() {
    if (Math.random() < BURST_CHANCE) {
      this.dx += (Math.random() - 0.5) * BURST_STRENGTH;
      this.dy += (Math.random() - 0.5) * BURST_STRENGTH;
    }
    this.x += this.dx * this.speed * speedMultiplier;
    this.y += this.dy * this.speed * speedMultiplier;

    if (this.x < this.radius || this.x > canvas.width - this.radius) this.dx *= -1;
    if (this.y < this.radius || this.y > canvas.height - this.radius) this.dy *= -1;

    this.x = Math.max(this.radius, Math.min(this.x, canvas.width - this.radius));
    this.y = Math.max(this.radius, Math.min(this.y, canvas.height - this.radius));
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

  moveTowardPreyAndAvoidPredator(others) { // core movement logic
    let preyTarget = null;
    let predatorThreat = null;
    let minPreyDist = Infinity;
    let minPredatorDist = Infinity;

    let moveX = 0;
    let moveY = 0;

    for (let other of others) {
      if (other === this) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (other.type === preyOf[this.type] && dist < minPreyDist) {
        preyTarget = { dx, dy, dist };
        minPreyDist = dist;
      } else if (other.type === predatorOf[this.type] && dist < minPredatorDist) {
        predatorThreat = { dx, dy, dist };
        minPredatorDist = dist;
      } else if (other.type === this.type && dist > 0 && dist < this.radius * 3) {
        moveX -= dx / dist * 0.5;
        moveY -= dy / dist * 0.5;
      }
    }

    if (preyTarget) {
      moveX += (preyTarget.dx / preyTarget.dist) * aggressionRatio;
      moveY += (preyTarget.dy / preyTarget.dist) * aggressionRatio;
    }

    if (predatorThreat) {
      moveX -= (predatorThreat.dx / predatorThreat.dist) * (1 - aggressionRatio);
      moveY -= (predatorThreat.dy / predatorThreat.dist) * (1 - aggressionRatio);
    }

    moveX += (Math.random() - 0.5) * BASE_JITTER; // add some randomness to the movement to make the sim more organic
    moveY += (Math.random() - 0.5) * BASE_JITTER;

    const mag = Math.hypot(moveX, moveY);
    if (mag > 0) {
      const newDx = moveX / mag;
      const newDy = moveY / mag;
      const blend = 0.2;
      this.dx = (1 - blend) * this.dx + blend * newDx;
      this.dy = (1 - blend) * this.dy + blend * newDy;
    }
  }
}

const sprites = [];

// ===============================
// Sprite Utilities & Helpers
// ===============================

// Reset all sprites and game state
function resetSprites(count = 50) {
  sprites.length = 0;
  winner = null;

  for (let i = 0; i < count; i++) {
    sprites.push(new Sprite('rock', Math.random() * canvas.width, Math.random() * canvas.height));
    sprites.push(new Sprite('paper', Math.random() * canvas.width, Math.random() * canvas.height));
    sprites.push(new Sprite('scissors', Math.random() * canvas.width, Math.random() * canvas.height));
  }
}

// Adjust sprite count based on density slider - this method doesn't reset sprite positions for seemless transitions
function adjustSpriteCount(perTypeCount) {
  const desiredTotal = perTypeCount * 3;
  const currentTotal = sprites.length;

  if (currentTotal < desiredTotal) { // Add new sprites, evenly by type
    const toAdd = desiredTotal - currentTotal;
    const types = ['rock', 'paper', 'scissors'];
    for (let i = 0; i < toAdd; i++) {
      const type = types[i % 3];
      sprites.push(new Sprite(type, Math.random() * canvas.width, Math.random() * canvas.height));
    }
  } else if (currentTotal > desiredTotal) { // Remove random sprites to match desired count
    const toRemove = currentTotal - desiredTotal;
    for (let i = 0; i < toRemove; i++) {
      const index = Math.floor(Math.random() * sprites.length);
      sprites.splice(index, 1);
    }
  }
}

// Count sprites by type and display on canvas
function drawCounters() {
  const counts = { rock: 0, paper: 0, scissors: 0 };
  for (let sprite of sprites) {
    counts[sprite.type]++;
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `16px ${GAME_FONT_FAMILY}`;
  ctx.fillStyle = 'black';

  const spacing = 22;
  const iconSize = 24; // you can tweak this
  const marginLeft = 10;
  const textOffset = iconSize + 8;

  const types = ['rock', 'paper', 'scissors'];

  types.forEach((type, index) => {
    const y = spacing * (index + 1);
    const img = spriteImages[type];

    if (img && img.complete) {
      ctx.drawImage(img, marginLeft, y - iconSize / 2, iconSize, iconSize);
    }

    ctx.fillText(`${type[0].toUpperCase() + type.slice(1)}: ${counts[type]}`, marginLeft + textOffset, y);
  });
}

// Apply idle drift to sprites when no interaction
function applyIdleDrift(sprite) {
  sprite.dx += (Math.random() - 0.5) * 0.05;
  sprite.dy += (Math.random() - 0.5) * 0.05;

    // Clamp overall speed to prevent runaway drift
  const mag = Math.hypot(sprite.dx, sprite.dy);
  const maxIdleSpeed = 1; // or tweak as needed

  if (mag > maxIdleSpeed) {
    sprite.dx = (sprite.dx / mag) * maxIdleSpeed;
    sprite.dy = (sprite.dy / mag) * maxIdleSpeed;
  }
}

// ===============================
// Main Game Loop
// ===============================

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fpsMonitor.update();

  // Sprite logic (movement, drift, drawing)
  for (let sprite of sprites) {
    if (winner || !interactionEnabled) {
      applyIdleDrift(sprite);      
    } else {
      sprite.moveTowardPreyAndAvoidPredator(sprites);
    }

    sprite.update();
    sprite.draw();
  }

  // Handle collisions and conversions
  if (interactionEnabled) {
    for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        const a = sprites[i];
        const b = sprites[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (dist < a.radius + b.radius) {
          if (a.isPreyOf(b)) {
            a.convertTo(b.type);
          } else if (b.isPreyOf(a)) {
            b.convertTo(a.type);
          }
        }
      }
    }
  }

  // Collect data for charting
  let rockCount = 0;
  let paperCount = 0;
  let scissorsCount = 0;
  for (let sprite of sprites) {
    if (sprite.type === 'rock') rockCount++;
    else if (sprite.type === 'paper') paperCount++;
    else if (sprite.type === 'scissors') scissorsCount++;
  }
  fullGameData.push({
    timestamp: Date.now(),
    rock: rockCount,
    paper: paperCount,
    scissors: scissorsCount
    // Add Speed
    // Add Aggression
  });

  // Update sound mix based on counts
  if (!winner && interactionEnabled) {
    updateSoundMix(speedMultiplier, rockCount, paperCount, scissorsCount);
  }

  // Check for win
  const remainingTypes = new Set(sprites.map(s => s.type));
  if (remainingTypes.size === 1 && winner === null && !chartRendered) {
    winner = [...remainingTypes][0];
    window.winner = winner;
    chartRendered = true;
    playVictorySound();
    silenceSpriteLoops();
    renderChart(fullGameData, 'finalGraph');   // inline;
  }
  // Display overlays
  drawCounters();
  fpsMonitor.draw();

  requestAnimationFrame(loop);
}


// ===============================
// Reset Button Handler
// ===============================

document.getElementById('resetButton').addEventListener('click', () => {
  if (isFirstRun) {
    document.getElementById('controls').style.display = 'flex'; // show sliders
    document.getElementById('resetButton').textContent = '🔁 Restart';
    document.getElementById('resetButton').title = 'Restart the simulation';
    isFirstRun = false;
    interactionEnabled = true;
    startSimulation(); // enables interaction
    initSound(); // optional – only if you want sound on first button press
  }

  // Reset logic happens every time (including first)
  const speed = parseFloat(speedSlider.value);
  const aggression = parseInt(aggressionSlider.value);
  const count = getSpriteCountFromSlider();

  speedMultiplier = speed;
  updateAggressionRatioFromSlider();
  winner = null;
  chartRendered = false;

  if (window.currentChart) {
    window.currentChart.destroy();
    window.currentChart = null;
  }

  fullGameData.length = 0;

  const graphWrapper = document.getElementById('finalGraphWrapper');
  const graphCanvas = document.getElementById('finalGraph');
  if (graphWrapper && graphCanvas) {
    graphWrapper.style.opacity = '0';
    setTimeout(() => {
      graphWrapper.style.display = 'none';
      graphCanvas.width = graphCanvas.clientWidth;
      graphCanvas.height = graphCanvas.clientHeight;
      const ctx = graphCanvas.getContext('2d');
      ctx.clearRect(0, 0, graphCanvas.width, graphCanvas.height);
    }, 300);
  }

  resetSprites(count);
});

resetSprites(getSpriteCountFromSlider()); // spawn idle sprites
loop(); // begin passive animation

function startSimulation() {
  interactionEnabled = true;
}

document.getElementById('cycleMusicButton').addEventListener('click', async () => {
  const icon = await cycleBackgroundTrack();
  document.getElementById('cycleMusicButton').textContent = icon;
});

document.getElementById('cycleMusicButton').textContent = '🔈1';