export class SoundRippleManager {
  constructor() {
    this.ripples = [];
  }

  emit(x, y, maxRadius, color = 'rgba(230, 214, 138, 0.45)', isMonster = false) {
    this.ripples.push({
      x,
      y,
      radius: 6,
      maxRadius,
      color,
      isMonster,
      alpha: 0.85
    });
  }

  update(dt) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 180 * dt;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.lineWidth = 2;
    for (const r of this.ripples) {
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
