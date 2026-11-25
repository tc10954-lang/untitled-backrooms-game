import { TILE_SIZE } from './World.js';

export function castLightCone(world, originX, originY, angle, fov, maxDist, rayCount = 140) {
  const points = [{ x: originX, y: originY }];
  const startAngle = angle - fov / 2;
  const step = fov / rayCount;

  for (let i = 0; i <= rayCount; i++) {
    const rayAngle = startAngle + i * step;
    const hit = castSingleRay(world, originX, originY, rayAngle, maxDist);
    points.push(hit);
  }
  return points;
}

function castSingleRay(world, ox, oy, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const stepSize = 6;

  for (let dist = 0; dist < maxDist; dist += stepSize) {
    const px = ox + dx * dist;
    const py = oy + dy * dist;
    const gx = Math.floor(px / TILE_SIZE);
    const gy = Math.floor(py / TILE_SIZE);

    if (world.isWall(gx, gy)) {
      return { x: px, y: py };
    }
  }
  return { x: ox + dx * maxDist, y: oy + dy * maxDist };
}
