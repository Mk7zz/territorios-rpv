import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { ridgePath } from '../../components/CityWorld';
import { GuideSprite, Pixels, treeRuns, type DayTime } from '../../components/Scene';
import { addPoints, getFound, saveFound, say, sfx } from '../../lib/cidade';
import { POMBA, POMBA_CLIPS } from '../../lib/vozes';
import { fromAscii, outline, seeded, shade, toRuns, type Run } from '../../lib/pixel';

/*
 * Peças comuns das cenas dos pontos focais (Ponte Metálica, Museu Energisa...), no mesmo jeito da
 * Praça Santa Rita: câmera 2.5D (arrastar, olhar com o mouse, balanço leve), céu com sol/lua e
 * estrelas, serras com os bairros nos morros, nuvens e passarinhos, borboletas e vagalumes,
 * partículas, o painel de descobertas e a pomba que dá dicas.
 * Cada cena desenha o próprio cenário da frente e chama estas peças.
 */

export const W = 320;
export const H = 112;
/** Margem desenhada além dos lados, para telas muito largas e baixas. */
export const EDGE = 170;
/** Largura mínima visível da cena (em pixels do desenho), mesmo em celular de pé. */
export const MIN_W = 130;
export const INK = '#1b2b33';
export const BONUS = 10;
/** Quanto a câmera "olha em volta" seguindo o mouse (em pixels do desenho). */
const LOOK = { x: 8, y: 3 };
/** Profundidade de cada camada: 1 = chão; menor = mais longe (anda menos com a câmera). */
export const DEPTH = { sky: 0.08, clouds: 0.18, far: 0.35, near: 0.55, mid: 0.8 };
export const SKY: Record<DayTime, [string, string]> = { day: ['#3d8ee0', '#bfe6f5'], dusk: ['#c96aa0', '#f6b26b'], night: ['#0b1730', '#24405a'] };

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
let next = 1;
export const uid = () => next++;

/**
 * Tamanho da área da cena. A cena ocupa a tela toda, mas a parte de baixo fica atrás do quadro de
 * perguntas (altura em --quiz-h): a câmera enquadra o que fica acima dele, e o chão do lugar
 * continua por baixo do quadro (por isso os chãos são desenhados até GROUND_END).
 */
export function boxSize(el: HTMLElement) {
  const pad = parseFloat(getComputedStyle(el).getPropertyValue('--quiz-h')) || 0;
  return { w: el.clientWidth, h: Math.max(1, el.clientHeight - pad), pad };
}
/** Até onde os chãos são desenhados, para continuarem por baixo do quadro de perguntas. */
export const GROUND_END = H + 90;

/** Faixa larga que cobre a cena inteira (fundos e filtros de cor). */
export const FULL = { x: -EDGE - 300, w: W + 2 * EDGE + 600 };

/* ---- Descobertas ---- */

export interface Discovery {
  key: string;
  emoji: string;
  label: string;
  tip: string;
  /** Dica no lugar de `tip` quando é de noite (ex.: vagalumes em vez de borboletas). */
  nightTip?: string;
}

/** Coisas da cena já tocadas: cada uma vira uma descoberta; achar todas vale estrelas (uma vez só). */
export function useDiscoveries(placeId: string, list: readonly Discovery[], clock: { current: number }, onPoints?: (total: number) => void) {
  const [found, setFound] = useState<string[]>(() => getFound(placeId));
  const foundRef = useRef(found);
  const [fresh, setFresh] = useState<string | null>(null);
  const toast = useRef<{ text: string; big: boolean; until: number }>({ text: '', big: false, until: 0 });

  const discover = useCallback(
    (key: string) => {
      if (foundRef.current.includes(key)) return;
      const nextFound = [...foundRef.current, key];
      foundRef.current = nextFound;
      setFound(nextFound);
      setFresh(key);
      saveFound(placeId, nextFound);
      const d = list.find((x) => x.key === key)!;
      if (list.every((x) => nextFound.includes(x.key))) {
        const total = addPoints(BONUS);
        onPoints?.(total);
        toast.current = { text: `Você descobriu tudo! +${BONUS} ⭐`, big: true, until: clock.current + 4 };
        setTimeout(() => sfx('ok'), 250);
      } else {
        toast.current = { text: `Descoberta: ${d.emoji} ${d.label}!`, big: false, until: clock.current + 2.4 };
      }
    },
    [placeId, list, clock, onPoints],
  );

  useEffect(() => {
    if (!fresh) return;
    const id = setTimeout(() => setFresh(null), 1500);
    return () => clearTimeout(id);
  }, [fresh]);

  return { found, foundRef, fresh, discover, toast };
}

/* ---- Laço de animação ---- */

/** Chama `step` a cada quadro (com o tempo desde o último e o relógio da cena) e redesenha. */
export function useLoop(step: (dt: number, t: number) => void) {
  const clock = useRef(0);
  const stepRef = useRef(step);
  stepRef.current = step;
  const [, render] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock.current += dt;
      stepRef.current(dt, clock.current);
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return clock;
}

/* ---- Câmera 2.5D ---- */

export interface View {
  /** Canto de cima/esquerda e tamanho do que aparece na tela (pixels do desenho). */
  fx: number;
  fy: number;
  vw: number;
  vh: number;
  canDrag: boolean;
  /** Translado de uma camada com profundidade `d` (veja DEPTH). */
  layer: (d: number) => string;
  /** Deslocamento horizontal de uma camada com profundidade `d` (para achar onde o toque caiu nela). */
  shift: (d: number) => number;
  /** Posição na tela (em %) de um ponto do desenho, para os balões de fala. */
  pct: (x: number, y: number) => { left: string; top: string };
}

