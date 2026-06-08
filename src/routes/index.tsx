import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pháo Hoa — Lễ Hội Ánh Sáng" },
      { name: "description", content: "Màn trình diễn pháo hoa đẳng cấp thế giới ngay trong trình duyệt." },
      { property: "og:title", content: "Pháo Hoa — Lễ Hội Ánh Sáng" },
      { property: "og:description", content: "Màn trình diễn pháo hoa đẳng cấp thế giới ngay trong trình duyệt." },
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

type Rocket = {
  x: number; y: number; vx: number; vy: number;
  targetY: number; hue: number; type: ShellType; palette: number[];
};

type ShellType =
  | "peony" | "chrysanthemum" | "willow" | "ring" | "doubleRing"
  | "crossette" | "palm" | "strobe" | "spider"
  | "pistil" | "horsetail" | "kamuro" | "brocade" | "comet" | "ghost";

const SHELL_TYPES: ShellType[] = [
  "peony", "chrysanthemum", "willow", "ring", "doubleRing",
  "crossette", "palm", "strobe", "spider",
  "pistil", "horsetail", "kamuro", "brocade", "comet", "ghost",
];

// Modern, editorial palettes — restrained, cinematic, monochromatic-leaning
const PALETTES: number[][] = [
  [40, 35, 45],          // champagne / warm gold
  [210, 215, 220],       // ice blue
  [25, 15, 35],          // ember
  [180, 190, 170],       // jade mist
  [285, 295, 270],       // violet smoke
  [200, 40, 30],         // platinum + ember accent
  [220, 210, 50],        // arctic gold
  [330, 320, 0],         // rose noir
  [160, 180, 40],        // pistachio gold
  [0, 0, 50],            // pure white + gold
];
const pickPalette = () => PALETTES[Math.floor(Math.random() * PALETTES.length)];

