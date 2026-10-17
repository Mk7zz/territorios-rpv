import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { sfx } from '../lib/cidade';
import { seeded } from '../lib/pixel';
import type { AvatarConfig } from '../lib/types';
import { CITY_BOUNDS as BOUNDS, CITY_BRIDGE as BRIDGE, CITY_H as H, CITY_PATH as MAIN_PATH, CITY_SPAWN as SPAWN, CITY_W as W, cityRiverX as riverX, inCityRiver as inRiver, PLAZA, RIVER_HALF, type Place } from '../lib/world';
import { AVATAR_PALETTES, DEFAULT_AVATAR } from './Avatar';
import { Dialogue } from './Dialogue';
import { MasterSprite, type MasterFrame } from './Mestres';
import { PixelIcon } from './PixelIcon';
import { birdDown, birdUp, Pixels, treeRuns, TREE_H, TREE_W, type DayTime } from './Scene';
import { BridgeDeck } from './Landmarks';
import { Building, Character, makeTrees, type TreeGeo } from './World';

/*
 * Mapa da cidade em tela cheia. Diferente da base do aluno (World), aqui:
 * - quem chama a atenção é o desenho: sem placas, e o nome do lugar só aparece de perto (ou ao passar o mouse);
 * - o mundo cobre a tela inteira e uma câmera segue o personagem (ou é arrastada com o dedo);
 * - o cenário tem vida própria com movimentos aleatórios (moradores, borboletas, vagalumes,
 *   nuvens, passarinhos, brilhos no rio, folhas caindo), para nada parecer repetido;
 * - quase tudo responde ao toque (árvores, rio, moradores, borboletas, a pomba).
 */

const SPEED = 72;

/** Medidas do mapa grande, para as árvores fugirem dos caminhos, do rio e da praça. */
const CITY_GEO: TreeGeo = { w: W, h: H, path: MAIN_PATH, riverX, spawn: SPAWN, plaza: PLAZA, npcSpots: [], trees: 30, rowStep: 22 };
const TREE_SCALE = 1.6;
const PARALLAX = 0.4;