/**
 * A câmera se ajusta a qualquer formato de tela: em telas estreitas mostra `focus` e dá para arrastar
 * para os lados; em telas largas e baixas abre para os lados (há cenário além das bordas).
 * `focus` pode depender da largura visível (ex.: no celular, mirar outra parte da cena).
 */
export function useCamera(focus: number | ((vw: number) => number)) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const size = useRef({ w: 1280, h: 480, pad: 0 });
  const camX = useRef<number | null>(null);
  const drag = useRef<{ x: number; cam: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const suppress = useRef(false);
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const last = useRef({ vx: 0, vw: W, lo: 0, hi: 0, canDrag: false });

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => (size.current = boxSize(el)));
    size.current = boxSize(el);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Câmera "olhando em volta" (segue o mouse devagar). */
  const step = (dt: number) => {
    const lk = look.current;
    lk.x += (lk.tx - lk.x) * Math.min(1, dt * 2);
    lk.y += (lk.ty - lk.y) * Math.min(1, dt * 2);
  };

  const view = (t: number): View => {
    const { w: bw, h: bh } = size.current;
    const aspect = bw / Math.max(1, bh);
    let vw = Math.min(W, Math.max(MIN_W, H * aspect));
    let vh = vw / aspect;
    if (H - vh > 12) {
      vh = H - 12;
      vw = Math.min(W + 2 * EDGE - 20, vh * aspect);
      vh = vw / aspect;
    }
    const [lo, hi] = vw <= W ? [0, W - vw] : [(W - vw) / 2, (W - vw) / 2];
    const defX = clamp((typeof focus === 'number' ? focus : focus(vw)) - vw / 2, lo, hi);
    const vx = clamp(camX.current ?? defX, lo, hi);
    const vy = H - vh;
    vh += (size.current.pad * vw) / Math.max(1, bw);
    const canDrag = vw < W - 1;
    last.current = { vx, vw, lo, hi, canDrag };
    const lookX = look.current.x + Math.sin(t * 0.13) * 2;
    const lookY = look.current.y + Math.sin(t * 0.09 + 1) * 0.6;
    const fx = vx + lookX;
    const fy = vy + lookY;
    const off = fx - defX;
    return {
      fx,
      fy,
      vw,
      vh,
      canDrag,
      layer: (d) => `translate(${(off * (1 - d)).toFixed(2)} ${(lookY * (1 - d)).toFixed(2)})`,
      shift: (d) => off * (1 - d),
      pct: (x, y) => ({ left: `${((x - fx) / vw) * 100}%`, top: `${((y - fy) / vh) * 100}%` }),
    };
  };

  const toWorld = (e: MouseEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };

  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (!last.current.canDrag || e.button > 0) return;
      drag.current = { x: e.clientX, cam: last.current.vx, moved: false };
    },
    onPointerMove: (e: PointerEvent) => {
      const dr = drag.current;
      if (!dr) {
        if (e.pointerType === 'mouse' && box.current) {
          const r = box.current.getBoundingClientRect();
          look.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 2 * LOOK.x;
          look.current.ty = ((e.clientY - r.top) / r.height - 0.5) * 2 * LOOK.y;
        }
        return;
      }
      const dx = e.clientX - dr.x;
      if (!dr.moved && Math.abs(dx) < 8) return;
      dr.moved = true;
      dragged.current = true;
      const { vw, lo, hi } = last.current;
      camX.current = clamp(dr.cam - dx * (vw / Math.max(1, size.current.w)), lo, hi);
    },
    onPointerUp: () => {
      if (drag.current?.moved) {
        suppress.current = true;
        setTimeout(() => (suppress.current = false), 0);
      }
      drag.current = null;
    },
    onPointerLeave: () => Object.assign(look.current, { tx: 0, ty: 0 }),
  };

  /** Falso logo depois de arrastar a cena (o toque que solta o dedo não conta). */
  const guard = () => !suppress.current;

  return { box, svg, step, view, toWorld, handlers, guard, dragged };
}

/* ---- Letras de placa (3×5) ---- */

const FONT: Record<string, string[]> = {
  M: ['1.1', '111', '1.1', '1.1', '1.1'],
  U: ['1.1', '1.1', '1.1', '1.1', '111'],
  S: ['111', '1..', '111', '..1', '111'],
  E: ['111', '1..', '11.', '1..', '111'],
  N: ['11.', '1.1', '1.1', '1.1', '1.1'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'],
  G: ['111', '1..', '1.1', '1.1', '111'],
  I: ['1', '1', '1', '1', '1'],
  A: ['111', '1.1', '111', '1.1', '1.1'],
  C: ['111', '1..', '1..', '1..', '111'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  Z: ['111', '..1', '.1.', '1..', '111'],
  O: ['111', '1.1', '1.1', '1.1', '111'],
  L: ['1..', '1..', '1..', '1..', '111'],
  H: ['1.1', '1.1', '111', '1.1', '1.1'],
  B: ['11.', '1.1', '11.', '1.1', '11.'],
  D: ['11.', '1.1', '1.1', '1.1', '11.'],
  V: ['1.1', '1.1', '1.1', '1.1', '.1.'],
  ' ': ['..', '..', '..', '..', '..'],
};
/** Palavra em letras de pixel 3×5 (placas das construções). */
export function PixelText({ text, x, y, fill }: { text: string; x: number; y: number; fill: string }) {
  const out: ReactNode[] = [];
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch];
    g.forEach((row, r) => [...row].forEach((c, k) => c === '1' && out.push(<rect key={`${cx}${r}${k}`} x={cx + k} y={y + r} width={1} height={1} />)));
    cx += g[0].length + 1;
  }
  return <g fill={fill}>{out}</g>;
}

