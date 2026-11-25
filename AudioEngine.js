export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.humGain = null;
    this.stepTimer = 0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // 60Hz Fluorescent Light Hum
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.humGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 60;

    filter.type = 'lowpass';
    filter.frequency.value = 140;

    this.humGain.gain.value = 0.045;

    osc.connect(filter);
    filter.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);
    osc.start();
  }

  playFootstep(sprinting) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sprinting ? 95 : 70, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.09);

    gain.gain.setValueAtTime(sprinting ? 0.14 : 0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playSwitch() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(440, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }
}
