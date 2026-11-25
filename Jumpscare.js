export class JumpscareManager {
  constructor() {
    this.active = false;
    this.timer = 0;
    this.duration = 1.25;
    this.killerType = 'hound';
    this.onComplete = null;
  }

  trigger(killerType, audio, onComplete) {
    if (this.active) return;
    this.active = true;
    this.timer = 0;
    this.killerType = killerType;
    this.onComplete = onComplete;
    audio.playJumpscare();
  }

  update(dt) {
    if (!this.active) return false;
    this.timer += dt;
    if (this.timer >= this.duration) {
      this.active = false;
      if (this.onComplete) this.onComplete(this.killerType);
    }
    return true;
  }

  render(ctx, w, h) {
    if (!this.active) return;

    const progress = this.timer / this.duration;
    const flash = Math.floor(this.timer * 32) % 2 === 0;

    // Violent strobe background (blood red / pitch black / static white)
    ctx.fillStyle = flash ? '#3b0000' : '#030000';
    ctx.fillRect(0, 0, w, h);

    // Random horizontal glitch tear bars
    ctx.fillStyle = flash ? 'rgba(255, 255, 255, 0.22)' : 'rgba(220, 20, 20, 0.35)';
    for (let i = 0; i < 14; i++) {
      const gy = Math.random() * h;
      const gh = 4 + Math.random() * 28;
      ctx.fillRect(0, gy, w, gh);
    }

    // Lunge monster face aggressively toward screen
    const scale = 1.2 + Math.pow(progress, 0.45) * 3.8;
    const jitterX = (Math.random() - 0.5) * 65;
    const jitterY = (Math.random() - 0.5) * 65;

    ctx.save();
    ctx.translate(w / 2 + jitterX, h / 2 + jitterY);
    ctx.scale(scale, scale);

    if (this.killerType === 'hound') {
      this.drawHoundFace(ctx, flash);
    } else {
      this.drawStalkerFace(ctx, flash);
    }

    ctx.restore();
  }

  drawHoundFace(ctx, flash) {
    // Twisted gaunt skull silhouette
    ctx.fillStyle = '#080505';
    ctx.beginPath();
    ctx.ellipse(0, 0, 75, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Unhinged screaming red maw
    ctx.fillStyle = flash ? '#ff1e1e' : '#7a0000';
    ctx.beginPath();
    ctx.ellipse(0, 28, 42, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Jagged pixel teeth
    ctx.fillStyle = '#e8dec8';
    for (let x = -30; x <= 26; x += 11) {
      ctx.fillRect(x, -18, 6, 18 + Math.random() * 8);
      ctx.fillRect(x, 62, 6, 18 + Math.random() * 8);
    }

    // Hollow bleeding eye sockets
    ctx.fillStyle = '#000';
    ctx.fillRect(-36, -34, 22, 16);
    ctx.fillRect(14, -34, 22, 16);
  }

  drawStalkerFace(ctx, flash) {
    // Elongated pitch-black face
    ctx.fillStyle = '#020203';
    ctx.beginPath();
    ctx.ellipse(0, 0, 62, 115, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piercing dilated white eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-24, -22, 16, 0, Math.PI * 2);
    ctx.arc(24, -22, 16, 0, Math.PI * 2);
    ctx.fill();

    // Pinprick pupils locked onto player
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-24 + (Math.random() - 0.5) * 4, -22, 4, 0, Math.PI * 2);
    ctx.arc(24 + (Math.random() - 0.5) * 4, -22, 4, 0, Math.PI * 2);
    ctx.fill();

    // Wide uncanny grin
    ctx.strokeStyle = flash ? '#ffffff' : '#ff2a2a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 22, 44, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}