/* ---- Sprites ---- */

/** Grade de caracteres → faixas de pixels, com uma borda vazia em volta para o contorno caber. */
export function sprite(rows: string[], pal: Record<string, string>, ink = INK): Run[] {
  const w = Math.max(...rows.map((r) => r.length)) + 2;
  const pad = '.'.repeat(w);
  return toRuns(outline(fromAscii([pad, ...rows.map((r) => `.${r.padEnd(w - 2, '.')}.`), pad], pal), ink));
}

const CAR = [
  '.....bbbbbbbb.....',
  '....bgggbbgggb....',
  '...bggggbbggggb...',
  '.bbbbbbbbbbbbbbbb.',
  'bbbbbbbbbbbbbbbbbl',
  'bssbbbbbbbbbbbssbb',
  '.skks.......skks..',
  '..kk.........kk...',
];
export const CAR_COLORS = ['#f2b705', '#12a3a0', '#f4f1de', '#2f5fb3', '#23384a', '#8cc63f'];
export const carRuns = CAR_COLORS.map((b) => sprite(CAR, { b, g: '#bfe9f2', l: '#ffe27a', s: shade(b, -0.3), k: '#22303a' }));

/* ---- Partículas ---- */

export type PKind = 'leaf' | 'petal' | 'spark' | 'ripple' | 'note' | 'drop' | 'marker' | 'puff' | 'fish' | 'mote' | 'bolt' | 'twinkle';
export interface Particle {
  id: number;
  kind: PKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  c: string;
  seed: number;
  floor?: number;
}

export function makeSpawner(list: { current: Particle[] }) {
  return (kind: PKind, x: number, y: number, o: Partial<Particle> = {}) => {
    const l = list.current;
    if (l.length > 260) l.shift();
    l.push({ id: uid(), kind, x, y, vx: 0, vy: 0, age: 0, life: 1, c: '#fff', seed: Math.random() * 6, ...o });
  };
}

/** Move as partículas: gotas e peixes caem (o peixe que volta para a água espirra), folhas planam. */
export function stepParticles(list: Particle[], dt: number, spawn: ReturnType<typeof makeSpawner>) {
  for (const q of list) {
    q.age += dt;
    if (q.kind === 'drop' || q.kind === 'fish') {
      q.vy += 70 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.vy > 0 && q.y > (q.floor ?? H)) {
        q.age = q.life;
        if (q.kind === 'fish') {
          spawn('ripple', q.x, q.floor!, { life: 1, c: '#d6f6fa' });
          for (let i = 0; i < 4; i++) spawn('drop', q.x, q.floor!, { vx: rnd(-8, 8), vy: rnd(-20, -10), life: 1.4, c: '#bfeaf2', floor: q.floor! });
          sfx('splash');
        }
      }
    } else if (q.kind === 'leaf' || q.kind === 'petal') {
      if (q.vy < 0) {
        q.vy += 30 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
      } else if (q.y < (q.floor ?? H)) {
        q.vy = Math.max(q.vy, 3);
        q.x += (q.vx + Math.sin(q.age * 3 + q.seed) * 7) * dt;
        q.y += q.vy * dt;
      } else q.age += dt;
    } else if (q.kind === 'note') {
      q.x += (q.vx + Math.sin(q.age * 5 + q.seed) * 6) * dt;
      q.y += q.vy * dt;
    } else {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
  }
  return list.filter((q) => q.age < q.life);
}

