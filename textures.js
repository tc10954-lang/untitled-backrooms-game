export function generateTextures() {
  const textures = {};

  // 1. Damp Yellow Carpet (16x16)
  textures.floor = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#8c7e44';
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Math.random();
        if (n < 0.25) {
          ctx.fillStyle = '#786b36';
          ctx.fillRect(x, y, 1, 1);
        } else if (n > 0.85) {
          ctx.fillStyle = '#9c8d4f';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // Subtle damp water stain
    ctx.fillStyle = 'rgba(45, 38, 18, 0.28)';
    ctx.fillRect(3, 4, 5, 4);
  });

  // 2. Backrooms Wallpaper Wall (16x16)
  textures.wall = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#c9b86b';
    ctx.fillRect(0, 0, 16, 16);
    // Vertical wallpaper stripes
    ctx.fillStyle = '#b5a358';
    for (let x = 0; x < 16; x += 4) {
      ctx.fillRect(x, 0, 2, 16);
    }
    // Dark baseboard trim
    ctx.fillStyle = '#4a3d24';
    ctx.fillRect(0, 13, 16, 3);
    ctx.fillStyle = '#2b2212';
    ctx.fillRect(0, 12, 16, 1);
  });

  // 3. Hiding Locker (16x16)
  textures.locker = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#4f5752';
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = '#363b38';
    ctx.fillRect(2, 2, 12, 12);
    // Vents
    ctx.fillStyle = '#181a19';
    ctx.fillRect(4, 4, 8, 1);
    ctx.fillRect(4, 6, 8, 1);
    ctx.fillRect(4, 8, 8, 1);
  });

  // 4. Breaker Switch Off / On
  textures.breakerOff = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#5c5952';
    ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#c9382a'; // Red indicator light
    ctx.fillRect(7, 4, 2, 2);
    ctx.fillStyle = '#1f1e1c';
    ctx.fillRect(6, 8, 4, 4);
  });

  textures.breakerOn = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#5c5952';
    ctx.fillRect(3, 2, 10, 12);
    ctx.fillStyle = '#4ce067'; // Green indicator light
    ctx.fillRect(7, 4, 2, 2);
    ctx.fillStyle = '#1f1e1c';
    ctx.fillRect(6, 7, 4, 4);
  });

  // 5. Exit Stairwell
  textures.exit = makePixelCanvas(16, 16, (ctx) => {
    ctx.fillStyle = '#12110e';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#2e2b24';
    for (let y = 2; y < 16; y += 3) {
      ctx.fillRect(2, y, 12, 2);
    }
  });

  return textures;
}

function makePixelCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  return c;
}
