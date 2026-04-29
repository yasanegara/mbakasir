/**
 * Kumpulan efek suara menggunakan Web Audio API
 * Tidak butuh file audio eksternal — semua dibuat secara programatik
 */

function createAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioCtx();
  } catch {
    return null;
  }
}

/** 🔔 Beep singkat — untuk konfirmasi scan barcode */
export function playBeep() {
  const ctx = createAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, ctx.currentTime);
  osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.18);
}

/** 💰 Suara kasir — untuk konfirmasi pembayaran berhasil di POS */
export function playPaymentSuccess() {
  const ctx = createAudioContext();
  if (!ctx) return;

  // Dua nada naik: "ding-ding!" (seperti kasir sungguhan)
  const notes = [
    { freq: 880, start: 0, duration: 0.12 },
    { freq: 1320, start: 0.14, duration: 0.18 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.55, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  });
}

/** 🛍️ Suara notifikasi pesanan masuk — untuk Storefront */
export function playOrderReceived() {
  const ctx = createAudioContext();
  if (!ctx) return;

  // Tiga nada: "ding-dong-ding!" — mirip notifikasi toko online
  const notes = [
    { freq: 1047, start: 0,    duration: 0.15 },
    { freq: 784,  start: 0.18, duration: 0.15 },
    { freq: 1047, start: 0.36, duration: 0.22 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  });
}
