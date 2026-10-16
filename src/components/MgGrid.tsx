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
  muns: Mun[];
};

type Mun = { name: string; path: Path2D; rings: [number, number][][]; cx: number; cy: number; bw: number; bh: number; x0: number; y0: number; x1: number; y1: number };

function inRings(rings: [number, number][][], x: number, y: number) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function buildGrid(): Promise<Grid> {
  const geo = await fetch("/data/mg.json").then((r) => r.json());
  const g = geo.features[0].geometry;
  const polys: [number, number][][][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
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
  for (let i = 0; i < mask.length; i++) if (data[i * 4 + 3]! > 127) { mask[i] = 1; total++; }
  const raw: { n: string; g: { type: string; coordinates: any } }[] = await fetch("/data/mg-mun.json").then((r) => r.json());
  const muns: Mun[] = raw.map(({ n, g }) => {
    const ps: [number, number][][][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const path = new Path2D();
    const rings: [number, number][][] = [];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ax = 0, ay = 0, aa = 0;
    for (const p of ps) p.forEach((ring, ri) => {
      const pr = ring.map(([x, y]) => [((x - minLon) * mPerDegLon) / CELL_M, ((maxLat - y) * M_PER_DEG_LAT) / CELL_M] as [number, number]);
      rings.push(pr);
      pr.forEach(([x, y], i) => {
        i ? path.lineTo(x, y) : path.moveTo(x, y);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        if (ri === 0) { const [nx, ny] = pr[(i + 1) % pr.length]!; const cr = x * ny - nx * y; aa += cr; ax += (x + nx) * cr; ay += (y + ny) * cr; }
      });
      path.closePath();
    });
    const cx = aa ? ax / (3 * aa) : (x0 + x1) / 2, cy = aa ? ay / (3 * aa) : (y0 + y1) / 2;
    return { name: n, path, rings, cx, cy, bw: x1 - x0, bh: y1 - y0, x0, y0, x1, y1 };
  });
  return { cols, rows, mask, maskCanvas: c, minLon, maxLat, mPerDegLon, total, muns };
}

export function MgGrid() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const view = useRef({ scale: 1, ox: 0, oy: 0 });
  const hover = useRef<{ c: number; r: number } | null>(null);
  const hoverMun = useRef<Mun | null>(null);
  const focusMun = useRef<Mun | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; c: number; r: number; lat: number; lon: number; mun?: string | undefined } | null>(null);

  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const results = grid && query.trim()
    ? grid.muns.filter((m) => norm(m.name).includes(norm(query.trim()))).slice(0, 10)
    : [];

  const flyTo = (m: Mun) => {
    const el = wrap.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    const s = Math.min(60, Math.max(0.1, Math.min(w / (m.bw * 1.6), h / (m.bh * 1.6))));
    view.current = { scale: s, ox: w / 2 - m.cx * s, oy: h / 2 - m.cy * s };
    focusMun.current = m;
    setOpen(false);
    setQuery(m.name);
    drawRef.current();
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => { buildGrid().then(setGrid); }, []);

  useEffect(() => {
    if (!grid || !canvas.current || !wrap.current) return;
    const cv = canvas.current, el = wrap.current;
    const ctx = cv.getContext("2d")!;
    const colors = { line: css("--grid-line"), hl: css("--cell-hover"), border: css("--foreground"), mun: css("--mun-line"), label: css("--foreground"), halo: css("--card") };

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
      // municipal borders
      ctx.save();
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      ctx.strokeStyle = colors.mun; ctx.lineWidth = 1 / s; ctx.lineJoin = "round";
      for (const m of grid.muns) {
        if (ox + m.x1 * s < 0 || ox + m.x0 * s > w || oy + m.y1 * s < 0 || oy + m.y0 * s > h) continue;
        ctx.stroke(m.path);
      }
      if (hoverMun.current) { ctx.lineWidth = 2.5 / s; ctx.strokeStyle = colors.border; ctx.stroke(hoverMun.current.path); }
      if (focusMun.current && focusMun.current !== hoverMun.current) { ctx.lineWidth = 3 / s; ctx.strokeStyle = colors.border; ctx.stroke(focusMun.current.path); }
      ctx.restore();
      if (focusMun.current && focusMun.current !== hoverMun.current) {
        const fx = ox + focusMun.current.cx * s, fy = oy + focusMun.current.cy * s;
        if (fx > -60 && fy > -20 && fx < w + 60 && fy < h + 20) {
          ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.lineWidth = 3; ctx.strokeStyle = colors.halo; ctx.fillStyle = colors.label;
          ctx.strokeText(focusMun.current.name, fx, fy); ctx.fillText(focusMun.current.name, fx, fy);
        }
      }
      // labels (only if they fit, no overlap)
      ctx.font = "500 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 3; ctx.strokeStyle = colors.halo; ctx.fillStyle = colors.label;
      const placed: [number, number, number, number][] = [];
      const order = [...grid.muns].sort((a, b) => b.bw * b.bh - a.bw * a.bh);
      for (const m of order) {
        const x = ox + m.cx * s, y = oy + m.cy * s;
        if (x < -50 || y < -20 || x > w + 50 || y > h + 20) continue;
        const tw = ctx.measureText(m.name).width;
        if (tw > m.bw * s * 0.9 || 14 > m.bh * s * 0.6) continue;
        const b: [number, number, number, number] = [x - tw / 2 - 2, y - 8, x + tw / 2 + 2, y + 8];
        if (placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1])) continue;
        placed.push(b);
        ctx.strokeText(m.name, x, y); ctx.fillText(m.name, x, y);
      }
      const hv = hover.current;
      if (hv) {
        const sz = Math.max(s, 4);
        const x = ox + hv.c * s + s / 2 - sz / 2, y = oy + hv.r * s + s / 2 - sz / 2;
        ctx.fillStyle = colors.hl; ctx.fillRect(x, y, sz, sz);
        ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, sz, sz);
      }
    };
    drawRef.current = draw;

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
        const gx = (mx - ox) / s, gy = (my - oy) / s;
        const m = grid.muns.find((m) => gx >= m.x0 && gx <= m.x1 && gy >= m.y0 && gy <= m.y1 && inRings(m.rings, gx, gy)) ?? null;
        hoverMun.current = m;
        setTip({ x: mx, y: my, c, r, lat, lon, mun: m?.name });
      } else { hover.current = null; hoverMun.current = null; setTip(null); }
      draw();
    };
    const onDown = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      drag = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => { drag = null; };
    const onLeave = () => { hover.current = null; hoverMun.current = null; setTip(null); draw(); };
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
        <div
          ref={boxRef}
          className="absolute left-3 top-3 z-20 w-64 max-w-[calc(100%-1.5rem)]"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 rounded-md border bg-popover px-2.5 py-1.5 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-muted-foreground">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" && results[0]) flyTo(results[0]); if (e.key === "Escape") setOpen(false); }}
              placeholder="Buscar município…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setOpen(false); focusMun.current = null; drawRef.current(); }}
                aria-label="Limpar busca"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {open && query.trim() && (
            <div className="mt-1 max-h-64 overflow-auto rounded-md border bg-popover py-1 shadow-lg">
              {results.length === 0 ? (
                <div className="px-2.5 py-1.5 text-sm text-muted-foreground">Nenhum município encontrado</div>
              ) : (
                results.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => flyTo(m)}
                    className="block w-full px-2.5 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {m.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md bg-popover px-2.5 py-1.5 font-mono text-xs text-popover-foreground shadow-lg"
            style={{ left: tip.x + 14, top: tip.y + 14 }}
          >
            {tip.mun && <div className="font-sans font-semibold">{tip.mun}</div>}
            <div className="font-semibold">ID {tip.c}-{tip.r}</div>
            <div>{tip.lat.toFixed(5)}, {tip.lon.toFixed(5)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
