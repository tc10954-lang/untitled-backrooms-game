import { generateTextures } from './Textures.js';
import { AudioEngine } from './AudioEngine.js';
import { World, TILE_SIZE } from './World.js';
import { castLightCone } from './Raycaster.js';
import { SoundRippleManager } from './SoundRipple.js';
import { Monster } from './Monster.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const textures = generateTextures();
const audio = new AudioEngine();
const ripples = new SoundRippleManager();

let world = new World(45, 45);
let monsters = [];
let levelNum = 0;
let running = false;
let screenShake = 0;

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
  startNewGame();
});

function startNewGame() {
  levelNum = 0;
  world = new World(45, 45);
  resetPlayerForWorld();
  spawnMonsters(2 + levelNum);
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updateHUD();
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function resetPlayerForWorld() {
  player.x = world.spawn.x;
  player.y = world.spawn.y;
  player.hiding = false;
  ripples.ripples = [];
}

function spawnMonsters(count) {
  monsters = [];
  for (let i = 0; i < count; i++) {
    let mx, my;
    do {
      const gx = Math.floor(Math.random() * world.cols);
      const gy = Math.floor(Math.random() * world.rows);
      mx = (gx + 0.5) * TILE_SIZE;
      my = (gy + 0.5) * TILE_SIZE;
    } while (
      world.isWall(Math.floor(mx / TILE_SIZE), Math.floor(my / TILE_SIZE)) ||
      Math.hypot(mx - player.x, my - player.y) < 420
    );
    const type = i % 2 === 0 ? 'hound' : 'stalker';
    monsters.push(new Monster(mx, my, type));
  }
}

function emitPlayerNoise(radius) {
  ripples.emit(player.x, player.y, radius, 'rgba(230, 214, 138, 0.35)', false);
  for (const m of monsters) {
    m.hearSound(player.x, player.y, radius * 1.4);
  }
}

function handleInteract() {
  if (player.hiding) {
    player.hiding = false;
    emitPlayerNoise(90);
    return;
  }

  const gx = Math.floor(player.x / TILE_SIZE);
  const gy = Math.floor(player.y / TILE_SIZE);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = gx + dx;
      const ty = gy + dy;

      const breaker = world.breakers.find((b) => b.gx === tx && b.gy === ty && !b.active);
      if (breaker) {
        breaker.active = true;
        audio.playSwitch();
        emitPlayerNoise(360);
        updateHUD();
        return;
      }

      if (world.grid[ty]?.[tx] === 2) {
        player.hiding = true;
        player.x = (tx + 0.5) * TILE_SIZE;
        player.y = (ty + 0.5) * TILE_SIZE;
        return;
      }

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
  resetPlayerForWorld();
  player.battery = Math.min(100, player.battery + 35);
  spawnMonsters(2 + levelNum);
  updateHUD();
}
function triggerGameOver(killerType) {
  running = false;
  audio.playJumpscare();
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `
    <h1 style="color:#d92b2b;">YOU WERE TAKEN</h1>
    <p>Caught by ${killerType === 'hound' ? 'THE HOUND' : 'THE STALKER'} on LEVEL ${levelNum}</p>
    <p class="warn">Tip: Walk silently near Hounds. Shine your light directly at Stalkers.</p>
    <button id="retry-btn" style="margin-top:12px;padding:14px 28px;background:#242012;color:#e6d68a;border:2px solid #8c7f47;font-family:inherit;font-size:1.1rem;cursor:pointer;">TRY AGAIN</button>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('retry-btn').addEventListener('click', startNewGame);
}

function updateHUD() {
  const activeCount = world.breakers.filter((b) => b.active).length;
  document.getElementById('hud-level').textContent = `LEVEL ${levelNum}`;
  document.getElementById('hud-breakers').textContent = `${activeCount} / ${world.breakers.length}`;
  document.getElementById('hud-battery').textContent = `${Math.ceil(player.battery)}%`;
}

let lastTime = performance.now();
function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  player.angle = Math.atan2(mouse.y - cy, mouse.x - cx);

  player.battery = Math.max(5, player.battery - dt * 0.45);
  document.getElementById('hud-battery').textContent = `${Math.ceil(player.battery)}%`;

  ripples.update(dt);

  let closestDist = Infinity;
  for (const m of monsters) {
    const res = m.update(dt, world, player, ripples, audio);
    if (res.caught) {
      triggerGameOver(m.type);
      return;
    }
    if (res.dist < closestDist) closestDist = res.dist;
  }

  if (closestDist < 340) {
    const panic = 1 - closestDist / 340;
    screenShake = panic * 6;
    audio.heartTimer -= dt;
    if (audio.heartTimer <= 0) {
      audio.playHeartbeat(panic);
      audio.heartTimer = Math.max(0.24, 0.85 - panic * 0.6);
    }
  } else {
    screenShake = 0;
  }

  if (player.hiding) {
    document.getElementById('hud-prompt').textContent = '[HIDING IN LOCKER - PRESS E TO EXIT]';
    return;
  }

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
      emitPlayerNoise(sprinting ? 230 : 85);
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

  const shakeX = (Math.random() - 0.5) * screenShake;
  const shakeY = (Math.random() - 0.5) * screenShake;
  const camX = Math.floor(player.x - canvas.width / 2 + shakeX);
  const camY = Math.floor(player.y - canvas.height / 2 + shakeY);

  const maxDist = 240 + (player.battery / 100) * 260;
  const fov = player.hiding ? 0.35 : 0.95;
  const lightPoly = castLightCone(world, player.x, player.y, player.angle, fov, maxDist);

  ctx.save();
  ctx.translate(-camX, -camY);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(lightPoly[0].x, lightPoly[0].y);
  for (let i = 1; i < lightPoly.length; i++) {
    ctx.lineTo(lightPoly[i].x, lightPoly[i].y);
  }
  ctx.closePath();
  ctx.clip();

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

  for (const b of world.breakers) {
    const tex = b.active ? textures.breakerOn : textures.breakerOff;
    ctx.drawImage(tex, b.gx * TILE_SIZE, b.gy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  for (const m of monsters) {
    m.render(ctx, textures);
  }

  const grad = ctx.createRadialGradient(player.x, player.y, 15, player.x, player.y, maxDist);
  grad.addColorStop(0, 'rgba(255, 245, 200, 0.15)');
  grad.addColorStop(0.7, 'rgba(20, 18, 10, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(camX, camY, canvas.width, canvas.height);

  if (!player.hiding) {
    ctx.fillStyle = '#d9cfb8';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  ripples.render(ctx);

  ctx.restore();

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