function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [auto, setAuto] = useState(true);
  const [finale, setFinale] = useState(false);
  const autoRef = useRef(auto);
  const finaleRef = useRef(finale);
  useEffect(() => { autoRef.current = auto; }, [auto]);
  useEffect(() => { finaleRef.current = finale; }, [finale]);

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
    const rockets: Rocket[] = [];
    const stars: { x: number; y: number; r: number; tw: number }[] = [];
    for (let i = 0; i < 140; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.7, r: Math.random() * 1.2 + 0.2, tw: Math.random() * Math.PI * 2 });
    }

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const launch = (tx?: number, ty?: number, type?: ShellType, palette?: number[]) => {
      const sx = tx ?? rand(W * 0.1, W * 0.9);
      const sy = ty ?? rand(H * 0.08, H * 0.45);
      rockets.push({
        x: sx + rand(-30, 30),
        y: H + 10,
        vx: rand(-0.4, 0.4),
        vy: -Math.sqrt(2 * 0.12 * (H - sy)),
        targetY: sy,
        hue: (palette ?? pickPalette())[0],
        type: type ?? SHELL_TYPES[Math.floor(Math.random() * SHELL_TYPES.length)],
        palette: palette ?? pickPalette(),
      });
    };

    const pushParticle = (p: Particle) => particles.push(p);

    const burst = (x: number, y: number, palette: number[], type: ShellType) => {
      const pick = () => palette[Math.floor(Math.random() * palette.length)];

      // White-hot flash
      pushParticle({
        x, y, vx: 0, vy: 0, life: 0, maxLife: 12,
        hue: palette[0], sat: 100, lum: 100, size: 90, trail: false, gravity: 0, shimmer: false, drag: 1,
      });

      const baseParticle = (vx: number, vy: number, opts: Partial<Particle> = {}) => ({
        x, y, vx, vy,
        life: 0,
        maxLife: rand(70, 110),
        hue: pick(),
        sat: 100,
        lum: rand(55, 75),
        size: 2.2,
        trail: false,
        gravity: 0.035,
        shimmer: false,
        drag: 0.97,
        ...opts,
      } as Particle);

      switch (type) {
        case "peony": {
          for (let i = 0; i < 180; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s));
          }
          break;
        }
        case "chrysanthemum": {
          for (let i = 0; i < 200; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, { trail: true, maxLife: rand(110, 150) }));
          }
          break;
        }
        case "willow": {
          for (let i = 0; i < 140; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 3 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              maxLife: rand(160, 220), gravity: 0.05, drag: 0.985, trail: true, size: 1.6,
            }));
          }
          break;
        }
        case "ring": {
          for (let i = 0; i < 90; i++) {
            const a = (i / 90) * Math.PI * 2;
            const s = 5 + rand(-0.15, 0.15);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s));
          }
          break;
        }
        case "doubleRing": {
          for (let i = 0; i < 70; i++) {
            const a = (i / 70) * Math.PI * 2;
            pushParticle(baseParticle(Math.cos(a) * 3.2, Math.sin(a) * 3.2, { hue: palette[0] }));
            pushParticle(baseParticle(Math.cos(a) * 5.8, Math.sin(a) * 5.8, { hue: palette[1] ?? palette[0] }));
          }
          break;
        }
        case "crossette": {
          for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2;
            const s = 4.5;
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              maxLife: 40, trail: true,
              // mark to split via flag in size? Use shimmer=false; we re-burst inline below
            }));
          }
          // schedule split
          setTimeout(() => {
            for (const p of particles) {
              if (p.life > 0 && p.life < 5) continue;
            }
          }, 0);
          // simpler: emit immediate secondary stars from same origin in 8 dirs
          for (let j = 0; j < 8; j++) {
            const a = (j / 8) * Math.PI * 2;
            for (let k = 0; k < 12; k++) {
              const aa = a + rand(-0.3, 0.3);
              const s = rand(2, 4);
              pushParticle(baseParticle(Math.cos(aa) * s * 1.8, Math.sin(aa) * s * 1.8, { maxLife: rand(50, 80) }));
            }
          }
          break;
        }
        case "palm": {
          for (let i = 0; i < 14; i++) {
            const a = -Math.PI / 2 + rand(-0.55, 0.55);
            const s = rand(5.5, 8.5);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, maxLife: rand(120, 170), gravity: 0.05,
            }));
          }
          break;
        }
        case "strobe": {
          for (let i = 0; i < 140; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              shimmer: true, maxLife: rand(120, 180), drag: 0.99,
            }));
          }
          break;
        }
        case "comet": {
          // single arcing comet that leaves a long trail
          for (let i = 0; i < 8; i++) {
            const a = rand(0, Math.PI * 2);
            const s = rand(6, 9);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.04, drag: 0.985, maxLife: rand(140, 200), size: 2.6,
            }));
          }
          break;
        }
        case "ghost": {
          // delayed color shift: monochrome then bloom
          for (let i = 0; i < 160; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              sat: 0, lum: 90, maxLife: rand(110, 150), trail: true,
            }));
          }
          break;
        }
        case "spider": {
          for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2;
            const s = 7;
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              drag: 0.995, gravity: 0.02, maxLife: rand(80, 110),
            }));
          }
          break;
        }
        case "pistil": {
          // outer chrysanthemum + inner contrasting core
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
        }
        case "kamuro": {
          // already defined below — keep duplicate guard out
          for (let i = 0; i < 200; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 4 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              hue: 40, sat: 90, lum: 75, trail: true,
              gravity: 0.07, drag: 0.99, maxLife: rand(200, 260), size: 1.8,
            }));
          }
          break;
        }
        case "horsetail": {
          for (let i = 0; i < 80; i++) {
            const a = Math.PI / 2 + rand(-0.5, 0.5);
            const s = rand(3, 7);
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.06, maxLife: rand(130, 180),
            }));
          }
          break;
        }
        case "brocade": {
          for (let i = 0; i < 220; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 5.5 * Math.sqrt(Math.random());
            pushParticle(baseParticle(Math.cos(a) * s, Math.sin(a) * s, {
              trail: true, gravity: 0.045, maxLife: rand(140, 200), shimmer: Math.random() < 0.3,
            }));
          }
          break;
        }
      }
    };

    let last = performance.now();
    let autoTimer = 0;
    let finaleTimer = 0;

    const frame = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;

      // Background gradient sky
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#05060f");
      grad.addColorStop(0.6, "#0a0f24");
      grad.addColorStop(1, "#1a0b2e");
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        s.tw += 0.02;
        const a = 0.4 + Math.sin(s.tw) * 0.3;
        ctx.fillStyle = `rgba(255,255,240,${a})`;
        ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
      }

      // Distant city silhouette
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

      ctx.globalCompositeOperation = "lighter";

      // Auto launch
      autoTimer -= dt;
      if (autoRef.current && autoTimer <= 0) {
        const n = finaleRef.current ? 3 + Math.floor(Math.random() * 3) : 1;
        for (let i = 0; i < n; i++) launch();
        autoTimer = finaleRef.current ? rand(120, 260) : rand(550, 1100);
      }

      if (finaleRef.current) {
        finaleTimer += dt;
        if (finaleTimer > 8000) { setFinale(false); finaleTimer = 0; }
      }

      // Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * (dt / 16);
        r.y += r.vy * (dt / 16);
        r.vy += 0.06 * (dt / 16);

        // trail
        for (let k = 0; k < 2; k++) {
          particles.push({
            x: r.x + rand(-1, 1), y: r.y + rand(0, 4),
            vx: rand(-0.3, 0.3), vy: rand(0.5, 1.5),
            life: 0, maxLife: 20,
            hue: 40, sat: 100, lum: 75,
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

      // Particles
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
          // flash
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

        // glow
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lum}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.trail && Math.random() < 0.4) {
          particles.push({
            x: p.x, y: p.y, vx: 0, vy: 0,
            life: 0, maxLife: 25,
            hue: p.hue, sat: 80, lum: 70,
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

    // Initial salvo
    setTimeout(() => { launch(); }, 300);
    setTimeout(() => { launch(); }, 900);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center pt-8 text-center">
        <h1 className="text-4xl md:text-6xl font-light tracking-[0.3em] text-white/90 drop-shadow-[0_0_20px_rgba(255,200,120,0.5)]">
          PHÁO&nbsp;HOA
        </h1>
        <p className="mt-2 text-xs md:text-sm tracking-[0.4em] text-white/50 uppercase">
          Lễ hội ánh sáng · Bấm vào bầu trời
        </p>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <button
          onClick={() => setAuto(a => !a)}
          className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs tracking-widest uppercase text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:border-white/40"
        >
          {auto ? "Tạm dừng tự động" : "Bật tự động"}
        </button>
        <button
          onClick={() => setFinale(true)}
          className="rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-5 py-2 text-xs tracking-widest uppercase text-amber-100 backdrop-blur-md transition hover:from-amber-500/30 hover:to-rose-500/30"
        >
          ★ Màn Finale
        </button>
      </div>
    </div>
  );
}