export function ParticleLayer({ list }: { list: Particle[] }) {
  return (
    <g pointerEvents="none">
      {list.map((q) => {
        const fade = 1 - q.age / q.life;
        switch (q.kind) {
          case 'ripple': {
            const r = 2 + q.age * 11;
            return <ellipse key={q.id} cx={q.x} cy={q.y} rx={r} ry={r * 0.4} fill="none" stroke={q.c} strokeWidth={0.7} opacity={fade} />;
          }
          case 'marker': {
            const r = 1.5 + q.age * 9;
            return <ellipse key={q.id} cx={q.x} cy={q.y} rx={r} ry={r * 0.5} fill="none" stroke={q.c} strokeWidth={0.8} opacity={fade} />;
          }
          case 'note':
            return (
              <g key={q.id} fill={q.c} opacity={Math.min(1, fade * 1.5)}>
                <rect x={q.x} y={q.y + 3} width={2} height={2} />
                <rect x={q.x + 1.5} y={q.y} width={0.8} height={4} />
                <rect x={q.x + 1.5} y={q.y} width={2} height={0.8} />
              </g>
            );
          case 'leaf':
          case 'petal': {
            const flat = Math.sin(q.age * 6 + q.seed) > 0;
            return <rect key={q.id} x={q.x} y={q.y} width={flat ? 2 : 1} height={flat ? 1 : 2} fill={q.c} opacity={Math.min(1, fade * 2)} />;
          }
          case 'puff': {
            const s = 1 + q.age * 1.6;
            return <rect key={q.id} x={q.x - s / 2} y={q.y} width={s} height={s} fill={q.c} opacity={fade * 0.55} />;
          }
          case 'fish': {
            const dir = q.vx >= 0 ? 1 : -1;
            const up = q.vy < 0;
            return (
              <g key={q.id}>
                <rect x={q.x - 2} y={q.y - 1} width={4} height={2} fill={q.c} />
                <rect x={dir > 0 ? q.x - 4 : q.x + 2} y={q.y + (up ? 0 : -2)} width={2} height={2} fill={shade(q.c, -0.15)} />
                <rect x={q.x + dir} y={q.y - 1} width={1} height={1} fill={INK} />
              </g>
            );
          }
          case 'bolt': {
            // Faísca de energia: um raiozinho amarelo que pisca.
            const on = Math.sin(q.age * 40 + q.seed) > -0.3;
            return (
              <g key={q.id} opacity={on ? Math.min(1, fade * 2) : 0.2} fill={q.c}>
                <rect x={q.x} y={q.y - 1} width={1} height={1} />
                <rect x={q.x - 1} y={q.y} width={3} height={1} />
                <rect x={q.x} y={q.y + 1} width={1} height={1} />
              </g>
            );
          }
          case 'twinkle': {
            // Brilho em cruz (as luzes da ponte vistas de longe).
            const s = Math.sin((q.age / q.life) * Math.PI);
            const r = Math.round(1 + s * 2);
            return (
              <g key={q.id} fill={q.c} opacity={s}>
                <rect x={q.x - r} y={q.y} width={r * 2 + 1} height={1} />
                <rect x={q.x} y={q.y - r} width={1} height={r * 2 + 1} />
              </g>
            );
          }
          case 'mote':
            return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={Math.sin((q.age / q.life) * Math.PI) * 0.85} />;
          case 'drop':
            return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} />;
          default:
            return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={Math.sin((q.age / q.life) * Math.PI)} />;
        }
      })}
    </g>
  );
}

/* ---- Céu e serras ---- */

type Peak = [number, number];

/** Cenário de fundo fixo (gerado uma vez): estrelas, serras, bairros nos morros e prédios brancos. */
export function makeBackdrop(ground: number, seed: number, opts: { blocks?: number } = {}) {
  const rand = seeded(seed);
  const farPeaks: Peak[] = [[-140, ground - 40], [-40, ground - 48], [70, ground - 54], [160, ground - 44], [240, ground - 56], [340, ground - 46], [440, ground - 52]];
  const nearPeaks: Peak[] = [[-90, ground - 26], [30, ground - 32], [120, ground - 26], [210, ground - 34], [300, ground - 28], [400, ground - 30]];
  const ridgeAt = (base: number, peaks: Peak[], x: number) => Math.round(Math.min(base, ...peaks.map(([px, py]) => py + Math.abs(x - px) * 0.8)));
  const stars = Array.from({ length: 90 }, () => ({ x: Math.round(-EDGE + rand() * (W + 2 * EDGE)), y: Math.round(-160 + rand() * (ground + 50)), dur: 1.4 + rand() * 3.5, delay: -rand() * 4 }));
  // Casinhas espalhadas pela serra (os bairros nos morros de Cataguases); à noite as janelas acendem.
  const town: { x: number; y: number; w: number; h: number; wall: string; roof: string; lit: boolean }[] = [];
  for (let i = 0; i < 140 && town.length < 64; i++) {
    const x = Math.round(-EDGE + rand() * (W + 2 * EDGE));
    const top = ridgeAt(ground - 8, nearPeaks, x) + 3;
    const y = Math.round(top + rand() * (ground - 15 - top));
    if (y > ground - 14 || town.some((o) => Math.abs(o.x - x) < 6 && Math.abs(o.y - y) < 4)) continue;
    town.push({ x, y, w: 3 + Math.floor(rand() * 3), h: 2 + Math.floor(rand() * 2), wall: ['#f4efe2', '#f1e3c4', '#e3ecef', '#f6dcc0'][Math.floor(rand() * 4)], roof: rand() > 0.4 ? '#c0573e' : '#a84a32', lit: rand() < 0.65 });
  }
  town.sort((a, b) => a.y - b.y);
  // Prédios brancos de alguns andares no meio do morro (como os de perto do rio).
  const blocks: { x: number; y: number; w: number; h: number; lit: boolean[] }[] = [];
  for (let i = 0; i < 60 && blocks.length < (opts.blocks ?? 0); i++) {
    const x = Math.round(-EDGE + 20 + rand() * (W + 2 * EDGE - 40));
    const w = 6 + Math.floor(rand() * 6);
    const h = 6 + Math.floor(rand() * 7);
    const y = ground - 6 - Math.floor(rand() * 6);
    if (blocks.some((b) => Math.abs(b.x - x) < 16)) continue;
    blocks.push({ x, y, w, h, lit: Array.from({ length: 12 }, () => rand() < 0.6) });
  }
  const dots = (n: number, base: number, peaks: Peak[], c: string[]) =>
    Array.from({ length: n }, () => {
      const x = Math.round(-EDGE + rand() * (W + 2 * EDGE));
      const top = ridgeAt(base, peaks, x) + 2;
      return { x, y: Math.round(top + rand() * Math.max(0, ground - top - 4)), c: c[Math.floor(rand() * c.length)] };
    });
  const farDots = dots(70, ground - 14, farPeaks, ['#8cc063', '#97c96f']);
  const nearDots = dots(110, ground - 8, nearPeaks, ['#2f8f4a', '#268043', '#4caf5a']);
  return { ground, stars, town, blocks, farDots, nearDots, farPeaks, nearPeaks };
}
export type Backdrop = ReturnType<typeof makeBackdrop>;

