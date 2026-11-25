import { TILE_SIZE } from './World.js';

export class Monster {
  constructor(x, y, type = 'hound') {
    this.x = x;
    this.y = y;
    this.type = type; // 'hound' (hears sound) or 'stalker' (freezes in light)
    this.radius = 14;
    this.state = 'patrol'; // 'patrol', 'investigate', 'chase', 'stunned'
    this.targetX = x;
    this.targetY = y;
    this.stunTimer = 0;
    this.stepTimer = 0;
    this.angle = Math.random() * Math.PI * 2;
  }

  hearSound(sx, sy, soundRadius) {
    const dist = Math.hypot(this.x - sx, this.y - sy);
    if (dist <= soundRadius && this.state !== 'chase') {
      this.state = 'investigate';
      this.targetX = sx;
      this.targetY = sy;
    }
  }

  update(dt, world, player, ripples, audio) {
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    // Check if player's flashlight cone is hitting this monster
    const inLight = this.isLitByFlashlight(world, player, distToPlayer);

    if (this.type === 'stalker' && inLight && !player.hiding) {
      this.stunTimer = 0.25;
      this.state = 'stunned';
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return { caught: false, dist: distToPlayer };
    }

    // Line-of-sight detection (Stalker sees in dark; Hound only spots if very close & not hiding)
    const canSeePlayer =
      !player.hiding &&
      this.hasLineOfSight(world, player.x, player.y) &&
      (this.type === 'stalker' ? distToPlayer < 320 : distToPlayer < 110);

    if (canSeePlayer) {
      this.state = 'chase';
      this.targetX = player.x;
      this.targetY = player.y;
    } else if (this.state === 'chase') {
      // Lost sight, investigate last known position
      this.state = 'investigate';
    }

    // Determine movement speed by state
    let speed = 65;
    if (this.state === 'investigate') speed = 115;
    if (this.state === 'chase') speed = this.type === 'hound' ? 195 : 165;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget < 14) {
      this.pickNewPatrolPoint(world);
      this.state = 'patrol';
    } else {
      this.angle = Math.atan2(dy, dx);
      const vx = (dx / distToTarget) * speed * dt;
      const vy = (dy / distToTarget) * speed * dt;
      this.moveWithCollision(world, vx, vy);

      // Emit heavy monster footsteps (visible through walls as red ripples!)
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        const rippleSize = this.state === 'chase' ? 240 : 140;
        ripples.emit(this.x, this.y, rippleSize, 'rgba(210, 50, 45, 0.65)', true);
        if (distToPlayer < 450) {
          audio.playMonsterStep(1 - distToPlayer / 450);
        }
        this.stepTimer = this.state === 'chase' ? 0.26 : 0.55;
      }
    }

    // Catch check
    if (!player.hiding && distToPlayer < this.radius + player.radius) {
      return { caught: true, dist: distToPlayer };
    }

    return { caught: false, dist: distToPlayer };
  }

  isLitByFlashlight(world, player, dist) {
    const maxDist = 240 + (player.battery / 100) * 260;
    if (dist > maxDist) return false;

    const angleToMonster = Math.atan2(this.y - player.y, this.x - player.x);
    let diff = angleToMonster - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const fov = player.hiding ? 0.35 : 0.95;
    if (Math.abs(diff) > fov / 2) return false;

    return this.hasLineOfSight(world, player.x, player.y);
  }

  hasLineOfSight(world, tx, ty) {
    const dist = Math.hypot(tx - this.x, ty - this.y);
    const steps = Math.floor(dist / 12);
    for (let i = 1; i < steps; i++) {
      const px = this.x + ((tx - this.x) * i) / steps;
      const py = this.y + ((ty - this.y) * i) / steps;
      if (world.isWall(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE))) {
        return false;
      }
    }
    return true;
  }

  pickNewPatrolPoint(world) {
    for (let i = 0; i < 20; i++) {
      const gx = Math.floor(Math.random() * world.cols);
      const gy = Math.floor(Math.random() * world.rows);
      if (!world.isWall(gx, gy)) {
        this.targetX = (gx + 0.5) * TILE_SIZE;
        this.targetY = (gy + 0.5) * TILE_SIZE;
        return;
      }
    }
  }

  moveWithCollision(world, vx, vy) {
    if (!this.collides(world, this.x + vx, this.y)) this.x += vx;
    if (!this.collides(world, this.x, this.y + vy)) this.y += vy;
  }

  collides(world, px, py) {
    const r = this.radius;
    const corners = [
      [px - r, py - r],
      [px + r, py - r],
      [px - r, py + r],
      [px + r, py + r]
    ];
    return corners.some(([x, y]) => world.isWall(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)));
  }

  render(ctx, textures) {
    const tex = this.type === 'hound' ? textures.hound : textures.stalker;
    ctx.drawImage(tex, this.x - 20, this.y - 20, 40, 40);
  }
}
