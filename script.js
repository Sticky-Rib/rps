const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let winner = null;
let speedMultiplier = 1;

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

const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

speedSlider.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value);
  speedValue.textContent = `${speedMultiplier.toFixed(1)}x`;
});

let aggressionRatio = 0.6; // initial 60% attack

const aggressionSlider = document.getElementById('aggressionSlider');
const aggressionValue = document.getElementById('aggressionValue');

aggressionSlider.addEventListener('input', () => {
  const sliderValue = parseInt(aggressionSlider.value); // 0–100
  aggressionValue.textContent = `${sliderValue}%`;

  // Map 0–100 slider value to aggression from 0 (defense) to 1 (attack)
  // Then blend into a 0.0–1.0 range where 50% is 0.6 aggression
  const ratio = sliderValue / 100;
  aggressionRatio = 0.4 + (0.6 - 0.4) * ratio; // 0.4–0.6 scaling
});

class Sprite {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.speed = 2 + Math.random() * 2;
    this.dx = Math.random() * 2 - 1;
    this.dy = Math.random() * 2 - 1;
    this.targetX = null;
    this.targetY = null;
    this.movingToTarget = false;
  }

  draw() {
    ctx.font = '20px Arial';
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

  update() {
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

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.movingToTarget = true;
  }

  moveToTarget() {
    if (!this.movingToTarget || this.targetX === null || this.targetY === null) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 1) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.movingToTarget = false;
      return;
    }

    const speed = 2;
    this.x += (dx / dist) * speed;
    this.y += (dy / dist) * speed;
  }

  moveTowardPreyAndAvoidPredator(others) {
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

    moveX += (Math.random() - 0.5) * 0.1;
    moveY += (Math.random() - 0.5) * 0.1;

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
for (let i = 0; i < 20; i++) {
  sprites.push(new Sprite('rock', Math.random() * canvas.width, Math.random() * canvas.height));
  sprites.push(new Sprite('paper', Math.random() * canvas.width, Math.random() * canvas.height));
  sprites.push(new Sprite('scissors', Math.random() * canvas.width, Math.random() * canvas.height));
}

function drawCounters() {
  const counts = { rock: 0, paper: 0, scissors: 0 };
  for (let sprite of sprites) {
    counts[sprite.type]++;
  }
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`🪨 Rock: ${counts.rock}`, 10, 20);
  ctx.fillText(`📄 Paper: ${counts.paper}`, 10, 40);
  ctx.fillText(`✂️ Scissors: ${counts.scissors}`, 10, 60);
}

const winPattern = [
  // W
  [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
  [1,7],
  [2,6],
  [3,5],
  [4,6],
  [5,7],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],

  // I
  [8,0],[9,0],[10,0],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[8,8],[9,8],[10,8],

  // N
  [12,0],[12,1],[12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[12,8],
  [13,1],
  [14,2],
  [15,3],
  [16,4],
  [17,5],
  [18,6],
  [19,7],
  [20,8],
  [20,0],[20,1],[20,2],[20,3],[20,4],[20,5],[20,6],[20,7],[20,8],
];

function arrangeVictoryPattern(type) {
  const spacing = 14;
  const startX = canvas.width / 2 - 10 * spacing;
  const startY = canvas.height / 2 - 4 * spacing;

  const winningSprites = sprites.filter(s => s.type === type);

  for (let i = 0; i < winPattern.length && i < winningSprites.length; i++) {
    const [px, py] = winPattern[i];
    const sprite = winningSprites[i];
    const targetX = startX + px * spacing;
    const targetY = startY + py * spacing;
    sprite.setTarget(targetX, targetY);
  }

  // Overflow sprites = float around the letters
  for (let i = winPattern.length; i < winningSprites.length; i++) {
    const sprite = winningSprites[i];
    const targetX = startX + Math.random() * spacing * 22;
    const targetY = startY + Math.random() * spacing * 10;
    sprite.setTarget(targetX, targetY);
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!winner) {
    for (let sprite of sprites) {
      sprite.moveTowardPreyAndAvoidPredator(sprites);
      sprite.update();
    }

    // Handle collisions and conversions
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

    // Check for win
    const remainingTypes = new Set(sprites.map(s => s.type));
    if (remainingTypes.size === 1) {
      winner = [...remainingTypes][0];
      arrangeVictoryPattern(winner);
    }
  }

  // Either animate victory or regular draw
  for (let sprite of sprites) {
    if (winner) {
      sprite.moveToTarget();
    }
    sprite.draw();
  }

  drawCounters();

  if (winner) {
    ctx.fillStyle = 'black';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner.toUpperCase()} WINS! 🎉`, canvas.width / 2, 80);
  }

  requestAnimationFrame(loop);
}

document.getElementById('resetButton').addEventListener('click', () => {
  // Reset sliders to default values
  speedSlider.value = 1;
  speedValue.textContent = '1.0x';
  speedMultiplier = 1;

  aggressionSlider.value = 50;
  aggressionValue.textContent = '50%';
  aggressionRatio = 0.6;

  // Reset simulation state
  sprites.length = 0;
  winner = null;

  for (let i = 0; i < 20; i++) {
    sprites.push(new Sprite('rock', Math.random() * canvas.width, Math.random() * canvas.height));
    sprites.push(new Sprite('paper', Math.random() * canvas.width, Math.random() * canvas.height));
    sprites.push(new Sprite('scissors', Math.random() * canvas.width, Math.random() * canvas.height));
  }
});

loop();