/** Céu, sol/lua, raios de sol e estrelas (atrás das nuvens). */
export const SkyLayer = memo(function SkyLayer({ time, bd }: { time: DayTime; bd: Backdrop }) {
  const night = time === 'night';
  const sky = SKY[time];
  const g = bd.ground;
  const x0 = -EDGE - 200;
  const w = W + 2 * EDGE + 400;
  return (
    <g>
      <defs>
        <linearGradient id="sk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <radialGradient id="sk-glow">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={x0} y={-400} width={w} height={400 + g} fill={sky[1]} />
      <rect x={x0} y={-80} width={w} height={80 + g} fill="url(#sk-sky)" />
      <rect x={x0} y={-400} width={w} height={321} fill={sky[0]} />
      {night &&
        bd.stars.map((s, i) => (
          <rect key={i} className="cw-star" x={s.x} y={s.y} width={1} height={1} fill="#e2f6f5" style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        ))}
      {night ? (
        <g>
          <circle cx={262} cy={14} r={12} fill="#f4f1de" opacity={0.12} />
          <rect x={258} y={10} width={8} height={8} fill="#f4f1de" />
          <rect x={257} y={11} width={10} height={6} fill="#f4f1de" />
          <rect x={261} y={12} width={2} height={2} fill="#dcd8c0" />
          <rect x={259} y={15} width={1} height={1} fill="#dcd8c0" />
        </g>
      ) : (
        <g>
          <circle cx={262} cy={14} r={11} fill={time === 'dusk' ? '#ffd29a' : '#fff3b0'} opacity={0.35} />
          <rect x={258} y={10} width={8} height={8} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
          <rect x={257} y={11} width={10} height={6} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
          <g fill={time === 'dusk' ? '#ffd2a0' : '#fff6c8'}>
            {[
              [210, 250, 0],
              [120, 170, 1.3],
              [30, 70, 2.6],
              [300, 340, 3.9],
            ].map(([a, b, delay]) => (
              <path key={a} className="ps-ray" d={`M262 14 L${a} ${g} L${b} ${g} Z`} style={{ animationDelay: `${delay}s` }} />
            ))}
          </g>
        </g>
      )}
    </g>
  );
});

/** Serra do fundo (a mais distante). */
export const FarHills = memo(function FarHills({ time, bd }: { time: DayTime; bd: Backdrop }) {
  const night = time === 'night';
  const far = useMemo(() => ridgePath(bd.ground - 14, bd.farPeaks, -EDGE - 10, W + EDGE + 10, bd.ground), [bd]);
  return (
    <g>
      <path d={far} fill={night ? '#26503f' : time === 'dusk' ? '#9c8fa8' : '#a9d67a'} />
      {!night && bd.farDots.map((d, i) => <rect key={i} x={d.x} y={d.y} width={2} height={1} fill={time === 'dusk' ? '#8b8096' : d.c} />)}
    </g>
  );
});

/** Serra mais perto, com as casinhas dos bairros e os prédios brancos. */
export const NearHills = memo(function NearHills({ time, bd }: { time: DayTime; bd: Backdrop }) {
  const night = time === 'night';
  const near = useMemo(() => ridgePath(bd.ground - 8, bd.nearPeaks, -EDGE - 10, W + EDGE + 10, bd.ground), [bd]);
  return (
    <g>
      <path d={near} fill={night ? '#1a4431' : time === 'dusk' ? '#5f7a5a' : '#3aa655'} />
      {bd.nearDots.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={2} height={2} fill={night ? '#153a29' : time === 'dusk' ? '#526b4e' : d.c} />
      ))}
      {bd.town.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y - c.h} width={c.w} height={c.h} fill={night ? '#5a6670' : c.wall} />
          <rect x={c.x - 1} y={c.y - c.h - 1} width={c.w + 2} height={1} fill={night ? '#4a3a36' : c.roof} />
          <rect x={c.x + 1} y={c.y - c.h} width={1} height={1} fill={night ? (c.lit ? '#ffd76a' : '#3d4a52') : '#7fa8be'} />
        </g>
      ))}
      {bd.blocks.map((b, i) => {
        const wall = night ? '#6a7680' : time === 'dusk' ? '#f1d8cc' : '#f7f7f2';
        return (
          <g key={`b${i}`}>
            <rect x={b.x - 1} y={b.y - b.h - 1} width={b.w + 2} height={b.h + 1} fill={night ? '#3b4650' : '#b9c2c6'} />
            <rect x={b.x} y={b.y - b.h} width={b.w} height={b.h} fill={wall} />
            <rect x={b.x + b.w - 2} y={b.y - b.h} width={2} height={b.h} fill={shade(wall, -0.12)} />
            {Array.from({ length: Math.floor((b.h - 2) / 3) }, (_, r) =>
              Array.from({ length: Math.floor((b.w - 2) / 3) }, (_, k) => (
                <rect key={`${r}${k}`} x={b.x + 1 + k * 3} y={b.y - b.h + 2 + r * 3} width={2} height={1} fill={night ? (b.lit[(r * 4 + k) % 12] ? '#ffd76a' : '#3d4a52') : '#8fb4c8'} />
              )),
            )}
          </g>
        );
      })}
    </g>
  );
});

