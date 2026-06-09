import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import boom1Asset from "@/assets/audio/boom1.mp3.asset.json";
import boom2Asset from "@/assets/audio/boom2.mp3.asset.json";
import boom3Asset from "@/assets/audio/boom3.mp3.asset.json";
import whistleAsset from "@/assets/audio/whistle.mp3.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pháo Hoa — Lễ Hội Ánh Sáng" },
      { name: "description", content: "Màn trình diễn pháo hoa đẳng cấp thế giới ngay trong trình duyệt." },
    ],
  }),
  component: Fireworks,
});


type Particle = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number;
  hue: number; sat: number; lum: number;
  size: number; trail: boolean; gravity: number;
  shimmer: boolean; drag: number;
};

type Smoke = {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; r: number; rot: number; vr: number;
  hue: number;
};

type Rocket = {
  x: number; y: number; vx: number; vy: number;
  targetY: number; hue: number; type: ShellType; palette: number[];
};

type ShellType =
  | "peony" | "chrysanthemum" | "willow" | "ring" | "doubleRing"
  | "crossette" | "palm" | "strobe" | "spider"
  | "pistil" | "horsetail" | "kamuro" | "brocade" | "comet" | "ghost"
  | "heart" | "smile" | "star";

// Common shells (frequent) vs fun shapes (rare)
const COMMON_SHELLS: ShellType[] = [
  "peony", "chrysanthemum", "willow", "ring", "doubleRing",
  "crossette", "palm", "strobe", "spider",
  "pistil", "horsetail", "kamuro", "brocade", "comet", "ghost",
];
const RARE_SHELLS: ShellType[] = ["heart", "smile", "star"];
const pickShellType = (): ShellType => {
  // ~12% chance of a fun shape
  if (Math.random() < 0.12) return RARE_SHELLS[Math.floor(Math.random() * RARE_SHELLS.length)];
  return COMMON_SHELLS[Math.floor(Math.random() * COMMON_SHELLS.length)];
};

const PALETTES: number[][] = [
  [40, 35, 45], [210, 215, 220], [25, 15, 35], [180, 190, 170],
  [285, 295, 270], [200, 40, 30], [220, 210, 50], [330, 320, 0],
  [160, 180, 40], [0, 0, 50],
];
const pickPalette = () => PALETTES[Math.floor(Math.random() * PALETTES.length)];

