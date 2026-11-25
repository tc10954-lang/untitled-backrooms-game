export const TILE_SIZE = 48;

export class World {
  constructor(cols = 45, rows = 45) {
    this.cols = cols;
    this.rows = rows;
    // 0 = floor, 1 = wall, 2 = locker, 3 = exit
    this.grid = Array.from({ length: rows }, () => Array(cols).fill(1));
    this.breakers = [];
    this.spawn = { x: 0, y: 0 };
    this.exitPos = { x: 0, y: 0 };
    this.generate();
  }

  generate() {
    const rooms = [];
    const roomAttempts = 65;

    for (let i = 0; i < roomAttempts; i++) {
      const w = this.randInt(4, 8);
      const h = this.randInt(4, 8);
      const x = this.randInt(2, this.cols - w - 2);
      const y = this.randInt(2, this.rows - h - 2);

      const newRoom = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
      if (rooms.some((r) => this.overlaps(r, newRoom))) continue;

      this.carveRoom(newRoom);

      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        this.carveCorridor(prev.cx, prev.cy, newRoom.cx, newRoom.cy);
      }
      rooms.push(newRoom);
    }

    // Set Player Spawn in first room
    this.spawn = {
      x: (rooms[0].cx + 0.5) * TILE_SIZE,
      y: (rooms[0].cy + 0.5) * TILE_SIZE
    };

    // Set Exit in furthest room
    const lastRoom = rooms[rooms.length - 1];
    this.grid[lastRoom.cy][lastRoom.cx] = 3;
    this.exitPos = { x: lastRoom.cx, y: lastRoom.cy };

    // Place 3 Breaker Switches in middle rooms
    const step = Math.floor((rooms.length - 2) / 3);
    for (let i = 1; i <= 3; i++) {
      const r = rooms[Math.min(i * step, rooms.length - 2)];
      this.breakers.push({ gx: r.cx, gy: r.cy, active: false });
    }

    // Scatter hiding lockers in random rooms
    for (let i = 1; i < rooms.length - 1; i++) {
      if (Math.random() < 0.65) {
        const r = rooms[i];
        const lx = r.x + 1;
        const ly = r.y + 1;
        if (this.grid[ly][lx] === 0 && !this.breakers.some((b) => b.gx === lx && b.gy === ly)) {
          this.grid[ly][lx] = 2;
        }
      }
    }
  }

  carveRoom(r) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        this.grid[y][x] = 0;
      }
    }
  }

  carveCorridor(x1, y1, x2, y2) {
    let x = x1;
    let y = y1;
    while (x !== x2) {
      this.grid[y][x] = 0;
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      this.grid[y][x] = 0;
      y += y < y2 ? 1 : -1;
    }
  }

  overlaps(a, b) {
    return a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x && a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y;
  }

  isWall(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return true;
    return this.grid[gy][gx] === 1;
  }

  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