/** Luzes dos bairros nos morros, acesas por cima do escuro da noite. */
export const TownLights = memo(function TownLights({ bd }: { bd: Backdrop }) {
  return (
    <g pointerEvents="none">
      {bd.town
        .filter((c) => c.lit)
        .map((c, i) => (
          <g key={i}>
            <circle cx={c.x + 1.5} cy={c.y - c.h + 0.5} r={2.2} fill="#ffd76a" opacity={0.18} />
            <rect x={c.x + 1} y={c.y - c.h} width={1} height={1} fill="#ffe08a" />
          </g>
        ))}
    </g>
  );
});

/** Névoa: deixa as serras mais longe mais claras e azuladas (perspectiva do ar). */
export function Haze({ time, ground }: { time: DayTime; ground: number }) {
  const sky = SKY[time];
  return (
    <>
      <defs>
        <linearGradient id="sk-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[1]} stopOpacity="0" />
          <stop offset="1" stopColor={sky[1]} stopOpacity={time === 'night' ? 0.35 : 0.6} />
        </linearGradient>
      </defs>
      <rect x={FULL.x} y={ground - 62} width={FULL.w} height={62} fill="url(#sk-haze)" />
    </>
  );
}

/** Filtro de cor do fim de tarde e da noite, por cima de tudo. */
export function TimeTint({ time }: { time: DayTime }) {
  if (time === 'dusk') return <rect x={FULL.x} y={-400} width={FULL.w} height={GROUND_END + 420} fill="#ff8a4a" opacity={0.08} pointerEvents="none" />;
  if (time === 'night') return <rect x={FULL.x} y={-400} width={FULL.w} height={GROUND_END + 420} fill="#0d1b2e" opacity={0.28} pointerEvents="none" />;
  return null;
}

/* ---- Coisas vivas do ambiente ---- */

interface Flock {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  birds: { dx: number; dy: number; ph: number }[];
}

export interface Flyer {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  c: string;
  rest: number;
  phase: number;
  speed: number;
  flee: number;
}

export interface Glow {
  id: number;
  x: number;
  y: number;
  ph: number;
  f: number;
  vx: number;
  vy: number;
}