type Vec = { x: number; y: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const side = (p: Vec) => p.x < riverX(p.y);

/** Caminho até o destino, passando pela ponte quando ele fica do outro lado do rio. */
function route(from: Vec, to: Vec): Vec[] {
  if (side(from) === side(to)) return [to];
  const by = MAIN_PATH.y + 4;
  const bx = riverX(by);
  const dir = side(from) ? 1 : -1;
  return [{ x: bx - dir * 16, y: by }, { x: bx + dir * 16, y: by }, to];
}

export function randomLook(): AvatarConfig {
  return {
    ...DEFAULT_AVATAR,
    skin: pick(AVATAR_PALETTES.skin),
    hair: pick(['short', 'long', 'curly', 'bun', 'afro', 'none'] as const),
    hairColor: pick(AVATAR_PALETTES.hairColor.slice(0, 6)),
    shirt: pick(AVATAR_PALETTES.shirt),
    pants: pick(AVATAR_PALETTES.pants),
    eyes: pick(['round', 'happy'] as const),
    mouth: pick(['smile', 'grin'] as const),
    accessory: pick(['none', 'none', 'none', 'cap', 'glasses'] as const),
    outfit: pick(['tee', 'hoodie', 'jacket'] as const),
  };
}

const NPC_LINES_DAY = ['Oi! 👋', 'Que dia bonito! ☀️', 'Já foi na Praça Santa Rita? ⛪', 'Bora explorar Cataguases!', '🎵 lá lá lá', 'Olha a pombinha! 🕊️', 'Bom passeio! 😊', 'Já foi prosear com o Seu Zico? 🏡', 'O Sektor tá no estúdio! 🎧', 'A Dona Rosa tá bordando! 🧵'];
const NPC_LINES_NIGHT = ['Boa noite! 🌙', 'Olha os vagalumes! ✨', 'Que céu estrelado! ⭐', 'Hora de passear 🚶'];
const DOVE_LINES = ['Pruu! Toque nas árvores! 🌳', 'Pruu! Toque no rio! 💧', 'Pruu! Converse com as pessoas! 👋', 'Pruu! Vamos na Praça Santa Rita? ⛪', 'Pruu! Arraste o mapa para olhar a cidade! 🗺️', 'Pruu! Na Rua dos Mestres moram os Mestres do Saber! 🏡', 'Pruu! Vamos atravessar a Ponte Velha? 🌉', 'Pruu! Já visitou o Museu Energisa? ⚡', 'Pruu! O trem chegou na estação! 🚂', 'Pruu! Vamos na Chácara Dona Catarina? 🏡', 'Pruu! Tem filme no Centro Cultural! 🎬', 'Pruu! Já viu o painel do Memorial Nanzita? 🎨', 'Pruu! Tem pombas no painel do Educandário! 🕊️', 'Pruu! O prédio verde do Sicredi já foi hotel! 🏨'];

/** Onde o Mestre do Saber fica parado, à esquerda da porta de casa. */
const masterSpot = (p: Place) => (p.variant === 'hiphop' ? -15 : -13);

/* ---- Cenário fixo (gerado uma vez) ---- */

interface Sway {
  x: number;
  y: number;
  dur: number;
  delay: number;
  c: string;
}

function makeScenery(places: Place[]) {
  const rand = seeded(77);
  const trees = makeTrees(places, 4321, CITY_GEO).map((t) => ({ ...t, dur: 3.2 + rand() * 3.5, delay: -rand() * 7 }));
  const free = (x: number, y: number) =>
    y > 50 &&
    Math.abs(x - riverX(y)) > RIVER_HALF + 3 &&
    Math.abs(y - (MAIN_PATH.y + 4)) > 7 &&
    Math.hypot((x - PLAZA.x) / 28, (y - PLAZA.y) / 15) > 1 &&
    !trees.some((t) => Math.abs(t.x - x) < 6 && Math.abs(t.y - y) < 5) &&
    !places.some((p) => Math.abs(x - p.x) < (p.kind === 'church' ? 30 : p.kind === 'hotel' || p.kind === 'museum' || p.kind === 'station' ? 36 : 28) && y > p.y - (p.kind === 'hotel' ? 56 : 44) && y < p.y + (p.kind === 'church' || p.kind === 'hotel' ? 12 : p.kind === 'museum' ? 17 : 4)) &&
    !places.some((p) => Math.abs(x - p.x) < 6 && y > Math.min(p.y, MAIN_PATH.y) && y < Math.max(p.y, MAIN_PATH.y));
  const scatter = (n: number, make: (x: number, y: number) => Sway) => {
    const out: Sway[] = [];
    for (let i = 0; i < n * 6 && out.length < n; i++) {
      const x = Math.round(rand() * W);
      const y = 52 + Math.round(rand() * (H - 54));
      if (free(x, y)) out.push(make(x, y));
    }
    return out;
  };
  const tufts = scatter(120, (x, y) => ({ x, y, dur: 1.8 + rand() * 2.6, delay: -rand() * 4, c: rand() > 0.5 ? '#4f8f2c' : '#6fae3c' }));
  const flowers = scatter(70, (x, y) => ({ x, y, dur: 2.2 + rand() * 2.4, delay: -rand() * 4, c: ['#f2b705', '#ffffff', '#ec6a8c', '#b48ae0', '#ff8a5c'][Math.floor(rand() * 5)] }));
  const pebbles = Array.from({ length: 90 }, () => ({ x: 10 + Math.round(rand() * (W - 20)), y: MAIN_PATH.y + 1 + Math.round(rand() * (MAIN_PATH.h - 2)) })).filter((p) => !inRiver(p.x, p.y + 20));
  const lamps = [64, 126, 236, 280, 330, 380]
    .filter((x) => !places.some((p) => (p.kind === 'mestre' || p.kind === 'painel') && Math.abs(x - p.x) < 24) && Math.abs(x - riverX(MAIN_PATH.y)) > 22)
    .map((x) => ({ x, y: MAIN_PATH.y - 1, dur: 2 + rand() * 3 }));
  const benches = [
    { x: PLAZA.x - 28, y: PLAZA.y + 17 },
    { x: PLAZA.x + 16, y: PLAZA.y + 17 },
  ];
  const stars = Array.from({ length: 46 }, () => ({ x: Math.round(rand() * W), y: Math.round(rand() * 34), dur: 1.4 + rand() * 3.5, delay: -rand() * 4 }));
  return { trees, tufts, flowers, pebbles, lamps, benches, stars };
}

type Scenery = ReturnType<typeof makeScenery>;

export const ridgePath = (base: number, peaks: [number, number][], x0: number, x1: number, bottom: number) => {
  let d = `M${x0} ${bottom}`;
  for (let x = x0; x < x1; x++) d += ` V${Math.round(Math.min(base, ...peaks.map(([px, py]) => py + Math.abs(x - px) * 0.8)))} H${x + 1}`;
  return `${d} V${bottom} Z`;
};

/** Céu e serras: ficam numa camada que se move mais devagar que o chão (profundidade). */
const Backdrop = memo(function Backdrop({ time, farRef, scenery }: { time: DayTime; farRef: RefObject<SVGGElement | null>; scenery: Scenery }) {
  const night = time === 'night';
  const sky = night ? ['#0b1730', '#24405a'] : time === 'dusk' ? ['#d9739a', '#ffcf8a'] : ['#6cc4ea', '#dff5f1'];
  const far = useMemo(() => ridgePath(42, [[-60, 14], [30, 8], [118, 3], [205, 12], [290, 5], [370, 12], [450, 6]], -140, W + 20, 60), []);
  const near = useMemo(() => ridgePath(44, [[-30, 24], [80, 20], [170, 16], [262, 22], [350, 20], [430, 18]], -140, W + 20, 60), []);
  return (
    <g>
      <defs>
        <linearGradient id="cw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <radialGradient id="cw-glow">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-10} y={-10} width={W + 20} height={70} fill="url(#cw-sky)" />
      {night &&
        scenery.stars.map((s, i) => (
          <rect key={i} className="cw-star" x={s.x} y={s.y} width={1} height={1} fill="#e2f6f5" style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        ))}
      <g ref={farRef}>
        {night ? (
          <g>
            <rect x={40} y={8} width={8} height={8} fill="#f4f1de" />
            <rect x={39} y={9} width={10} height={6} fill="#f4f1de" />
            <rect x={43} y={10} width={2} height={2} fill="#dcd8c0" />
          </g>
        ) : (
          <g>
            <circle cx={44} cy={12} r={9} fill={time === 'dusk' ? '#ffd29a' : '#fff3b0'} opacity={0.35} />
            <rect x={40} y={8} width={8} height={8} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
            <rect x={39} y={9} width={10} height={6} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
          </g>
        )}
        <path d={far} fill={night ? '#26503f' : time === 'dusk' ? '#9c8fa8' : '#a9d67a'} />
        <path d={near} fill={night ? '#1a4431' : time === 'dusk' ? '#5f7a5a' : '#3aa655'} />
      </g>
    </g>
  );
});

/** Chão: grama, caminhos com pedrinhas, praça, rio, ponte e sombras das construções. */
const Ground = memo(function Ground({ places, scenery }: { places: Place[]; scenery: Scenery }) {
  const g = useMemo(() => {
    const rand = seeded(42);
    const patches = Array.from({ length: 180 }, () => ({ x: Math.round(rand() * W), y: 46 + Math.round(rand() * (H - 46)), w: 2 + Math.round(rand() * 3), c: rand() > 0.5 ? '#6fae3c' : '#8ccb52' }));
    const river: number[] = [];
    for (let y = 36; y < H; y++) river.push(riverX(y));
    return { patches, river };
  }, []);
  const pathC = '#e3cf9a';
  const bx = riverX(MAIN_PATH.y + 4);
  return (
    <g>
      <rect y={42} width={W} height={H - 42} fill="#7dbb45" />
      <rect y={42} width={W} height={2} fill="#5e9a35" />
      {g.patches.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={1} fill={p.c} />
      ))}
      {/* Caminhos */}
      <rect x={10} y={MAIN_PATH.y - 1} width={W - 20} height={MAIN_PATH.h + 2} fill="#c9b27a" />
      <rect x={10} y={MAIN_PATH.y} width={W - 20} height={MAIN_PATH.h} fill={pathC} />
      {places
        .filter((p) => p.kind !== 'fountain' && p.kind !== 'bridge')
        .map((p) => {
          const y0 = Math.min(p.y, MAIN_PATH.y);
          const y1 = Math.max(p.y, MAIN_PATH.y + MAIN_PATH.h);
          return (
            <g key={p.id}>
              <rect x={p.x - 5} y={y0} width={10} height={y1 - y0} fill="#c9b27a" />
              <rect x={p.x - 4} y={y0} width={8} height={y1 - y0} fill={pathC} />
            </g>
          );
        })}
      {scenery.pebbles.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1} height={1} fill={i % 2 ? '#cdb983' : '#f0e2b8'} />
      ))}
      <ellipse cx={PLAZA.x} cy={PLAZA.y} rx={25} ry={13} fill="#bdb49a" />
      <ellipse cx={PLAZA.x} cy={PLAZA.y} rx={24} ry={12} fill="#d9d2bf" />
      <ellipse cx={PLAZA.x} cy={PLAZA.y} rx={17} ry={8} fill="none" stroke="#c9c0a6" strokeWidth={1} />
      {/* Sombras das construções */}
      {places.filter((p) => p.kind !== 'bridge').map((p) => (
        <ellipse key={p.id} cx={p.x + (p.kind === 'church' ? 6 : 2)} cy={p.y + 1} rx={p.kind === 'church' ? 34 : p.kind === 'hotel' ? 38 : p.kind === 'board' ? 18 : 24} ry={3} fill="#000" opacity={0.13} />
      ))}
      {/* Rio e ponte */}
      {g.river.map((x, i) => (
        <g key={i}>
          <rect x={x - RIVER_HALF - 1} y={36 + i} width={RIVER_HALF * 2 + 2} height={1} fill="#2c7f42" />
          <rect x={x - RIVER_HALF} y={36 + i} width={RIVER_HALF * 2} height={1} fill="#12a3a0" />
          <rect x={x - RIVER_HALF + 2} y={36 + i} width={2} height={1} fill="#0e8f8c" />
        </g>
      ))}
      <BridgeDeck bx={bx} />
    </g>
  );
});

