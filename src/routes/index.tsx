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
  targetY: number; hue: number; type: ShellType;
};

type ShellType =
  | "peony" | "chrysanthemum" | "willow" | "ring" | "crossette"
  | "palm" | "strobe" | "heart" | "spider" | "doubleRing"
  | "pistil" | "rainbow" | "horsetail" | "kamuro" | "brocade";

const SHELL_TYPES: ShellType[] = [
  "peony", "chrysanthemum", "willow", "ring", "crossette",
  "palm", "strobe", "heart", "spider", "doubleRing",
  "pistil", "rainbow", "horsetail", "kamuro", "brocade",
];

// Vibrant palettes — picked per shell for multi-color bursts
const PALETTES: number[][] = [
  [0, 30, 50],          // fire: red/orange/gold
  [200, 230, 280],      // ocean: cyan/blue/violet
  [120, 160, 60],       // emerald/lime/gold
  [320, 340, 20],       // rose/magenta/coral
  [270, 300, 200],      // purple/pink/cyan
  [50, 180, 320],       // gold/teal/magenta (tricolor)
  [0, 120, 240],        // RGB primary
  [15, 45, 350],        // sunset
  [180, 210, 330],      // aurora
  [60, 90, 150],        // chartreuse/mint/sea
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

    const launch = (tx?: number, ty?: number, type?: ShellType, hue?: number) => {
      const sx = tx ?? rand(W * 0.15, W * 0.85);
      const sy = ty ?? rand(H * 0.1, H * 0.45);
      rockets.push({
        x: sx + rand(-30, 30),
        y: H + 10,
        vx: rand(-0.4, 0.4),
        vy: -Math.sqrt(2 * 0.12 * (H - sy)),
        targetY: sy,
        hue: hue ?? Math.floor(rand(0, 360)),
        type: type ?? SHELL_TYPES[Math.floor(Math.random() * SHELL_TYPES.length)],
      });
    };

    const burst = (x: number, y: number, hue: number, type: ShellType) => {
      const count = type === "willow" ? 140 : type === "ring" ? 80 : type === "palm" ? 60 : 180;
      const baseSpeed =
        type === "willow" ? 3 :
        type === "palm" ? 6 :
        type === "ring" ? 5 :
        type === "chrysanthemum" ? 5.5 :
        type === "strobe" ? 4 : 5;

      // Flash
      particles.push({
        x, y, vx: 0, vy: 0, life: 0, maxLife: 10,
        hue, sat: 100, lum: 100, size: 80, trail: false, gravity: 0, shimmer: false, drag: 1,
      });

      for (let i = 0; i < count; i++) {
        let vx: number, vy: number, speed: number;
        const angle = (i / count) * Math.PI * 2 + rand(-0.02, 0.02);

        if (type === "ring") {
          speed = baseSpeed + rand(-0.2, 0.2);
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        } else if (type === "palm") {
          if (i > 12) continue;
          const a = -Math.PI / 2 + rand(-0.6, 0.6);
          speed = rand(5, 8);
          vx = Math.cos(a) * speed;
          vy = Math.sin(a) * speed;
        } else {
          speed = baseSpeed * Math.sqrt(Math.random());
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        }

        const isWillow = type === "willow";
        const isStrobe = type === "strobe";
        const isCross = type === "crossette";
        const isChry = type === "chrysanthemum";

        particles.push({
          x, y, vx, vy,
          life: 0,
          maxLife: isWillow ? rand(140, 200) : isChry ? rand(110, 150) : rand(70, 110),
          hue: hue + rand(-10, 10),
          sat: 100,
          lum: rand(55, 75),
          size: isWillow ? 1.6 : 2.2,
          trail: isChry || isWillow || type === "palm",
          gravity: isWillow ? 0.05 : 0.035,
          shimmer: isStrobe,
          drag: isWillow ? 0.985 : 0.97,
        });

        if (isCross && i % 6 === 0) {
          // schedule crossette split via marker (handled by life check below)
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
          burst(r.x, r.y, r.hue, r.type);
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