/** Faixa da cena onde voam borboletas e vagalumes. */
export interface Area {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function initAmbient(area: Area) {
  return {
    clouds: Array.from({ length: 6 }, () => ({ x: rnd(-EDGE, W + EDGE), y: rnd(-30, 26), w: rnd(14, 32), speed: rnd(1.2, 3.4) })),
    flocks: [] as Flock[],
    flyers: Array.from({ length: 5 }, (): Flyer => {
      const x = rnd(area.x0, area.x1);
      const y = rnd(area.y0, area.y1);
      return { id: uid(), x, y, tx: x, ty: y, c: pick(['#f2b705', '#ec6a8c', '#ffffff', '#7fb8ff', '#ff8a5c']), rest: rnd(0, 2), phase: rnd(0, 6), speed: rnd(10, 16), flee: 0 };
    }),
    glows: Array.from({ length: 18 }, (): Glow => ({ id: uid(), x: rnd(area.x0, area.x1), y: rnd(area.y0, area.y1), ph: rnd(0, 6), f: rnd(1.2, 3.2), vx: rnd(-3, 3), vy: rnd(-2, 2) })),
    flockTimer: rnd(3, 9),
  };
}
export type Ambient = ReturnType<typeof initAmbient>;

/** Um passarinho saindo de uma árvore tocada. */
export function flyAway(A: Ambient, x: number, y: number) {
  A.flocks.push({ id: uid(), x, y, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
}

/** Nuvens, bandos de passarinhos, borboletas (dia) e vagalumes (noite). */
export function stepAmbient(A: Ambient, dt: number, t: number, night: boolean, area: Area) {
  for (const c of A.clouds) {
    c.x += c.speed * dt;
    if (c.x > W + EDGE) Object.assign(c, { x: -EDGE - c.w, y: rnd(-30, 26), w: rnd(14, 32), speed: rnd(1.2, 3.4) });
  }
  A.flockTimer -= dt;
  if (A.flockTimer <= 0) {
    A.flockTimer = rnd(9, 22);
    const dir = pick([-1, 1]);
    const n = 2 + Math.floor(Math.random() * 4);
    A.flocks.push({
      id: uid(),
      x: dir > 0 ? -EDGE : W + EDGE,
      y: rnd(-10, 30),
      vx: dir * rnd(24, 36),
      vy: rnd(-1.5, 1.5),
      birds: Array.from({ length: n }, (_, i) => ({ dx: -dir * i * rnd(5, 8), dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * rnd(2, 4), ph: rnd(0, 6) })),
    });
  }
  for (const f of A.flocks) {
    f.x += f.vx * dt;
    f.y += f.vy * dt + Math.sin(t * 1.3 + f.id) * 2 * dt;
  }
  A.flocks = A.flocks.filter((f) => f.x > -EDGE - 40 && f.x < W + EDGE + 40 && f.y > -200);
  if (!night) {
    for (const f of A.flyers) {
      f.flee = Math.max(0, f.flee - dt);
      if (f.rest > 0) {
        f.rest -= dt;
        continue;
      }
      const vx = f.tx - f.x;
      const vy = f.ty - f.y;
      const dist = Math.hypot(vx, vy);
      if (dist < 2) {
        if (Math.random() < 0.4) f.rest = rnd(0.8, 3);
        f.tx = clamp(f.x + rnd(-50, 50), area.x0, area.x1);
        f.ty = clamp(f.y + rnd(-20, 20), area.y0, area.y1);
      } else {
        const sp = f.speed * (f.flee > 0 ? 2.6 : 1);
        f.x += (vx / dist) * sp * dt + Math.sin(t * 3.1 + f.phase) * 6 * dt;
        f.y += (vy / dist) * sp * dt + Math.sin(t * 5.3 + f.phase * 2) * 9 * dt;
      }
    }
  } else {
    for (const g of A.glows) {
      g.vx = clamp(g.vx + rnd(-6, 6) * dt, -4, 4);
      g.vy = clamp(g.vy + rnd(-6, 6) * dt, -3, 3);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.x < area.x0 - 20 || g.x > area.x1 + 20) g.vx *= -1;
      if (g.y < area.y0 || g.y > area.y1) g.vy *= -1;
    }
  }
}

/** Nuvens e bandos de passarinhos (vão na camada das nuvens). */
export function Clouds({ A, t, time }: { A: Ambient; t: number; time: DayTime }) {
  const night = time === 'night';
  return (
    <g>
      {A.clouds.map((cl, i) => (
        <g key={i} fill={night ? '#3a5068' : time === 'dusk' ? '#ffe3d6' : '#ffffff'} opacity={night ? 0.55 : 0.92}>
          <rect x={cl.x} y={cl.y} width={cl.w} height={5} />
          <rect x={cl.x + cl.w * 0.2} y={cl.y - 4} width={cl.w * 0.45} height={4} />
          <rect x={cl.x + cl.w * 0.55} y={cl.y - 2} width={cl.w * 0.3} height={2} />
          <rect x={cl.x + 2} y={cl.y + 5} width={cl.w - 4} height={1} fill={night ? '#2c3e52' : '#d6e8f0'} />
        </g>
      ))}
      {A.flocks.map((f) =>
        f.birds.map((b, i) => {
          const up = Math.sin(t * 14 + b.ph) > 0;
          const x = f.x + b.dx;
          const y = f.y + b.dy;
          return (
            <g key={`${f.id}-${i}`} fill={night ? '#9fb3c8' : INK}>
              <rect x={x} y={y} width={1} height={1} />
              <rect x={x - 2} y={up ? y - 1 : y + 1} width={2} height={1} />
              <rect x={x + 1} y={up ? y - 1 : y + 1} width={2} height={1} />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** Borboletas de dia, vagalumes de noite: fogem do toque soltando brilhinhos. */
export function Critters({ A, t, night, area, spawn, onTap }: { A: Ambient; t: number; night: boolean; area: Area; spawn: ReturnType<typeof makeSpawner>; onTap?: () => void }) {
  if (night)
    return (
      <g>
        {A.glows.map((g) => {
          const a = Math.max(0, Math.sin(t * g.f + g.ph));
          return (
            <g
              key={g.id}
              className="cw-tap"
              onClick={(e) => {
                e.stopPropagation();
                sfx('chirp');
                g.vx = rnd(-4, 4);
                g.vy = -3;
                for (let i = 0; i < 6; i++) spawn('spark', g.x, g.y, { life: rnd(0.5, 0.9), vx: rnd(-6, 6), vy: rnd(-6, 3), c: '#fff59a' });
                onTap?.();
              }}
            >
              <rect x={g.x - 4} y={g.y - 4} width={8} height={8} fill="transparent" />
              <g opacity={a} pointerEvents="none">
                <circle cx={g.x} cy={g.y} r={2.2} fill="#fff59a" opacity={0.25} />
                <rect x={g.x - 0.5} y={g.y - 0.5} width={1} height={1} fill="#fffbd0" />
              </g>
            </g>
          );
        })}
      </g>
    );
  return (
    <g>
      {A.flyers.map((f) => {
        const open = f.rest > 0 ? Math.sin(t * 2 + f.phase) > 0.6 : Math.sin(t * 26 + f.phase) > 0;
        const by = f.y + (f.rest > 0 ? 0 : Math.sin(t * 4 + f.phase) * 0.6);
        return (
          <g
            key={f.id}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              sfx('chirp');
              f.flee = 1.4;
              f.rest = 0;
              f.tx = clamp(f.x + rnd(-60, 60), area.x0, area.x1);
              f.ty = clamp(f.y - rnd(10, 24), area.y0, area.y1);
              for (let i = 0; i < 4; i++) spawn('spark', f.x, f.y, { life: rnd(0.4, 0.7), vx: rnd(-6, 6), vy: rnd(-6, 2), c: f.c });
              onTap?.();
            }}
          >
            <rect x={f.x - 5} y={by - 5} width={11} height={10} fill="transparent" />
            {open ? (
              <>
                <rect x={f.x - 2} y={by - 1} width={2} height={2} fill={f.c} />
                <rect x={f.x + 1} y={by - 1} width={2} height={2} fill={f.c} />
                <rect x={f.x - 2} y={by + 1} width={1} height={1} fill={f.c} />
                <rect x={f.x + 2} y={by + 1} width={1} height={1} fill={f.c} />
              </>
            ) : (
              <rect x={f.x - 1} y={by - 2} width={1} height={2} fill={f.c} />
            )}
            <rect x={f.x} y={by - 1} width={1} height={2} fill={INK} />
          </g>
        );
      })}
    </g>
  );
}

/** Árvore do fundo (balança ao vento; ao toque, chacoalha). `ground` é onde fica o pé dela. */
export const BackTree = memo(function BackTree({ id, x, ground, dur, delay, shaking, onTap }: { id: string; x: number; ground: number; dur: number; delay: number; shaking: boolean; onTap: (id: string, x: number, top: number) => void }) {
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(id, x, ground - 18);
      }}
    >
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : `${dur}s`, animationDelay: shaking ? undefined : `${delay}s`, '--a': '1.6deg' } as CSSProperties}>
        <g transform={`translate(${x - 9} ${ground - 21}) scale(2)`}>
          <Pixels runs={treeRuns} />
        </g>
      </g>
    </g>
  );
});

/** Árvore grande (a árvore do mapa ampliada `s` vezes), com o pé em (x, ground). */
export const BigTree = memo(function BigTree({ id, x, ground, s, shaking, onTap }: { id: string; x: number; ground: number; s: number; shaking: boolean; onTap: (id: string, x: number, top: number) => void }) {
  const w = 11 * s;
  const h = 13 * s;
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(id, x, ground - h * 0.8);
      }}
    >
      <ellipse cx={x} cy={ground} rx={w * 0.4} ry={1.4} fill="#000" opacity={0.16} />
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '5s', '--a': '0.9deg' } as CSSProperties}>
        <g transform={`translate(${x - w / 2} ${ground - h}) scale(${s})`}>
          <Pixels runs={treeRuns} />
        </g>
      </g>
    </g>
  );
});

