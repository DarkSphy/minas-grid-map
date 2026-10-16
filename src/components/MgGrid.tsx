import { useEffect, useRef, useState } from "react";

const CELL_M = 500;
const M_PER_DEG_LAT = 110574;

type Grid = {
  cols: number;
  rows: number;
  mask: Uint8Array;
  maskCanvas: HTMLCanvasElement;
  minLon: number;
  maxLat: number;
  mPerDegLon: number;
  total: number;
};

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function buildGrid(): Promise<Grid> {
  const geo = await fetch("/data/mg.json").then((r) => r.json());
  const g = geo.features[0].geometry;
  const polys: number[][][][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  for (const p of polys) for (const ring of p) for (const [x, y] of ring) {
    minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x);
    minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y);
  }
  const lat0 = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const mPerDegLon = 111320 * Math.cos(lat0);
  const cols = Math.ceil(((maxLon - minLon) * mPerDegLon) / CELL_M);
  const rows = Math.ceil(((maxLat - minLat) * M_PER_DEG_LAT) / CELL_M);

  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = css("--cell") || "green";
  ctx.beginPath();
  for (const p of polys) for (const ring of p) {
    ring.forEach(([x, y], i) => {
      const px = ((x - minLon) * mPerDegLon) / CELL_M;
      const py = ((maxLat - y) * M_PER_DEG_LAT) / CELL_M;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
  }
  ctx.fill("evenodd");
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const mask = new Uint8Array(cols * rows);
  let total = 0;
  for (let i = 0; i < mask.length; i++) if (data[i * 4 + 3] > 127) { mask[i] = 1; total++; }
  return { cols, rows, mask, maskCanvas: c, minLon, maxLat, mPerDegLon, total };
}

export function MgGrid() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const view = useRef({ scale: 1, ox: 0, oy: 0 });
  const hover = useRef<{ c: number; r: number } | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; c: number; r: number; lat: number; lon: number } | null>(null);

  useEffect(() => { buildGrid().then(setGrid); }, []);

  useEffect(() => {
    if (!grid || !canvas.current || !wrap.current) return;
    const cv = canvas.current, el = wrap.current;
    const ctx = cv.getContext("2d")!;
    const colors = { line: css("--grid-line"), hl: css("--cell-hover"), border: css("--foreground") };

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { scale: s, ox, oy } = view.current;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(grid.maskCanvas, ox, oy, grid.cols * s, grid.rows * s);
      if (s >= 6) {
        const c0 = Math.max(0, Math.floor(-ox / s)), c1 = Math.min(grid.cols, Math.ceil((w - ox) / s));
        const r0 = Math.max(0, Math.floor(-oy / s)), r1 = Math.min(grid.rows, Math.ceil((h - oy) / s));
        ctx.fillStyle = colors.line;
        for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
          if (!grid.mask[r * grid.cols + c]) continue;
          const x = ox + c * s, y = oy + r * s;
          ctx.fillRect(x, y, s, 1); ctx.fillRect(x, y, 1, s);
        }
      }
      const hv = hover.current;
      if (hv) {
        const sz = Math.max(s, 4);
        const x = ox + hv.c * s + s / 2 - sz / 2, y = oy + hv.r * s + s / 2 - sz / 2;
        ctx.fillStyle = colors.hl; ctx.fillRect(x, y, sz, sz);
        ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, sz, sz);
      }
    };

    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const s = Math.min(w / grid.cols, h / grid.rows) * 0.94;
      view.current = { scale: s, ox: (w - grid.cols * s) / 2, oy: (h - grid.rows * s) / 2 };
      draw();
    };
    fit();

    let drag: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (drag) {
        view.current.ox += mx - drag.x; view.current.oy += my - drag.y;
        drag = { x: mx, y: my };
      }
      const { scale: s, ox, oy } = view.current;
      const c = Math.floor((mx - ox) / s), r = Math.floor((my - oy) / s);
      if (c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.mask[r * grid.cols + c]) {
        hover.current = { c, r };
        const lon = grid.minLon + ((c + 0.5) * CELL_M) / grid.mPerDegLon;
        const lat = grid.maxLat - ((r + 0.5) * CELL_M) / M_PER_DEG_LAT;
        setTip({ x: mx, y: my, c, r, lat, lon });
      } else { hover.current = null; setTip(null); }
      draw();
    };
    const onDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => { drag = null; };
    const onLeave = () => { hover.current = null; setTip(null); draw(); };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const v = view.current;
      const ns = Math.min(60, Math.max(0.1, v.scale * Math.exp(-e.deltaY * 0.0015)));
      v.ox = mx - ((mx - v.ox) * ns) / v.scale;
      v.oy = my - ((my - v.oy) * ns) / v.scale;
      v.scale = ns;
      draw();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, [grid]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {grid ? `${grid.total.toLocaleString("pt-BR")} quadrados · ${grid.cols}×${grid.rows} grade · 500 m × 500 m` : "Carregando malha…"}
        </span>
        <span>Role para zoom · arraste para mover</span>
      </div>
      <div ref={wrap} className="relative flex-1 cursor-crosshair touch-none overflow-hidden rounded-xl border bg-card">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md bg-popover px-2.5 py-1.5 font-mono text-xs text-popover-foreground shadow-lg"
            style={{ left: tip.x + 14, top: tip.y + 14 }}
          >
            <div className="font-semibold">ID {tip.c}-{tip.r}</div>
            <div>{tip.lat.toFixed(5)}, {tip.lon.toFixed(5)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
