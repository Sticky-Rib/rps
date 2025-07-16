const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

class Sprite {
  constructor(type, x, y) {
    this.type = type; // 'rock', 'paper', or 'scissors'
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.color = this.getColor();
    this.speed = 1 + Math.random(); // Add some variation
    this.dx = Math.random() * 2 - 1; // Random direction
    this.dy = Math.random() * 2 - 1;
  }

  getColor() {
    switch (this.type) {
      case 'rock': return 'gray';
      case 'paper': return 'white';
      case 'scissors': return 'red';
    }
  }

update() {
  this.x += this.dx * this.speed;
  this.y += this.dy * this.speed;

  // Bounce off left/right
  if (this.x < this.radius) {
    this.x = this.radius;
    this.dx *= -1;
  } else if (this.x > canvas.width - this.radius) {
    this.x = canvas.width - this.radius;
    this.dx *= -1;
  }

  // Bounce off top/bottom
  if (this.y < this.radius) {
    this.y = this.radius;
    this.dy *= -1;
  } else if (this.y > canvas.height - this.radius) {
    this.y = canvas.height - this.radius;
    this.dy *= -1;
  }
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
  
  isPreyOf(other) {
  return (
    (this.type === 'rock' && other.type === 'paper') ||
    (this.type === 'paper' && other.type === 'scissors') ||
    (this.type === 'scissors' && other.type === 'rock')
  );
}

  convertTo(type) {
	this.type = type;
	this.color = this.getColor();
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

    // Seek prey
    if (other.type === preyOf[this.type] && dist < minPreyDist) {
      preyTarget = { dx, dy, dist };
      minPreyDist = dist;
    }

    // Avoid predator
    else if (other.type === predatorOf[this.type] && dist < minPredatorDist) {
      predatorThreat = { dx, dy, dist };
      minPredatorDist = dist;
    }

    // Repel from same-type neighbors if too close
    else if (other.type === this.type && dist > 0 && dist < this.radius * 3) {
      moveX -= dx / dist * 0.5;
      moveY -= dy / dist * 0.5;
    }
  }

  if (preyTarget) {
    moveX += (preyTarget.dx / preyTarget.dist) *0.55;
    moveY += (preyTarget.dy / preyTarget.dist) *0.55;
  }

  if (predatorThreat) {
    moveX -= (predatorThreat.dx / predatorThreat.dist) *0.45;
    moveY -= (predatorThreat.dy / predatorThreat.dist) *0.45;
  }

  // Add slight randomness to avoid looping behavior
  moveX += (Math.random() - 0.5) * 0.1;
  moveY += (Math.random() - 0.5) * 0.1;

  // Normalize and apply blended movement
  const mag = Math.hypot(moveX, moveY);
  if (mag > 0) {
    const newDx = moveX / mag;
    const newDy = moveY / mag;

    const blend = 0.2; // How fast it turns
    this.dx = (1 - blend) * this.dx + blend * newDx;
    this.dy = (1 - blend) * this.dy + blend * newDy;
  }
}
}

const sprites = [];

// Create 20 of each type
for (let i = 0; i < 20; i++) {
  sprites.push(new Sprite('rock', Math.random() * canvas.width, Math.random() * canvas.height));
  sprites.push(new Sprite('paper', Math.random() * canvas.width, Math.random() * canvas.height));
  sprites.push(new Sprite('scissors', Math.random() * canvas.width, Math.random() * canvas.height));
}

// Main animation loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update movement based on behavior
  for (let sprite of sprites) {
    sprite.moveTowardPreyAndAvoidPredator(sprites);
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

  // Move and draw
  for (let sprite of sprites) {
    sprite.update();
    sprite.draw();
  }

  requestAnimationFrame(loop);
}

loop(); // 🔥 Start the animation!