type SkyOption = { id: string; label: string; url: string | null };
const SKIES: SkyOption[] = [
  { id: "night", label: "Đêm sao", url: null },
  { id: "halong", label: "Hạ Long đêm", url: "https://images.unsplash.com/photo-1573270689103-d7a4e42b609a?w=1920&q=80" },
  { id: "eiffel", label: "Paris đêm", url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80" },
  { id: "nyc", label: "New York đêm", url: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1920&q=80" },
  { id: "sydney", label: "Sydney đêm", url: "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80" },
  { id: "tokyo", label: "Tokyo đêm", url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80" },
  { id: "saigon", label: "Sài Gòn đêm", url: "https://images.unsplash.com/photo-1583417267826-aebc4d1542e1?w=1920&q=80" },
];


function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [auto, setAuto] = useState(true);
  const [muted, setMuted] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [sky, setSky] = useState<SkyOption>(SKIES[0]);
  const [skyMenu, setSkyMenu] = useState(false);

  const autoRef = useRef(auto);
  const mutedRef = useRef(muted);
  const skyImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { autoRef.current = auto; }, [auto]);

  // Load sky image
  useEffect(() => {
    if (!sky.url) { skyImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sky.url;
    img.onload = () => { skyImgRef.current = img; };
  }, [sky]);

  // ESC exits immersive mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && immersive) setImmersive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [immersive]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const smokes: Smoke[] = [];
    const rockets: Rocket[] = [];
    const stars: { x: number; y: number; r: number; tw: number }[] = [];
    for (let i = 0; i < 140; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.2 + 0.2, tw: Math.random() * Math.PI * 2 });
    }

    // ===== Audio =====
    let actx: AudioContext | null = null;
    let masterGain: GainNode | null = null;
    let convolver: ConvolverNode | null = null;
    let noiseBuffer: AudioBuffer | null = null;

    const ensureAudio = () => {
      if (actx) return actx;
      const Ctx = (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!Ctx) return null;
      actx = new Ctx();
      masterGain = actx.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(actx.destination);

      // Simple synthetic reverb (impulse response)
      const irLen = actx.sampleRate * 2.2;
      const ir = actx.createBuffer(2, irLen, actx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < irLen; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5);
        }
      }
      convolver = actx.createConvolver();
      convolver.buffer = ir;
      const wet = actx.createGain();
      wet.gain.value = 0.35;
      convolver.connect(wet).connect(masterGain);

      const len = actx.sampleRate * 2;
      noiseBuffer = actx.createBuffer(1, len, actx.sampleRate);
      const ch = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      return actx;
    };

    const playLaunchSound = (pan = 0) => {
      if (mutedRef.current) return;
      const ac = ensureAudio();
      if (!ac || !masterGain || !noiseBuffer) return;
      const t = ac.currentTime;
      const panner = ac.createStereoPanner();
      panner.pan.value = pan;
      // Whistle = filtered noise + descending osc
      const src = ac.createBufferSource();
      src.buffer = noiseBuffer;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 14;
      bp.frequency.setValueAtTime(1800, t);
      bp.frequency.exponentialRampToValueAtTime(500, t + 1.1);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      src.connect(bp).connect(g).connect(panner).connect(masterGain);
      src.start(t);
      src.stop(t + 1.3);
    };

    // More realistic boom: sharp transient + low rumble + crackle tail + reverb
    const playBoomSound = (intensity = 1, pan = 0) => {
      if (mutedRef.current) return;
      const ac = ensureAudio();
      if (!ac || !masterGain || !noiseBuffer || !convolver) return;
      const t = ac.currentTime;
      const panner = ac.createStereoPanner();
      panner.pan.value = pan;
      const dryBus = ac.createGain();
      dryBus.gain.value = 1;
      dryBus.connect(panner).connect(masterGain);
      const wetSend = ac.createGain();
      wetSend.gain.value = 0.6;
      wetSend.connect(convolver);

      // 1. Sharp transient — short burst of full-spectrum noise, very fast attack
      const transient = ac.createBufferSource();
      transient.buffer = noiseBuffer;
      const trHp = ac.createBiquadFilter();
      trHp.type = "highpass";
      trHp.frequency.value = 200;
      const trG = ac.createGain();
      trG.gain.setValueAtTime(0.0001, t);
      trG.gain.linearRampToValueAtTime(1.4 * intensity, t + 0.005);
      trG.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      transient.connect(trHp).connect(trG);
      trG.connect(dryBus);
      trG.connect(wetSend);
      transient.start(t);
      transient.stop(t + 0.25);

      // 2. Body rumble — lowpassed noise, slower decay
      const body = ac.createBufferSource();
      body.buffer = noiseBuffer;
      const bodyLp = ac.createBiquadFilter();
      bodyLp.type = "lowpass";
      bodyLp.frequency.setValueAtTime(500, t);
      bodyLp.frequency.exponentialRampToValueAtTime(90, t + 1.0);
      const bodyG = ac.createGain();
      bodyG.gain.setValueAtTime(0.0001, t);
      bodyG.gain.linearRampToValueAtTime(1.0 * intensity, t + 0.03);
      bodyG.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      body.connect(bodyLp).connect(bodyG);
      bodyG.connect(dryBus);
      bodyG.connect(wetSend);
      body.start(t);
      body.stop(t + 1.5);

      // 3. Sub thump
      const sub = ac.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(35, t + 0.6);
      const sg = ac.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.linearRampToValueAtTime(0.9 * intensity, t + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      sub.connect(sg).connect(dryBus);
      sub.start(t);
      sub.stop(t + 0.9);

      // 4. Crackle tail — sparse high-freq noise bursts
      for (let i = 0; i < 5; i++) {
        const dt = 0.2 + Math.random() * 1.2;
        const c = ac.createBufferSource();
        c.buffer = noiseBuffer;
        const hp = ac.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 3000;
        const cg = ac.createGain();
        cg.gain.setValueAtTime(0.0001, t + dt);
        cg.gain.linearRampToValueAtTime(0.08 * intensity, t + dt + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.15);
        c.connect(hp).connect(cg).connect(dryBus);
        c.start(t + dt);
        c.stop(t + dt + 0.2);
      }
    };

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const launch = (tx?: number, ty?: number, type?: ShellType, palette?: number[]) => {
      const sx = tx ?? rand(W * 0.1, W * 0.9);
      const sy = ty ?? rand(H * 0.08, H * 0.45);
      const pal = palette ?? pickPalette();
      rockets.push({
        x: sx + rand(-30, 30),
        y: H + 10,
        vx: rand(-0.4, 0.4),
        vy: -Math.sqrt(2 * 0.12 * (H - sy)),
        targetY: sy,
        hue: pal[0],
        type: type ?? pickShellType(),
        palette: pal,
      });
      playLaunchSound(W > 0 ? (sx / W) * 2 - 1 : 0);
    };

    const pushParticle = (p: Particle) => particles.push(p);

    const burst = (x: number, y: number, palette: number[], type: ShellType) => {
      const pick = () => palette[Math.floor(Math.random() * palette.length)];
      const pan = W > 0 ? (x / W) * 2 - 1 : 0;
      const intensity = type === "kamuro" || type === "brocade" ? 1.1 : type === "strobe" || type === "ghost" ? 0.7 : 0.95;
      playBoomSound(intensity, pan);

      const smokeCount = type === "willow" || type === "kamuro" ? 18 : 12;
      for (let i = 0; i < smokeCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.3, 1.6);
        smokes.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.2,
          life: 0, maxLife: rand(180, 280),
          r: rand(28, 60), rot: Math.random() * Math.PI * 2,
          vr: rand(-0.01, 0.01), hue: palette[0],
        });
      }

      pushParticle({
        x, y, vx: 0, vy: 0, life: 0, maxLife: 12,
        hue: palette[0], sat: 100, lum: 100, size: 90, trail: false, gravity: 0, shimmer: false, drag: 1,
      });

      const baseParticle = (vx: number, vy: number, opts: Partial<Particle> = {}) => ({
        x, y, vx, vy, life: 0, maxLife: rand(70, 110),
        hue: pick(), sat: 100, lum: rand(55, 75),
        size: 2.2, trail: false, gravity: 0.035,
        shimmer: false, drag: 0.97, ...opts,
      } as Particle);

      switch (type) {
        case "peony":
          for (let i = 0; i < 180; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s));
          }
          break;
        case "chrysanthemum":
          for (let i = 0; i < 200; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, { trail: true, maxLife: rand(110, 150) }));
          }
          break;
        case "willow":
          for (let i = 0; i < 140; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 3 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              maxLife: rand(160, 220), gravity: 0.05, drag: 0.985, trail: true, size: 1.6,
            }));
          }
          break;
        case "ring":
          for (let i = 0; i < 90; i++) {
            const a = (i / 90) * Math.PI * 2;
            const s = 5 + rand(-0.15, 0.15);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s));
          }
          break;
        case "doubleRing":
          for (let i = 0; i < 70; i++) {
            const a = (i / 70) * Math.PI * 2;
            pushParticle(baseParticle(Math.cos(a) * 3.2, Math.sin(a) * 3.2, { hue: palette[0] }));
            pushParticle(baseParticle(Math.cos(a) * 5.8, Math.sin(a) * 5.8, { hue: palette[1] ?? palette[0] }));
          }
          break;
        case "crossette":
          for (let j = 0; j < 8; j++) {
            const a = (j / 8) * Math.PI * 2;
            for (let k = 0; k < 12; k++) {
              const aa = a + rand(-0.3, 0.3);
              const s = rand(2, 4);
              pushParticle(baseParticle(Math.cos(aa) * s * 1.8, Math.sin(aa) * s * 1.8, { maxLife: rand(50, 80) }));
            }
          }
          break;
        case "palm":
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI / 2 + rand(-0.55, 0.55);
            const s = rand(5.5, 8.5);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, maxLife: rand(120, 170), gravity: 0.05,
            }));
          }
          break;
        case "strobe":
          for (let i = 0; i < 140; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              shimmer: true, maxLife: rand(120, 180), drag: 0.99,
            }));
          }
          break;
        case "comet":
          for (let i = 0; i < 8; i++) {
            const a = rand(0, Math.PI * 2);
            const s = rand(6, 9);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.04, drag: 0.985, maxLife: rand(140, 200), size: 2.6,
            }));
          }
          break;
        case "ghost":
          for (let i = 0; i < 160; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              sat: 0, lum: 90, maxLife: rand(110, 150), trail: true,
            }));
          }
          break;
        case "spider":
          for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2;
            const s = 7;
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              drag: 0.995, gravity: 0.02, maxLife: rand(80, 110),
            }));
          }
          break;
        case "pistil":
          for (let i = 0; i < 160; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, { trail: true, hue: palette[0] }));
          }
          for (let i = 0; i < 70; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 2.2 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              hue: palette[1] ?? (palette[0] + 180) % 360, lum: 70, maxLife: rand(60, 90),
            }));
          }
          break;
        case "kamuro":
          for (let i = 0; i < 200; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              hue: 40, sat: 90, lum: 75, trail: true,
              gravity: 0.07, drag: 0.99, maxLife: rand(200, 260), size: 1.8,
            }));
          }
          break;
        case "horsetail":
          for (let i = 0; i < 80; i++) {
            const a = Math.PI / 2 + rand(-0.5, 0.5);
            const s = rand(3, 7);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.06, maxLife: rand(130, 180),
            }));
          }
          break;
        case "brocade":
          for (let i = 0; i < 220; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.045, maxLife: rand(140, 200), shimmer: Math.random() < 0.3,
            }));
          }
          break;
        case "heart": {
          const N = 160;
          const scale = 0.35;
          for (let i = 0; i < N; i++) {
            const t = (i / N) * Math.PI * 2;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            pushParticle(baseParticle(hx * scale, hy * scale, {
              hue: 350, sat: 90, lum: 65, trail: true, maxLife: rand(110, 150), gravity: 0.025,
            }));
          }
          break;
        }
        case "smile": {
          // Face outline
          for (let i = 0; i < 80; i++) {
            const a = (i / 80) * Math.PI * 2;
            const s = 5.5;
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              hue: 50, sat: 100, lum: 70, trail: true, maxLife: rand(110, 150),
            }));
          }
          // Eyes (offset positions via initial velocity from center)
          for (const ex of [-2, 2]) {
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * Math.PI * 2;
              const r = 0.6;
              pushParticle(baseParticle(ex + Math.cos(a) * r, -1.8 + Math.sin(a) * r, {
                hue: 50, sat: 100, lum: 80, maxLife: rand(90, 130),
              }));
            }
          }
          // Mouth arc
          for (let i = 0; i < 40; i++) {
            const a = Math.PI * (0.15 + (i / 40) * 0.7);
            const r = 2.8;
            pushParticle(baseParticle(Math.cos(a) * r, Math.sin(a) * r + 0.5, {
              hue: 50, sat: 100, lum: 75, trail: true, maxLife: rand(100, 140),
            }));
          }
          break;
        }
        case "star": {
          // 5-pointed star outline
          const points = 5;
          const outer = 5.5, inner = 2.2;
          const total = 100;
          for (let i = 0; i < total; i++) {
            const tt = (i / total) * points * 2;
            const seg = Math.floor(tt);
            const f = tt - seg;
            const a1 = (seg / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const a2 = ((seg + 1) / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const r1 = seg % 2 === 0 ? outer : inner;
            const r2 = seg % 2 === 0 ? inner : outer;
            const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1;
            const x2 = Math.cos(a2) * r2, y2 = Math.sin(a2) * r2;
            const vx = x1 + (x2 - x1) * f;
            const vy = y1 + (y2 - y1) * f;
            pushParticle(baseParticle(vx, vy, {
              hue: palette[0], sat: 100, lum: 75, trail: true, maxLife: rand(110, 150), gravity: 0.025,
            }));
          }
          break;
        }
      }
    };

    let last = performance.now();
    let autoTimer = 0;

    const frame = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;

      // Background: sky image or gradient
      const img = skyImgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        // cover-fit
        const ir = img.naturalWidth / img.naturalHeight;
        const cr = W / H;
        let dw = W, dh = H, dx = 0, dy = 0;
        if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; }
        else { dw = W; dh = W / ir; dy = (H - dh) / 2; }
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, dx, dy, dw, dh);
        // Darken overlay so fireworks pop
        ctx.fillStyle = "rgba(5,5,15,0.55)";
        ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#05060f");
        grad.addColorStop(0.6, "#0a0f24");
        grad.addColorStop(1, "#1a0b2e");
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillRect(0, 0, W, H);
        for (const s of stars) {
          s.tw += 0.02;
          const a = 0.4 + Math.sin(s.tw) * 0.3;
          ctx.fillStyle = `rgba(255,255,240,${a})`;
          ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
        }
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.moveTo(0, H);
        const seg = 40;
        for (let i = 0; i <= seg; i++) {
          const x = (i / seg) * W;
          const h = 30 + ((Math.sin(i * 1.7) + Math.sin(i * 0.7)) * 12) + (i % 3 === 0 ? 20 : 0);
          ctx.lineTo(x, H - h);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }

      // Smoke
      for (let i = smokes.length - 1; i >= 0; i--) {
        const s = smokes[i];
        s.life += dt / 16;
        s.x += s.vx * (dt / 16);
        s.y += s.vy * (dt / 16);
        s.vx *= 0.985;
        s.vy = s.vy * 0.985 - 0.008;
        s.rot += s.vr * (dt / 16);
        const tt = s.life / s.maxLife;
        if (tt >= 1) { smokes.splice(i, 1); continue; }
        const radius = s.r * (0.6 + tt * 1.6);
        const fade = tt < 0.15 ? tt / 0.15 : 1 - (tt - 0.15) / 0.85;
        const alpha = Math.max(0, fade) * 0.18;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
        g.addColorStop(0, `hsla(${s.hue}, 25%, 75%, ${alpha})`);
        g.addColorStop(0.5, `hsla(${s.hue}, 15%, 45%, ${alpha * 0.5})`);
        g.addColorStop(1, `hsla(${s.hue}, 10%, 20%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";

      autoTimer -= dt;
      if (autoRef.current && autoTimer <= 0) {
        launch();
        autoTimer = rand(550, 1100);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * (dt / 16);
        r.y += r.vy * (dt / 16);
        r.vy += 0.06 * (dt / 16);
        for (let k = 0; k < 2; k++) {
          particles.push({
            x: r.x + rand(-1, 1), y: r.y + rand(0, 4),
            vx: rand(-0.3, 0.3), vy: rand(0.5, 1.5),
            life: 0, maxLife: 20, hue: 40, sat: 100, lum: 75,
            size: 1.4, trail: false, gravity: 0, shimmer: false, drag: 0.94,
          });
        }
        ctx.fillStyle = `hsl(${r.hue}, 100%, 80%)`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -0.5 || r.y <= r.targetY) {
          burst(r.x, r.y, r.palette, r.type);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt / 16;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity * (dt / 16);
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        const t = p.life / p.maxLife;
        if (t >= 1) { particles.splice(i, 1); continue; }
        let alpha = 1 - t;
        if (p.shimmer) alpha *= Math.random() < 0.5 ? 0.2 : 1;
        if (p.size > 10) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1 - t));
          g.addColorStop(0, `hsla(${p.hue}, 100%, 95%, ${alpha})`);
          g.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${alpha * 0.5})`);
          g.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t), 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lum}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        if (p.trail && Math.random() < 0.4) {
          particles.push({
            x: p.x, y: p.y, vx: 0, vy: 0,
            life: 0, maxLife: 25, hue: p.hue, sat: 80, lum: 70,
            size: 1, trail: false, gravity: 0.01, shimmer: false, drag: 0.96,
          });
        }
      }

      requestAnimationFrame(frame);
    };

    const id = requestAnimationFrame(frame);

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      launch(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener("click", onClick);

    setTimeout(() => { launch(); }, 300);
    setTimeout(() => { launch(); }, 900);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  const enterImmersive = () => {
    setAuto(true);
    setImmersive(true);
    setSkyMenu(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />

      {!immersive && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-8 text-center">
            <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] text-white/90 drop-shadow-[0_0_20px_rgba(255,200,120,0.5)]">
              PHÁO&nbsp;HOA
            </h1>
            <p className="mt-2 text-xs md:text-sm tracking-[0.4em] text-white/50 uppercase">
              Lễ hội ánh sáng · Bấm vào bầu trời
            </p>
          </div>

          {/* Sky selector top-right */}
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setSkyMenu(s => !s)}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs tracking-widest uppercase text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:border-white/40"
            >
              ⛰ {sky.label}
            </button>
            {skyMenu && (
              <div className="mt-2 w-56 rounded-xl border border-white/10 bg-black/70 backdrop-blur-xl p-2 shadow-2xl">
                {SKIES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSky(s); setSkyMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wider uppercase transition ${
                      sky.id === s.id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => setAuto(a => !a)}
              className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs tracking-widest uppercase text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:border-white/40"
            >
              {auto ? "Tạm dừng tự động" : "Bật tự động"}
            </button>
            <button
              onClick={() => setMuted(m => !m)}
              className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs tracking-widest uppercase text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:border-white/40"
            >
              {muted ? "♪ Bật âm" : "♪ Tắt âm"}
            </button>
            <button
              onClick={enterImmersive}
              className="rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-5 py-2 text-xs tracking-widest uppercase text-amber-100 backdrop-blur-md transition hover:from-amber-500/30 hover:to-rose-500/30"
            >
              ▶ Bắn tự động · Toàn màn hình
            </button>
          </div>
        </>
      )}

      {immersive && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.4em] uppercase text-white/30">
          Nhấn ESC để thoát
        </div>
      )}
    </div>
  );
}