/* ---- Interface por cima da cena ---- */

export interface Bubble {
  key: string;
  x: number;
  y: number;
  text: string;
}

/**
 * Balões de fala, a pomba das dicas, o painel de descobertas, o aviso de descoberta e a dica de arrastar.
 * A pomba dá a primeira dica sozinha quando a cena termina de abrir.
 */
export function SceneHud({
  t,
  view,
  bubbles,
  list,
  found,
  fresh,
  toast,
  night,
  firstTip,
  dragText,
  dragged,
}: {
  t: number;
  view: View;
  bubbles: Bubble[];
  list: readonly Discovery[];
  found: string[];
  fresh: string | null;
  toast: { text: string; big: boolean; until: number };
  night: boolean;
  firstTip: string;
  dragText: string;
  dragged: boolean;
}) {
  const dove = useRef({ text: firstTip, from: 1.6, until: 6.6 });
  const tapDove = () => {
    sfx('chirp');
    const missing = list.filter((d) => !found.includes(d.key));
    const d = missing.length ? pick(missing) : null;
    const tip = d ? (night && d.nightTip) || d.tip : 'Você é um ótimo explorador! ⭐';
    dove.current = { text: tip, from: t, until: t + 4 };
    say([POMBA_CLIPS.tip], POMBA);
  };
  const done = found.length >= list.length;
  const showDove = dove.current.from <= t && dove.current.until > t;
  return (
    <>
      {bubbles.map((b) => (
        <div key={b.key} className="cw-bubble" style={view.pct(b.x, b.y)}>
          {b.text}
        </div>
      ))}
      <button className="visit-dove" onClick={tapDove} aria-label="Pomba guia: pedir uma dica" title="Pedir uma dica">
        <GuideSprite size={64} flying />
        {showDove && <span className="cw-bubble dove ps-dove-say">{dove.current.text}</span>}
      </button>
      <div className={`ps-found ${done ? 'done' : ''}`} aria-label={`Descobertas: ${found.length} de ${list.length}`}>
        <span className="ps-found-count">
          {done ? '🏆' : '🔍'} {found.length}/{list.length}
        </span>
        <span className="ps-found-list">
          {list.map((d) => (
            <span key={d.key} className={`${found.includes(d.key) ? 'on' : ''} ${fresh === d.key ? 'new' : ''}`} title={found.includes(d.key) ? d.label : '???'}>
              {d.emoji}
            </span>
          ))}
        </span>
      </div>
      {toast.until > t && (
        <div key={toast.text} className={`ps-toast ${toast.big ? 'big' : ''}`} role="status">
          {toast.text}
        </div>
      )}
      {view.canDrag && !dragged && t > 2 && t < 14 && <div className="ps-drag">{dragText}</div>}
    </>
  );
}

/** Balões que somem sozinhos: guarda o texto, onde aparece e até quando. */
export function useBubbles(clock: { current: number }) {
  const map = useRef(new Map<string, Bubble & { until: number }>());
  const say = (key: string, x: number, y: number, text: string, secs = 2.6) => map.current.set(key, { key, x, y, text, until: clock.current + secs });
  const live = (t: number): Bubble[] => [...map.current.values()].filter((b) => b.until > t);
  return { say, live };
}

/** Contêiner da cena: a área que recebe arrastar e o "olhar" do mouse. */
export function SceneBox({ cam, children }: { cam: ReturnType<typeof useCamera>; children: ReactNode }) {
  const h = cam.handlers;
  return (
    <div className="ps" ref={cam.box} onPointerDown={h.onPointerDown} onPointerMove={h.onPointerMove} onPointerUp={h.onPointerUp} onPointerCancel={h.onPointerUp} onPointerLeave={h.onPointerLeave}>
      {children}
    </div>
  );
}