/** Tufos de grama e flores que balançam ao vento, cada um no seu ritmo. */
const Meadow = memo(function Meadow({ scenery }: { scenery: Scenery }) {
  return (
    <g>
      {scenery.tufts.map((t, i) => (
        <g key={`t${i}`} className="cw-sway" style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s`, '--a': '9deg' } as CSSProperties}>
          <rect x={t.x} y={t.y - 2} width={1} height={2} fill={t.c} />
          <rect x={t.x + 1} y={t.y - 3} width={1} height={3} fill={t.c} />
          <rect x={t.x + 2} y={t.y - 2} width={1} height={2} fill={t.c} />
        </g>
      ))}
      {scenery.flowers.map((f, i) => (
        <g key={`f${i}`} className="cw-sway" style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, '--a': '12deg' } as CSSProperties}>
          <rect x={f.x} y={f.y - 2} width={1} height={2} fill="#3a8a35" />
          <rect x={f.x - 1} y={f.y - 3} width={3} height={1} fill={f.c} />
          <rect x={f.x} y={f.y - 4} width={1} height={3} fill={f.c} />
          <rect x={f.x} y={f.y - 3} width={1} height={1} fill="#f2b705" />
        </g>
      ))}
      {scenery.benches.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={b.y + 3} width={12} height={1} fill="#000" opacity={0.15} />
          <rect x={b.x} y={b.y - 3} width={12} height={1} fill="#7a4a25" />
          <rect x={b.x} y={b.y - 1} width={12} height={2} fill="#a0703e" />
          <rect x={b.x + 1} y={b.y + 1} width={1} height={2} fill="#5c3a1c" />
          <rect x={b.x + 10} y={b.y + 1} width={1} height={2} fill="#5c3a1c" />
        </g>
      ))}
    </g>
  );
});

const CityTree = memo(function CityTree({ x, y, dur, delay, shaking, onTap }: { x: number; y: number; dur: number; delay: number; shaking: boolean; onTap: (x: number, y: number) => void }) {
  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onTap(x, y);
      }}
      className="cw-tap"
    >
      <ellipse cx={x + 1} cy={y} rx={8} ry={2} fill="#000" opacity={0.14} />
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : `${dur}s`, animationDelay: shaking ? undefined : `${delay}s` }}>
        <g transform={`translate(${x - (TREE_W * TREE_SCALE) / 2} ${y - TREE_H * TREE_SCALE}) scale(${TREE_SCALE})`}>
          <Pixels runs={treeRuns} />
        </g>
      </g>
    </g>
  );
});

const Lamp = memo(function Lamp({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <g>
      <rect x={x - 1} y={y} width={4} height={1} fill="#000" opacity={0.18} />
      <rect x={x} y={y - 16} width={1} height={16} fill="#3c4a52" />
      <rect x={x - 1} y={y - 2} width={3} height={2} fill="#3c4a52" />
      <rect x={x - 2} y={y - 19} width={5} height={1} fill="#3c4a52" />
      <rect x={x - 1} y={y - 18} width={3} height={2} fill={night ? '#fff2b0' : '#dfe8e6'} />
    </g>
  );
});

/* ---- Coisas vivas ---- */

interface Npc extends Vec {
  id: number;
  path: Vec[];
  wait: number;
  walk: number;
  speed: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
}

type PKind = 'leaf' | 'dust' | 'spark' | 'ripple' | 'note' | 'drop' | 'marker' | 'petal';
interface Particle extends Vec {
  id: number;
  kind: PKind;
  vx: number;
  vy: number;
  age: number;
  life: number;
  c: string;
  seed: number;
  floor?: number;
}

interface Flyer extends Vec {
  id: number;
  tx: number;
  ty: number;
  c: string;
  rest: number;
  phase: number;
  speed: number;
  flee: number;
}

interface Glow extends Vec {
  ph: number;
  f: number;
  vx: number;
  vy: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

interface Flock {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  birds: { dx: number; dy: number; ph: number }[];
}

interface Dove extends Vec {
  mode: 'follow' | 'perch' | 'loop';
  t0: number;
  face: number;
  peck: number;
  hopX: number;
  nextHop: number;
  say: string | null;
  sayUntil: number;
  landed: boolean;
}

let uid = 1;

function initLife(places: Place[], targets: Vec[]) {
  const fountain = places.find((p) => p.kind === 'fountain');
  return {
    npcs: Array.from({ length: 4 }, (): Npc => {
      const at = pick(targets);
      return { id: uid++, x: at.x, y: at.y, path: [], wait: rnd(0, 3), walk: 0, speed: rnd(16, 26), config: randomLook(), say: null, sayUntil: 0 };
    }),
    particles: [] as Particle[],
    flyers: Array.from({ length: 6 }, (): Flyer => {
      const x = rnd(20, W - 20);
      const y = rnd(60, H - 10);
      return { id: uid++, x, y, tx: x, ty: y, c: pick(['#f2b705', '#ec6a8c', '#ffffff', '#7fb8ff', '#ff8a5c']), rest: rnd(0, 2), phase: rnd(0, 6), speed: rnd(10, 18), flee: 0 };
    }),
    glows: Array.from({ length: 18 }, (): Glow => ({ x: rnd(10, W - 10), y: rnd(56, H - 4), ph: rnd(0, 6), f: rnd(1.2, 3.2), vx: rnd(-3, 3), vy: rnd(-2, 2) })),
    clouds: Array.from({ length: 5 }, (): Cloud => ({ x: rnd(-40, W), y: rnd(2, 24), w: rnd(14, 32), speed: rnd(1.2, 3.6) })),
    flocks: [] as Flock[],
    timers: { spark: 0, leaf: rnd(1, 3), flock: rnd(4, 12), drop: 0, dust: 0, glint: 0 },
    fountain: fountain ? { x: fountain.x, y: fountain.y - 8 } : null,
  };
}

/* ---- Componente ---- */

export interface CityWorldProps {
  places: Place[];
  time: DayTime;
  /** Chamado quando o personagem chega a um lugar liberado (com a posição da porta na tela). */
  onArrive?: (p: Place, screen: Vec) => void;
  /** Modo vitrine (tela de abertura): sem personagem, a câmera passeia sozinha. */
  demo?: boolean;
  introLines?: string[];
  introKey?: string;
  /** Aparência do personagem da criança (montado em /personagem). */
  hero?: AvatarConfig | null;
  /** Congela a tela (usado ao trocar de página: a navegação do roteador é de baixa prioridade e não pode competir com 60 quadros por segundo). */
  paused?: boolean;
  children?: ReactNode;
}

export function CityWorld({ places, time, onArrive, demo, introLines, introKey = 'cidade:intro:v3', hero = null, paused, children }: CityWorldProps) {
  const night = time === 'night';
  const scenery = useMemo(() => makeScenery(places), [places]);
  const targets = useMemo<Vec[]>(
    () => [
      ...places.map((p) => ({ x: p.x, y: p.y + 6 })),
      ...[30, 70, 130, 170, 230, 270, 330, 370].map((x) => ({ x, y: MAIN_PATH.y + 4 })),
      { x: PLAZA.x - 14, y: PLAZA.y + 10 },
      { x: PLAZA.x + 14, y: PLAZA.y + 10 },
      { x: PLAZA.x - 22, y: PLAZA.y - 8 },
    ],
    [places],
  );

  const viewport = useRef<HTMLDivElement>(null);
  const worldEl = useRef<HTMLDivElement>(null);
  const farRef = useRef<SVGGElement>(null);
  const cloudRef = useRef<SVGGElement>(null);
  const [scale, setScale] = useState(4);
  const size = useRef({ vw: 1280, vh: 720, s: 4 });
  const cam = useRef({ x: 0, y: 0, free: false, ready: false });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const suppress = useRef(false);

  const pos = useRef({ ...SPAWN });
  const face = useRef(1);
  const idle = useRef(0);
  const frame = useRef<0 | 1 | 2>(0);
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number; enter?: Place } | null>(null);
  const waypoints = useRef<Vec[]>([]);
  const dove = useRef<Dove>({ x: SPAWN.x + 14, y: SPAWN.y - 22, mode: 'follow', t0: 0, face: 1, peck: 0, hopX: 9, nextHop: 0, say: null, sayUntil: 0, landed: false });
  const life = useRef(initLife(places, targets));
  const clock = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = !!paused;
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [shaking, setShaking] = useState<string | null>(null);
  const [soon, setSoon] = useState<{ p: Place; until: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  /** Mestres do Saber parados na porta de casa: balão de saudação e piscadas, cada um no seu tempo. */
  const masters = useRef(new Map<string, { say: string | null; until: number; next: number; blink: number }>());
  const [intro, setIntro] = useState<number | null>(() => {
    if (demo || !introLines?.length) return null;
    try {
      return localStorage.getItem(introKey) ? null : 0;
    } catch {
      return null;
    }
  });

  const arriveRef = useRef<(p: Place) => void>(() => {});
  arriveRef.current = (p: Place) => {
    if (p.soon) {
      sfx('pop');
      setSoon({ p, until: clock.current + 2.6 });
      return;
    }
    const { s } = size.current;
    onArrive?.(p, { x: (p.x - cam.current.x) * s, y: (p.y - 14 - cam.current.y) * s });
  };



  const spawn = (kind: PKind, x: number, y: number, o: Partial<Particle> = {}) => {
    const list = life.current.particles;
    if (list.length > 220) list.shift();
    list.push({ id: uid++, kind, x, y, vx: 0, vy: 0, age: 0, life: 1, c: '#fff', seed: Math.random() * 6, ...o });
  };

  const goTo = useCallback((x: number, y: number, enter?: Place) => {
    waypoints.current = route(pos.current, { x, y }).slice(0, -1);
    target.current = { x, y, enter };
    cam.current.free = false;
  }, []);

  const ringBell = useCallback((p: Place) => {
    sfx('bell');
    for (let i = 0; i < 4; i++) spawn('note', p.x - 4 + rnd(-3, 3), p.y - 46, { vx: rnd(-5, 5), vy: rnd(-12, -7), life: rnd(1.4, 2.2), c: pick(['#1d3f86', '#2f5fb3', '#d64545']), seed: rnd(0, 6) + i });
  }, []);

  const enterPlace = useCallback(
    (p: Place) => {
      if (suppress.current || demo) return;
      if (p.kind === 'church') ringBell(p);
      goTo(p.x, p.y + 3, p);
    },
    [demo, goTo, ringBell],
  );

  const tapTree = useCallback((x: number, y: number) => {
    if (suppress.current || demo) return;
    const id = `${x}:${y}`;
    setShaking(id);
    setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
    sfx('rustle');
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++)
      spawn(Math.random() > 0.8 ? 'petal' : 'leaf', x + rnd(-6, 6), y - rnd(8, 16), { vx: rnd(-4, 4), vy: rnd(5, 10), life: rnd(1.6, 2.8), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: y + rnd(-2, 4) });
    if (Math.random() < 0.35) {
      sfx('chirp');
      life.current.flocks.push({ id: uid++, x, y: y - 14, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
    }
  }, [demo]);

  // Tamanho da tela → escala que cobre a tela inteira (sem bordas), em qualquer formato.
  useEffect(() => {
    const el = viewport.current!;
    const update = () => {
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const s = Math.max(vw / W, vh / H);
      size.current = { vw, vh, s };
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!demo) viewport.current?.focus({ preventScroll: true });
  }, [demo]);

  // A dica de como andar some sozinha depois de um tempo (ou no primeiro toque no chão).
  useEffect(() => {
    if (intro !== null) return;
    const id = setTimeout(() => setHint(false), 9000);
    return () => clearTimeout(id);
  }, [intro]);

  // Laço principal: personagem, câmera, pomba, moradores e todo o ambiente.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let walkT = 0;
    let stuck = 0;
    const L = life.current;
    const tick = (now: number) => {
      if (pausedRef.current) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock.current += dt;
      const t = clock.current;
      const p = pos.current;

      // Personagem
      let moving = false;
      if (!demo) {
        const k = keys.current;
        let dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
        let dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
        if (dx || dy) {
          target.current = null;
          waypoints.current = [];
          cam.current.free = false;
        } else if (target.current) {
          const wp = waypoints.current[0] ?? target.current;
          const vx = wp.x - p.x;
          const vy = wp.y - p.y;
          const dist = Math.hypot(vx, vy);
          if (dist < 1.5) {
            if (waypoints.current.length) waypoints.current.shift();
            else {
              const dest = target.current.enter;
              target.current = null;
              if (dest) arriveRef.current(dest);
            }
          } else {
            dx = vx / dist;
            dy = vy / dist;
          }
        }
        moving = !!(dx || dy);
        if (moving) {
          const n = Math.hypot(dx, dy);
          if (Math.abs(dx) > 0.2) face.current = dx > 0 ? 1 : -1;
          const nx = clamp(p.x + (dx / n) * SPEED * dt, BOUNDS.x0, BOUNDS.x1);
          const ny = clamp(p.y + (dy / n) * SPEED * dt, BOUNDS.y0, BOUNDS.y1);
          const before = p.x + p.y;
          if (!inRiver(nx, p.y)) p.x = nx;
          if (!inRiver(p.x, ny)) p.y = ny;
          stuck = Math.abs(p.x + p.y - before) < 0.01 ? stuck + 1 : 0;
          if (stuck > 20) {
            target.current = null;
            waypoints.current = [];
          }
          walkT += dt;
          idle.current = 0;
          L.timers.dust -= dt;
          if (L.timers.dust <= 0) {
            L.timers.dust = rnd(0.12, 0.2);
            spawn('dust', p.x - face.current * 2 + rnd(-1, 1), p.y - 0.5, { vx: -face.current * rnd(1, 4), vy: rnd(-4, -2), life: rnd(0.35, 0.6), c: '#e8dcb8' });
          }
        } else {
          walkT = 0;
          idle.current += dt;
        }
        frame.current = (moving ? (Math.floor(walkT / 0.14) % 2) + 1 : 0) as 0 | 1 | 2;
      }

      // Câmera (segue o personagem; no modo vitrine passeia sozinha)
      const { vw, vh, s } = size.current;
      const maxX = Math.max(0, W - vw / s);
      const maxY = Math.max(0, H - vh / s);
      const c = cam.current;
      if (demo) {
        c.x = clamp(maxX / 2 + Math.sin(t * 0.05) * (maxX / 2), 0, maxX);
        c.y = clamp(maxY / 2 + Math.sin(t * 0.037 + 1) * (maxY / 2), 0, maxY);
      } else if (!c.free) {
        const tx = clamp(p.x - vw / s / 2, 0, maxX);
        const ty = clamp(p.y - 14 - vh / s / 2, 0, maxY);
        const k = c.ready ? Math.min(1, dt * 3.2) : 1;
        c.x += (tx - c.x) * k;
        c.y += (ty - c.y) * k;
      }
      c.x = clamp(c.x, 0, maxX);
      c.y = clamp(c.y, 0, maxY);
      c.ready = true;
      if (worldEl.current) worldEl.current.style.transform = `translate3d(${Math.round(-c.x * s)}px, ${Math.round(-c.y * s)}px, 0)`;
      const par = `translate(${(c.x * PARALLAX).toFixed(2)} ${(c.y * PARALLAX).toFixed(2)})`;
      farRef.current?.setAttribute('transform', par);
      cloudRef.current?.setAttribute('transform', `translate(${(c.x * 0.25).toFixed(2)} ${(c.y * 0.25).toFixed(2)})`);

      // Pomba: segue de perto, pousa e cisca quando você para, dá piruetas quando tocada.
      const d = dove.current;
      let gx: number;
      let gy: number;
      if (demo) {
        gx = c.x + vw / s / 2 + Math.sin(t * 0.6) * 40 + Math.sin(t * 1.7) * 6;
        gy = c.y + vh / s / 2 - 10 + Math.sin(t * 0.9) * 14 + Math.sin(t * 2.3) * 3;
        d.mode = 'follow';
      } else if (d.mode === 'loop') {
        const a = (t - d.t0) * 4.2;
        gx = p.x + Math.cos(a) * 18;
        gy = p.y - 26 + Math.sin(a) * 9;
        if (t - d.t0 > 1.5) d.mode = 'follow';
      } else if (idle.current > 3.2) {
        if (d.mode !== 'perch') {
          d.mode = 'perch';
          d.hopX = pick([-1, 1]) * rnd(8, 12);
          d.nextHop = t + rnd(2, 4);
        }
        if (t > d.nextHop) {
          d.hopX = clamp(d.hopX + rnd(-6, 6), -14, 14);
          if (Math.abs(d.hopX) < 6) d.hopX = d.hopX < 0 ? -7 : 7;
          d.nextHop = t + rnd(1.5, 4.5);
        }
        gx = p.x + d.hopX;
        gy = p.y + 1;
      } else {
        d.mode = 'follow';
        gx = p.x - face.current * 12 + Math.sin(t * 1.3) * 3 + Math.sin(t * 0.71 + 2) * 2;
        gy = p.y - 22 + Math.sin(t * 1.9) * 2 + Math.sin(t * 0.53) * 1.5;
      }
      const ddx = gx - d.x;
      const ddy = gy - d.y;
      const follow = d.mode === 'perch' ? 2.4 : 3;
      d.x += ddx * Math.min(1, dt * follow);
      d.y += ddy * Math.min(1, dt * follow);
      if (Math.abs(ddx) > 0.6) d.face = ddx > 0 ? 1 : -1;
      d.landed = d.mode === 'perch' && Math.hypot(ddx, ddy) < 1.2;
      if (d.landed) {
        d.face = d.hopX < 0 ? 1 : -1;
        if (d.peck <= 0 && Math.random() < dt * 1.4) d.peck = 0.18;
        d.peck = Math.max(0, d.peck - dt);
      }

      // Moradores passeando
      for (const n of L.npcs) {
        if (n.wait > 0) {
          n.wait -= dt;
          n.walk = 0;
          continue;
        }
        const wp = n.path[0];
        if (!wp) {
          n.path = route(n, (() => {
            const g = pick(targets);
            return { x: g.x + rnd(-4, 4), y: g.y + rnd(-2, 2) };
          })());
          continue;
        }
        const vx = wp.x - n.x;
        const vy = wp.y - n.y;
        const dist = Math.hypot(vx, vy);
        if (dist < 1) {
          n.path.shift();
          if (!n.path.length) {
            n.wait = rnd(1.5, 6);
            if (Math.random() < 0.15 && t > n.sayUntil) {
              n.say = pick(night ? NPC_LINES_NIGHT : NPC_LINES_DAY);
              n.sayUntil = t + 2.6;
            }
          }
        } else {
          n.x += (vx / dist) * n.speed * dt;
          n.y += (vy / dist) * n.speed * dt;
          n.walk += dt;
        }
      }

      // Brilhinhos em volta da casa de quem já pode ser visitado (chamam o olhar sem exagero)
      L.timers.glint -= dt;
      if (L.timers.glint <= 0) {
        L.timers.glint = rnd(0.35, 0.8);
        const fx = places.filter((pl) => pl.master && !pl.soon);
        if (fx.length) {
          const pl = pick(fx);
          spawn('spark', pl.x + rnd(-22, 22), pl.y - rnd(4, 32), { life: rnd(0.6, 1.1), vy: rnd(-5, -2), c: pick(['#fff3b0', '#ffffff', '#ffd76a']) });
        }
      }

      // Mestres do Saber cumprimentam quem passa
      for (const pl of places) {
        if (!pl.master || pl.soon) continue;
        let m = masters.current.get(pl.id);
        if (!m) masters.current.set(pl.id, (m = { say: null, until: 0, next: t + rnd(2, 5), blink: t + rnd(1, 4) }));
        if (t > m.next) {
          const close = !demo && Math.hypot(p.x - pl.x, p.y - pl.y) < 40;
          m.say = pick(pl.master.greetings);
          m.until = t + 2.8;
          m.next = t + (close ? rnd(4, 7) : rnd(9, 16));
        }
        if (t > m.blink + 0.16) m.blink = t + rnd(2, 5);
      }

      // Borboletas (dia) e vagalumes (noite)
      if (!night) {
        for (const f of L.flyers) {
          const away = Math.hypot(f.x - p.x, f.y - p.y) < 12 && !demo;
          if (away && f.flee <= 0) {
            f.flee = 1.2;
            f.tx = clamp(f.x + (f.x - p.x) * 3 + rnd(-20, 20), 10, W - 10);
            f.ty = clamp(f.y + (f.y - p.y) * 3 - 10, 54, H - 4);
            f.rest = 0;
          }
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
            f.tx = clamp(f.x + rnd(-50, 50), 10, W - 10);
            f.ty = clamp(f.y + rnd(-30, 30), 54, H - 4);
          } else {
            const sp = f.speed * (f.flee > 0 ? 2.6 : 1);
            f.x += (vx / dist) * sp * dt + Math.sin(t * 3.1 + f.phase) * 6 * dt;
            f.y += (vy / dist) * sp * dt + Math.sin(t * 5.3 + f.phase * 2) * 9 * dt;
          }
        }
      } else {
        for (const g of L.glows) {
          g.vx += rnd(-6, 6) * dt;
          g.vy += rnd(-6, 6) * dt;
          g.vx = clamp(g.vx, -4, 4);
          g.vy = clamp(g.vy, -3, 3);
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          if (g.x < 6 || g.x > W - 6) g.vx *= -1;
          if (g.y < 54 || g.y > H - 2) g.vy *= -1;
        }
      }

      // Nuvens
      for (const cl of L.clouds) {
        cl.x += cl.speed * dt;
        if (cl.x > W + 60) {
          cl.x = -60 - cl.w;
          cl.y = rnd(2, 24);
          cl.w = rnd(14, 32);
          cl.speed = rnd(1.2, 3.6);
        }
      }

      // Bandos de passarinhos atravessando o céu de vez em quando
      L.timers.flock -= dt;
      if (L.timers.flock <= 0) {
        L.timers.flock = rnd(9, 24);
        const dir = pick([-1, 1]);
        const n = 2 + Math.floor(Math.random() * 4);
        L.flocks.push({
          id: uid++,
          x: dir > 0 ? -20 : W + 20,
          y: rnd(6, 30),
          vx: dir * rnd(22, 34),
          vy: rnd(-1.5, 1.5),
          birds: Array.from({ length: n }, (_, i) => ({ dx: -dir * i * rnd(5, 8), dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * rnd(2, 4), ph: rnd(0, 6) })),
        });
      }
      for (const f of L.flocks) {
        f.x += f.vx * dt;
        f.y += f.vy * dt + Math.sin(t * 1.3 + f.id) * 2 * dt;
      }
      L.flocks = L.flocks.filter((f) => f.x > -60 && f.x < W + 60 && f.y > -30);

      // Partículas: brilhos no rio, gotas do chafariz, folhas caindo, poeira, ondinhas...
      L.timers.spark -= dt;
      if (L.timers.spark <= 0) {
        L.timers.spark = rnd(0.06, 0.2);
        const y = rnd(46, H);
        if (y < BRIDGE.y0 - 1 || y > BRIDGE.y1 + 2) spawn('spark', riverX(y) + rnd(-RIVER_HALF + 1, RIVER_HALF - 2), y, { life: rnd(0.4, 1.1), vy: rnd(0.5, 2), c: night ? '#8fd6e0' : '#e9fbff' });
      }
      if (L.fountain) {
        L.timers.drop -= dt;
        if (L.timers.drop <= 0) {
          L.timers.drop = rnd(0.03, 0.08);
          spawn('drop', L.fountain.x + rnd(-0.5, 0.5), L.fountain.y - 18, { vx: rnd(-7, 7), vy: rnd(-24, -14), life: 2, c: pick(['#bfeaf2', '#7fd8d4', '#ffffff']), floor: L.fountain.y - 1 });
        }
      }
      L.timers.leaf -= dt;
      if (L.timers.leaf <= 0) {
        L.timers.leaf = rnd(1.2, 4);
        const tr = pick(scenery.trees);
        spawn('leaf', tr.x + rnd(-5, 5), tr.y - rnd(8, 15), { vx: rnd(-2, 2), vy: rnd(4, 7), life: rnd(2.4, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a', '#d9a441']), floor: tr.y + rnd(-1, 5) });
      }
      for (const q of L.particles) {
        q.age += dt;
        if (q.kind === 'drop') {
          q.vy += 70 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          if (q.vy > 0 && q.y > (q.floor ?? H)) q.age = q.life;
        } else if (q.kind === 'leaf' || q.kind === 'petal') {
          if (q.y < (q.floor ?? H)) {
            q.x += (q.vx + Math.sin(q.age * 3 + q.seed) * 7) * dt;
            q.y += q.vy * dt;
          } else q.age += dt; // no chão, some mais rápido
        } else if (q.kind === 'note') {
          q.x += (q.vx + Math.sin(q.age * 5 + q.seed) * 6) * dt;
          q.y += q.vy * dt;
        } else {
          q.x += q.vx * dt;
          q.y += q.vy * dt;
        }
      }
      L.particles = L.particles.filter((q) => q.age < q.life);

      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, night, scenery, targets]);

  const p = pos.current;
  const near = demo ? null : (places.find((pl) => Math.abs(p.x - pl.x) < 13 && p.y >= pl.y - 6 && p.y <= pl.y + 12) ?? null);
  const t = clock.current;
  const L = life.current;
  const d = dove.current;

  const closeIntro = () => {
    setIntro(null);
    try {
      localStorage.setItem(introKey, '1');
    } catch {
      /* ignorado */
    }
    viewport.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (demo) return;
    const key = e.key.toLowerCase();
    if (intro !== null && introLines) {
      if (key === 'enter' || key === ' ') {
        e.preventDefault();
        if (intro < introLines.length - 1) setIntro(intro + 1);
        else closeIntro();
      }
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if ((key === 'e' || key === 'enter' || key === ' ') && near) return arriveRef.current(near);
    keys.current.add(key);
  };

  // Arrastar move a câmera; um toque curto anda ou interage.
  const onPointerDown = (e: PointerEvent) => {
    if (demo || e.button > 0) return;
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.current.x, cy: cam.current.y, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const dr = drag.current;
    if (!dr) return;
    const dx = e.clientX - dr.x;
    const dy = e.clientY - dr.y;
    if (!dr.moved && Math.hypot(dx, dy) < 8) return;
    dr.moved = true;
    cam.current.free = true;
    const { s } = size.current;
    cam.current.x = dr.cx - dx / s;
    cam.current.y = dr.cy - dy / s;
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
    }
    drag.current = null;
  };

  const toWorld = (e: MouseEvent) => {
    const r = worldEl.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onGroundClick = (e: MouseEvent<SVGSVGElement>) => {
    if (suppress.current || demo || intro !== null) return;
    setHint(false);
    const { x, y } = toWorld(e);
    if (Math.abs(x - riverX(y)) < RIVER_HALF + 1 && (y < BRIDGE.y0 || y > BRIDGE.y1)) {
      sfx('splash');
      spawn('ripple', x, y, { life: 1.1, c: '#d6f6fa' });
      setTimeout(() => spawn('ripple', x, y, { life: 0.9, c: '#d6f6fa' }), 180);
      for (let i = 0; i < 6; i++) spawn('drop', x, y, { vx: rnd(-10, 10), vy: rnd(-26, -14), life: 1.5, c: '#bfeaf2', floor: y });
      return;
    }
    if (y < 48) return;
    spawn('marker', x, y, { life: 0.6, c: '#ffffff' });
    goTo(clamp(x, BOUNDS.x0, BOUNDS.x1), clamp(y, BOUNDS.y0, BOUNDS.y1));
    viewport.current?.focus({ preventScroll: true });
  };

  const tapNpc = (n: Npc) => {
    if (suppress.current || demo) return;
    sfx('pop');
    n.say = pick(night ? NPC_LINES_NIGHT : NPC_LINES_DAY);
    n.sayUntil = t + 2.8;
    n.wait = Math.max(n.wait, 2.4);
  };

  const tapDove = () => {
    if (suppress.current || demo) return;
    sfx('chirp');
    d.mode = 'loop';
    d.t0 = t;
    d.say = pick(DOVE_LINES);
    d.sayUntil = t + 3.2;
    for (let i = 0; i < 5; i++) spawn('spark', d.x + rnd(-4, 4), d.y + rnd(-4, 2), { life: rnd(0.4, 0.8), vy: rnd(-6, -2), vx: rnd(-4, 4), c: '#ffffff' });
  };

  const tapMaster = (pl: Place) => {
    if (suppress.current || demo || !pl.master) return;
    const m = masters.current.get(pl.id);
    if (m) {
      m.say = pick(pl.master.greetings);
      m.until = t + 2.8;
      m.next = t + rnd(6, 10);
    }
    enterPlace(pl);
  };

  const tapFlyer = (f: Flyer) => {
    if (suppress.current || demo) return;
    sfx('chirp');
    f.flee = 1.4;
    f.rest = 0;
    f.tx = clamp(f.x + rnd(-60, 60), 10, W - 10);
    f.ty = clamp(f.y - rnd(10, 30), 54, H - 4);
    for (let i = 0; i < 4; i++) spawn('spark', f.x, f.y, { life: rnd(0.4, 0.7), vx: rnd(-6, 6), vy: rnd(-6, 2), c: f.c });
  };

  // Profundidade: quem está mais embaixo na tela é desenhado por cima.
  const entities: { key: string; y: number; node: ReactNode }[] = [
    ...places.map((pl) => ({
      key: pl.id,
      y: pl.y,
      node: (
        <g className={pl.master && !pl.soon ? 'cw-featured' : undefined} onPointerEnter={() => setHover(pl.id)} onPointerLeave={() => setHover((h) => (h === pl.id ? null : h))}>
          <Building p={pl} night={night} onEnter={enterPlace} highlight={near?.id === pl.id} noSign />
        </g>
      ),
    })),
    ...scenery.trees.map((tr) => ({
      key: `t${tr.x}:${tr.y}`,
      y: tr.y,
      node: <CityTree x={tr.x} y={tr.y} dur={tr.dur} delay={tr.delay} shaking={shaking === `${tr.x}:${tr.y}`} onTap={tapTree} />,
    })),
    ...scenery.lamps.map((l) => ({ key: `l${l.x}`, y: l.y, node: <Lamp x={l.x} y={l.y} night={night} /> })),
    ...places
      .filter((pl) => pl.master && !pl.soon)
      .map((pl) => {
        const m = masters.current.get(pl.id);
        const waving = !!m?.say && m.until > t;
        const frame: MasterFrame = waving && Math.sin(t * 12) > 0 ? 'wave' : m && t > m.blink && t < m.blink + 0.16 ? 'blink' : 'stand';
        return {
          key: `m${pl.id}`,
          y: pl.y + 4,
          node: (
            <g
              className="cw-tap"
              onClick={(e) => {
                e.stopPropagation();
                tapMaster(pl);
              }}
              role="button"
              aria-label={`Conversar com ${pl.master!.name}`}
            >
              <MasterSprite id={pl.id} x={pl.x + masterSpot(pl)} y={pl.y + 4} frame={frame} />
            </g>
          ),
        };
      }),
    ...L.npcs.map((n) => ({
      key: `n${n.id}`,
      y: n.y,
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapNpc(n);
          }}
        >
          <Character x={n.x} y={n.y} config={n.config} frame={n.walk > 0 ? ((Math.floor(n.walk / 0.17) % 2) + 1) as 1 | 2 : 0} />
        </g>
      ),
    })),
    ...(demo ? [] : [{ key: 'me', y: p.y + 0.1, node: <Character x={p.x} y={p.y} config={hero} frame={frame.current} me /> }]),
  ].sort((a, b) => a.y - b.y);

  const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const flap = d.landed ? false : Math.sin(t * (d.mode === 'loop' ? 30 : 20) + Math.sin(t * 3) * 2) > 0;
  const soonNow = soon && soon.until > t ? soon.p : null;

  return (
    <div
      className={`cw time-${time} ${demo ? 'demo' : ''}`}
      ref={viewport}
      tabIndex={demo ? -1 : 0}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => keys.current.delete(e.key.toLowerCase())}
      onBlur={() => keys.current.clear()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label="Mapa de Cataguases: toque no chão para andar e nos lugares para visitar"
    >
      <div className="cw-world" ref={worldEl} style={{ width: W * scale, height: H * scale }}>
        <svg className="cw-canvas" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" onClick={onGroundClick}>
          <Backdrop time={time} farRef={farRef} scenery={scenery} />
          <g ref={cloudRef}>
            {L.clouds.map((cl, i) => (
              <g key={i} fill={night ? '#3a5068' : time === 'dusk' ? '#ffe3d6' : '#ffffff'} opacity={night ? 0.55 : 0.92}>
                <rect x={cl.x} y={cl.y} width={cl.w} height={5} />
                <rect x={cl.x + cl.w * 0.2} y={cl.y - 4} width={cl.w * 0.45} height={4} />
                <rect x={cl.x + cl.w * 0.55} y={cl.y - 2} width={cl.w * 0.3} height={2} />
                <rect x={cl.x + 2} y={cl.y + 5} width={cl.w - 4} height={1} fill={night ? '#2c3e52' : '#d6e8f0'} />
              </g>
            ))}
          </g>
          {L.flocks.map((f) =>
            f.birds.map((b, i) => {
              const up = Math.sin(t * 14 + b.ph) > 0;
              const x = f.x + b.dx;
              const y = f.y + b.dy;
              return (
                <g key={`${f.id}-${i}`} fill={night ? '#9fb3c8' : '#1b2b33'}>
                  <rect x={x} y={y} width={1} height={1} />
                  <rect x={x - 2} y={up ? y - 1 : y + 1} width={2} height={1} />
                  <rect x={x + 1} y={up ? y - 1 : y + 1} width={2} height={1} />
                </g>
              );
            }),
          )}
          <Ground places={places} scenery={scenery} />
          {/* Sombras das nuvens passando pelo chão */}
          {!night &&
            L.clouds.map((cl, i) => <rect key={i} className="cw-cloud-shadow" x={cl.x * 1.1 + 10} y={70 + cl.y * 4} width={cl.w * 1.4} height={9} fill="#0b3a20" opacity={0.07} />)}
          <Meadow scenery={scenery} />
          {entities.map((e) => (
            <g key={e.key}>{e.node}</g>
          ))}

          {/* Partículas */}
          {L.particles.map((q) => {
            const fade = 1 - q.age / q.life;
            switch (q.kind) {
              case 'ripple': {
                const r = 2 + q.age * 11;
                return <ellipse key={q.id} cx={q.x} cy={q.y} rx={r} ry={r * 0.45} fill="none" stroke={q.c} strokeWidth={0.7} opacity={fade} />;
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
                return <rect key={q.id} x={q.x} y={q.y} width={flat ? 2 : 1} height={flat ? 1 : 2} fill={q.kind === 'petal' ? '#ec9ab0' : q.c} opacity={Math.min(1, fade * 2)} />;
              }
              case 'dust':
                return <rect key={q.id} x={q.x} y={q.y} width={2} height={1} fill={q.c} opacity={fade * 0.9} />;
              default:
                return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={q.kind === 'spark' ? Math.sin((q.age / q.life) * Math.PI) : 1} />;
            }
          })}

          {/* Borboletas */}
          {!night &&
            L.flyers.map((f) => {
              const open = f.rest > 0 ? Math.sin(t * 2 + f.phase) > 0.6 : Math.sin(t * 26 + f.phase) > 0;
              const by = f.y + (f.rest > 0 ? 0 : Math.sin(t * 4 + f.phase) * 0.6);
              return (
                <g
                  key={f.id}
                  className="cw-tap"
                  onClick={(e) => {
                    e.stopPropagation();
                    tapFlyer(f);
                  }}
                >
                  <rect x={f.x - 4} y={by - 4} width={9} height={8} fill="transparent" />
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
                  <rect x={f.x} y={by - 1} width={1} height={2} fill="#1b2b33" />
                </g>
              );
            })}

          {/* Pomba */}
          {(() => {
            const groundY = d.mode === 'perch' ? p.y + 1 : p.y;
            const lift = Math.max(0, groundY - d.y);
            return (
              <g
                className="cw-tap"
                onClick={(e) => {
                  e.stopPropagation();
                  tapDove();
                }}
              >
                {!demo && <ellipse cx={d.x} cy={groundY} rx={Math.max(1.5, 4 - lift * 0.08)} ry={1} fill="#000" opacity={Math.max(0.05, 0.2 - lift * 0.006)} />}
                <g transform={`translate(${d.x.toFixed(2)} ${(d.y - 10 + (d.peck > 0 ? 1 : 0)).toFixed(2)}) scale(${d.face * 0.7} 0.7) translate(-8 0)`}>
                  <rect x={0} y={0} width={16} height={14} fill="transparent" />
                  <Pixels runs={flap ? birdUp : birdDown} />
                </g>
              </g>
            );
          })()}

          {night && <rect className="night-tint" width={W} height={H} fill="#0d1b2e" opacity={0.3} pointerEvents="none" />}
          {/* Luzes por cima da noite: postes e vagalumes */}
          {night && (
            <g pointerEvents="none">
              {scenery.lamps.map((l) => (
                <circle key={l.x} className="cw-glow" cx={l.x + 0.5} cy={l.y - 17} r={13} fill="url(#cw-glow)" style={{ animationDuration: `${l.dur}s` }} />
              ))}
              {scenery.lamps.map((l) => (
                <ellipse key={`g${l.x}`} cx={l.x + 0.5} cy={l.y + 1} rx={10} ry={3} fill="#ffe9a8" opacity={0.16} />
              ))}
              {L.glows.map((g, i) => {
                const a = Math.max(0, Math.sin(t * g.f + g.ph));
                return (
                  <g key={i} opacity={a}>
                    <circle cx={g.x} cy={g.y} r={2.2} fill="#fff59a" opacity={0.25} />
                    <rect x={g.x - 0.5} y={g.y - 0.5} width={1} height={1} fill="#fffbd0" />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {/* Placas fixas (não se mexem) e balões de fala */}
        {places.map((pl) => (
          <div key={pl.id} className={`cw-label ${pl.soon ? 'soon' : ''} ${near?.id === pl.id || hover === pl.id ? 'show' : ''}`} style={pct(pl.x, pl.y + (pl.kind === 'church' ? 11 : pl.kind === 'mestre' ? 7 : pl.kind === 'bridge' ? 18 : 4))}>
            {pl.label}
          </div>
        ))}
        {L.npcs
          .filter((n) => n.say && n.sayUntil > t)
          .map((n) => (
            <div key={n.id} className="cw-bubble" style={pct(n.x, n.y - 17)}>
              {n.say}
            </div>
          ))}
        {places.map((pl) => {
          const m = masters.current.get(pl.id);
          if (!pl.master || !m?.say || m.until <= t) return null;
          return (
            <div key={`m${pl.id}`} className="cw-bubble mestre" style={{ ...pct(pl.x + masterSpot(pl), pl.y - 14), background: pl.master.soft }}>
              {m.say}
            </div>
          );
        })}
        {d.say && d.sayUntil > t && (
          <div className="cw-bubble dove" style={pct(d.x, d.y - 12)}>
            {d.say}
          </div>
        )}
        {soonNow && (
          <div className="cw-bubble soon" style={pct(soonNow.x, soonNow.y - 34)}>
            🔨 Em breve!
          </div>
        )}
      </div>

      {!demo &&
        intro === null &&
        places
          .filter((pl) => !pl.soon)
          .map((pl) => {
            const { vw, vh, s } = size.current;
            const sx = (pl.x - cam.current.x) * s;
            const sy = (pl.y - 22 - cam.current.y) * s;
            if (sx > 0 && sx < vw && sy > 0 && sy < vh) return null;
            const m = 60;
            const x = clamp(sx, m, vw - m);
            const y = clamp(sy, 120, vh - 70);
            const ang = Math.atan2(sy - y, sx - x);
            return (
              <button
                key={pl.id}
                className="cw-pointer"
                style={{ left: x, top: y }}
                onClick={() => {
                  sfx('pop');
                  enterPlace(pl);
                }}
                aria-label={`Ir para ${pl.label}`}
              >
                <PixelIcon name={pl.icon} size={22} />
                <span className="cw-pointer-dir" style={{ transform: `rotate(${ang}rad)` }} aria-hidden>
                  <i />
                </span>
              </button>
            );
          })}

      {children}

      {!demo && near && !near.soon && intro === null && (
        <button className="cw-prompt" onClick={() => arriveRef.current(near)}>
          <PixelIcon name={near.icon} size={22} />
          <span>{near.label}</span>
          <strong>{near.master ? 'Conversar ▶' : 'Entrar ▶'}</strong>
        </button>
      )}
      {!demo && !near && intro === null && hint && <div className="cw-hint">Toque no chão para andar · toque nos lugares para explorar</div>}
      {intro !== null && introLines && (
        <div className="cw-dialogue">
          <Dialogue key={intro} text={introLines[intro]}>
            {intro < introLines.length - 1 ? (
              <button className="btn accent sm" onClick={() => setIntro(intro + 1)}>
                Próximo ›
              </button>
            ) : (
              <button className="btn accent sm" onClick={closeIntro}>
                Vamos lá ›
              </button>
            )}
            <button className="btn ghost sm" onClick={closeIntro}>
              Pular
            </button>
          </Dialogue>
        </div>
      )}
    </div>
  );
}
