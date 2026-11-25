import { generateTextures } from './Textures.js';
import { AudioEngine } from './AudioEngine.js';
import { World, TILE_SIZE } from './World.js';
import { castLightCone } from './Raycaster.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const textures = generateTextures();
const audio = new AudioEngine();

let world = new World(45, 45);
let levelNum = 0;
let running = false;

const player = {
  x: world.spawn.x,
  y: world.spawn.y,
  radius: 12,
  angle: 0,
  battery: 100,
  hiding: false
};

const keys = {};
const mouse = { x: 0, y: 0 };

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && running) handleInteract();
});
window.addEventListener('keyup', (e) => (keys[e.code] = false));
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

document.getElementById('start-btn').addEventListener('click', () => {
  audio.init();
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  running = true;
  requestAnimationFrame(loop);
});

function handleInteract() {
  if (player.hiding) {
    player.hiding = false;
    return;
  }

  const gx = Math.floor(player.x / TILE_SIZE);
  const gy = Math.floor(player.y / TILE_SIZE);

  // Check nearby tiles (3x3 around player)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = gx + dx;
      const ty = gy + dy;

      // Flip Breaker Switch
      const breaker = world.breakers.find((b) => b.gx === tx && b.gy === ty && !b.active);
      if (breaker) {
        breaker.active = true;
        audio.playSwitch();
        updateHUD();
        return;
      }

      // Hide in Locker
      if (world.grid[ty]?.[tx] === 2) {
        player.hiding = true;
        player.x = (tx + 0.5) * TILE_SIZE;
        player.y = (ty + 0.5) * TILE_SIZE;
        return;
      }

      // Descend Exit if all breakers active
      if (world.grid[ty]?.[tx] === 3) {
        const activeCount = world.breakers.filter((b) => b.active).length;
        if (activeCount === world.breakers.length) {
          nextLevel();
          return;
        }
      }
    }
  }
}

function nextLevel() {
  levelNum++;
  audio.playSwitch();
  world = new World(48 + levelNum * 4, 48 + levelNum * 4);
  player.x = world.spawn.x;
  player.y = world.spawn.y;
  player.battery = Math.min(100, player.battery + 35);
  updateHUD();
}

function updateHUD() {
  const activeCount = world.breakers.filter((b) => b.active).length;
  document.getElementById('hud-level').textContent = `LEVEL ${levelNum}`;
  document.getElementById('hud-breakers').textContent = `${activeCount} / ${world.breakers.length}`;
  document.getElementById('hud-battery').textContent = `${Math.ceil(player.battery)}%`;
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (!running) return;

  // Aim flashlight toward cursor
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  player.angle = Math.atan2(mouse.y - cy, mouse.x - cx);

  // Drain battery slowly
  player.battery = Math.max(5, player.battery - dt * 0.45);
  document.getElementById('hud-battery').textContent = `${Math.ceil(player.battery)}%`;

  if (player.hiding) {
    document.getElementById('hud-prompt').textContent = '[HIDING IN LOCKER - PRESS E TO EXIT]';
    return;
  }

  // Movement
  let vx = 0;
  let vy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) vy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) vy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) vx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) vx += 1;

  const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
  const speed = sprinting ? 210 : 125;

  if (vx !== 0 || vy !== 0) {
    const len = Math.hypot(vx, vy);
    vx = (vx / len) * speed * dt;
    vy = (vy / len) * speed * dt;

    moveWithCollision(vx, vy);

    audio.stepTimer -= dt;
    if (audio.stepTimer <= 0) {
      audio.playFootstep(sprinting);
      audio.stepTimer = sprinting ? 0.28 : 0.46;
    }
  }

  checkPrompts();
}

function moveWithCollision(vx, vy) {
  const nextX = player.x + vx;
  if (!collides(nextX, player.y)) player.x = nextX;

  const nextY = player.y + vy;
  if (!collides(player.x, nextY)) player.y = nextY;
}

function collides(px, py) {
  const r = player.radius;
  const corners = [
    [px - r, py - r],
    [px + r, py - r],
    [px - r, py + r],
    [px + r, py + r]
  ];
  return corners.some(([x, y]) => world.isWall(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)));
}

function checkPrompts() {
  const gx = Math.floor(player.x / TILE_SIZE);
  const gy = Math.floor(player.y / TILE_SIZE);
  let prompt = '';

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = gx + dx;
      const ty = gy + dy;
      if (world.breakers.some((b) => b.gx === tx && b.gy === ty && !b.active)) {
        prompt = '[E] FLIP BREAKER SWITCH';
      } else if (world.grid[ty]?.[tx] === 2) {
        prompt = '[E] HIDE IN LOCKER';
      } else if (world.grid[ty]?.[tx] === 3) {
        const ready = world.breakers.every((b) => b.active);
        prompt = ready ? '[E] DESCEND TO NEXT LEVEL' : '[EXIT LOCKED - POWER ALL 3 BREAKERS]';
      }
    }
  }
  document.getElementById('hud-prompt').textContent = prompt;
}

function render() {
  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camX = Math.floor(player.x - canvas.width / 2);
  const camY = Math.floor(player.y - canvas.height / 2);

  // Flashlight range scales with battery
  const maxDist = 240 + (player.battery / 100) * 260;
  const fov = player.hiding ? 0.35 : 0.95;
  const lightPoly = castLightCone(world, player.x, player.y, player.angle, fov, maxDist);

  ctx.save();
  ctx.translate(-camX, -camY);

  // Clip world rendering strictly inside the raycasted flashlight polygon
  ctx.beginPath();
  ctx.moveTo(lightPoly[0].x, lightPoly[0].y);
  for (let i = 1; i < lightPoly.length; i++) {
    ctx.lineTo(lightPoly[i].x, lightPoly[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Draw visible tiles
  const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
  const endCol = Math.min(world.cols - 1, Math.ceil((camX + canvas.width) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
  const endRow = Math.min(world.rows - 1, Math.ceil((camY + canvas.height) / TILE_SIZE));

  for (let y = startRow; y <= endRow; y++) {
    for (let x = startCol; x <= endCol; x++) {
      const tile = world.grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile === 1) {
        ctx.drawImage(textures.wall, px, py, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.drawImage(textures.floor, px, py, TILE_SIZE, TILE_SIZE);
        if (tile === 2) ctx.drawImage(textures.locker, px, py, TILE_SIZE, TILE_SIZE);
        if (tile === 3) ctx.drawImage(textures.exit, px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw Breaker Switches
  for (const b of world.breakers) {
    const tex = b.active ? textures.breakerOn : textures.breakerOff;
    ctx.drawImage(tex, b.gx * TILE_SIZE, b.gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  // Flashlight radial falloff gradient
  const grad = ctx.createRadialGradient(player.x, player.y, 15, player.x, player.y, maxDist);
  grad.addColorStop(0, 'rgba(255, 245, 200, 0.15)');
  grad.addColorStop(0.7, 'rgba(20, 18, 10, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(camX, camY, canvas.width, canvas.height);

  // Draw Player
  if (!player.hiding) {
    ctx.fillStyle = '#d9cfb8';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Tiny ambient self-glow so player isn't 100% blind in tight corners
  const selfGlow = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    5,
    canvas.width / 2,
    canvas.height / 2,
    55
  );
  selfGlow.addColorStop(0, 'rgba(230, 214, 138, 0.08)');
  selfGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = selfGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
