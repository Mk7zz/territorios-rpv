import { memo, useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { fromAscii, seeded, toRuns, type Run } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import {
  BigTree,
  carRuns,
  clamp,
  Clouds,
  Critters,
  DEPTH,
  EDGE,
  FarHills,
  FULL,
  GROUND_END,
  H,
  Haze,
  INK,
  initAmbient,
  makeBackdrop,
  makeSpawner,
  NearHills,
  ParticleLayer,
  pick,
  rnd,
  SceneBox,
  SceneHud,
  SkyLayer,
  sprite,
  stepAmbient,
  stepParticles,
  TimeTint,
  TownLights,
  uid,
  useBubbles,
  useCamera,
  useDiscoveries,
  useLoop,
  W,
  type Discovery,
  type Particle,
} from './sceneKit';

/*
 * Visita ao Painel do Educandário, na Praça Santa Rita: o muro comprido de azulejos azuis e brancos
 * com as pombas voando (as grandes, brancas, por cima de uma estampa de pombinhas em cada azulejo).
 * Do lado, o portão azul da escola e o muro de tijolinho; atrás, o sobrado bege de telhado vermelho.
 * Na frente, a calçada com a arvorezinha, o poste com os fios, os pombos de verdade e a rua.
 * Tocando numa pomba do painel, ela sai voando de verdade, passeia e volta para o lugar dela.
 */

const CX = 200;
const GROUND = 80;
const CURB = 92;
const ROAD = { y0: 94, y1: 106 };
const MURAL = { x0: 140, x1: 300, y0: 34, y1: GROUND - 1 };
const GATE = { x0: 72, x1: 136, top: 38 };
const BRICK = { x0: 4, x1: GATE.x0, top: 46 };
const HOUSE = { x0: 150, x1: 306, top: 14, eave: 20 };
const WINDOWS = [168, 196, 238, 266];
const POLE_X = 118;
const SAPLING_X = 212;
const BLUE = '#2448a8';
const BLUE_D = '#1a3482';
const TILE = 6;

const DISCOVERIES: Discovery[] = [
  { key: 'pomba', emoji: '🕊️', label: 'As pombas do painel', tip: 'Toque numa pomba branca do painel! 🕊️' },
  { key: 'azulejo', emoji: '🟦', label: 'Os azulejos', tip: 'Toque no azul do painel! 🟦' },
  { key: 'portao', emoji: '🚪', label: 'O portão da escola', tip: 'Toque no portão azul! 🚪' },
  { key: 'janela', emoji: '🪟', label: 'As janelas do sobrado', tip: 'Toque nas janelas lá de cima! 🪟' },
  { key: 'pombos', emoji: '🐦', label: 'Os pombos da calçada', tip: 'Toque nos pombos da calçada! 🐦' },
  { key: 'arvore', emoji: '🌳', label: 'As árvores', tip: 'Toque nas árvores! 🌳' },
  { key: 'carro', emoji: '🚗', label: 'Os carros da rua', tip: 'Toque num carro que passar! 🚗' },
  { key: 'gente', emoji: '👋', label: 'Quem passa na calçada', tip: 'Dê um oi pra quem passa! 👋' },
];

const LINES_DAY = ['Oi! 👋', 'Olha as pombas! 🕊️', 'Que painel azul! 💙', 'Que dia bonito! ☀️', 'Vou pra praça! ⛪'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Olha os vagalumes! ✨', 'O painel de noite! 💙'];

/** Pombas grandes do painel: centro, tamanho e inclinação. */
const DOVES: { x: number; y: number; s: number; r: number }[] = [
  { x: 160, y: 47, s: 1.05, r: -12 },
  { x: 186, y: 66, s: 1.3, r: 14 },
  { x: 210, y: 45, s: 1.15, r: -22 },
  { x: 236, y: 63, s: 1.45, r: 4 },
  { x: 262, y: 44, s: 1.1, r: -16 },
  { x: 284, y: 64, s: 1.05, r: 22 },
];

/** Onde as pombas que saem do painel pousam: no telhado e no fio do poste. */
const PERCHES: [number, number][] = [
  [178, HOUSE.top - 1],
  [214, HOUSE.top - 1],
  [252, HOUSE.top - 1],
  [288, HOUSE.top - 1],
  [POLE_X - 22, 31],
  [POLE_X + 26, 30],
];

/** Pomba estilizada do painel voando para a direita, com a asa larga levantada, em volta de (0, 0). */
const DOVE_PATH = 'M-13 4L-8 2L-3 1L-10 -8L-6 -10L1 -3L4 -1L7 -2L9 -4L11 -4L12 -3L10 -1L7 2L2 4L-3 5L-8 5L-13 7L-11 5Z';

/* ---- Sprites ---- */

const DOVE_PAL = { w: '#f7f8fb', s: '#c9d3e6', y: '#e8a23c', k: INK };
const doveUp = sprite(['ss....', '.ss...', '..wwwk', 'wwwwwy', '.www..'], DOVE_PAL);
const doveDown = sprite(['......', '......', '..wwwk', 'wwwwwy', '.ss...', 'ss....'], DOVE_PAL);
const doveSit = sprite(['...wk', '...wwy', 'wwww.', '.ss..', '.y.y.'], DOVE_PAL);

const PIGEON_PAL = { g: '#a7b1b8', G: '#6f7b84', n: '#4f9a8a', k: INK, y: '#e07a3c', w: '#e4e9ec' };
const pigeonStand = toRuns(fromAscii(['.......gg.', '.......gky', '.GGggggng.', '..GGgwwgg.', '....y..y..'], PIGEON_PAL));
const pigeonPeck = toRuns(fromAscii(['..........', '..........', '.GGgggggg.', '..GGgwwgnn', '....y..yky'], PIGEON_PAL));

/* ---- Cenário ---- */

/** O sobrado de trás: parede bege, telhado de telha vermelha e a fileira de janelas. */
const House = memo(function House() {
  const tiles: ReactNode[] = [];
  for (let x = HOUSE.x0 - 6; x < HOUSE.x1 + 6; x += 3) tiles.push(<rect key={x} x={x} y={HOUSE.top - 4} width={1} height={5} fill="#a8432e" />);
  return (
    <g>
      <rect x={HOUSE.x0} y={HOUSE.eave} width={HOUSE.x1 - HOUSE.x0} height={MURAL.y0 - HOUSE.eave} fill="#efe2c6" />
      <rect x={HOUSE.x0} y={HOUSE.eave} width={HOUSE.x1 - HOUSE.x0} height={2} fill="#000" opacity={0.15} />
      {/* Telhado */}
      <path d={`M${HOUSE.x0 - 8} ${HOUSE.eave + 1}L${HOUSE.x0 + 4} ${HOUSE.top - 6}L${HOUSE.x1 - 4} ${HOUSE.top - 6}L${HOUSE.x1 + 8} ${HOUSE.eave + 1}Z`} fill={INK} />
      <path d={`M${HOUSE.x0 - 6} ${HOUSE.eave}L${HOUSE.x0 + 5} ${HOUSE.top - 5}L${HOUSE.x1 - 5} ${HOUSE.top - 5}L${HOUSE.x1 + 6} ${HOUSE.eave}Z`} fill="#c4553a" />
      {tiles}
      <rect x={HOUSE.x0 - 6} y={HOUSE.eave - 1} width={HOUSE.x1 - HOUSE.x0 + 12} height={1} fill="#8e2f27" />
      {/* Parede lateral com a janela de madeira (a da foto, lá no canto) */}
      <rect x={HOUSE.x1 - 2} y={HOUSE.eave} width={14} height={MURAL.y0 - HOUSE.eave} fill="#e2d4b4" />
      <rect x={HOUSE.x1 + 2} y={HOUSE.eave + 3} width={7} height={8} fill="#8a5a2b" />
      {[4, 6].map((d) => (
        <rect key={d} x={HOUSE.x1 + 2} y={HOUSE.eave + 3 + d} width={7} height={0.5} fill="#6b4423" />
      ))}
    </g>
  );
});

/** Janelas do sobrado; tocando, abre e aparece alguém dando tchau. */
function Windows({ open, who, t, night }: { open: number[]; who: AvatarConfig[]; t: number; night: boolean }) {
  const y0 = HOUSE.eave + 2;
  const h = 9;
  return (
    <g>
      {WINDOWS.map((x, i) => {
        const k = open[i];
        return (
          <g key={x}>
            <rect x={x - 1} y={y0 - 1} width={14} height={h + 2} fill="#f8f4ea" />
            <rect x={x} y={y0} width={12} height={h} fill={night ? '#f3d68a' : '#3d4a52'} />
            {k > 0.3 && (
              <svg x={x} y={y0} width={12} height={h} viewBox={`${x} ${y0} 12 ${h}`} overflow="hidden">
                <Character x={x + 6} y={y0 + h + 9} config={who[i]} frame={Math.sin(t * 10) > 0 ? 1 : 2} />
              </svg>
            )}
            {/* Duas folhas de vidro que correm para os lados */}
            <rect x={x} y={y0} width={6 * (1 - k * 0.85)} height={h} fill={night ? '#ffe7a8' : '#9fc4c8'} opacity={0.85} />
            <rect x={x + 12 - 6 * (1 - k * 0.85)} y={y0} width={6 * (1 - k * 0.85)} height={h} fill={night ? '#ffe7a8' : '#9fc4c8'} opacity={0.85} />
            <rect x={x} y={y0 + h - 1} width={12} height={1} fill="#d8cdb4" />
          </g>
        );
      })}
    </g>
  );
}

/** Muro de tijolinho da esquerda. */
const Bricks = memo(function Bricks() {
  const rows: ReactNode[] = [];
  for (let y = BRICK.top + 2, r = 0; y < GROUND; y += 2.5, r++) {
    rows.push(<rect key={`h${y}`} x={BRICK.x0} y={y} width={BRICK.x1 - BRICK.x0} height={0.5} fill="#a8623a" />);
    for (let x = BRICK.x0 + (r % 2 ? 2 : 5); x < BRICK.x1; x += 6) rows.push(<rect key={`v${x}-${y}`} x={x} y={y} width={0.5} height={2.5} fill="#a8623a" />);
  }
  return (
    <g>
      <rect x={BRICK.x0} y={BRICK.top - 2} width={BRICK.x1 - BRICK.x0} height={2} fill="#e9e4da" />
      <rect x={BRICK.x0} y={BRICK.top} width={BRICK.x1 - BRICK.x0} height={GROUND - BRICK.top} fill="#c98a52" />
      {rows}
      {/* Plaquinha com o número */}
      <rect x={52} y={54} width={9} height={5} fill="#f4f1de" />
      <rect x={54} y={56} width={5} height={1} fill={INK} />
    </g>
  );
});

/** Pátio da escola, que aparece quando o portão abre. */
const Yard = memo(function Yard() {
  return (
    <g>
      <rect x={GATE.x0} y={GATE.top} width={GATE.x1 - GATE.x0} height={GROUND - GATE.top} fill="#e9dcc0" />
      <rect x={GATE.x0} y={GROUND - 10} width={GATE.x1 - GATE.x0} height={10} fill="#cfc2a4" />
      {/* Prédio da escola lá dentro: janelas e a porta verde */}
      {[80, 96, 112].map((x) => (
        <g key={x}>
          <rect x={x} y={46} width={9} height={8} fill="#6f9fc4" />
          <rect x={x + 4} y={46} width={1} height={8} fill="#f4f1de" />
        </g>
      ))}
      <rect x={126} y={56} width={8} height={14} fill="#3f8a5a" />
      {/* Bandeirinhas */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${76 + i * 7} 41L${80 + i * 7} 41L${78 + i * 7} 44Z`} fill={['#d64545', '#f2b705', '#12a3a0', '#8cc63f'][i % 4]} />
      ))}
      <rect x={74} y={40.5} width={60} height={0.5} fill="#6b5a48" />
    </g>
  );
});

/** Portão azul de tábuas, que corre para a esquerda. */
function Gate({ k }: { k: number }) {
  const shift = k * (GATE.x1 - GATE.x0 - 6);
  const w = GATE.x1 - GATE.x0;
  return (
    <g transform={`translate(${-shift.toFixed(2)} 0)`}>
      <rect x={GATE.x0 - 1} y={GATE.top - 1} width={w + 2} height={GROUND - GATE.top + 1} fill={INK} />
      <rect x={GATE.x0} y={GATE.top} width={w} height={GROUND - GATE.top} fill="#2f5fb3" />
      {Array.from({ length: Math.floor(w / 4) }, (_, i) => (
        <rect key={i} x={GATE.x0 + 3 + i * 4} y={GATE.top} width={0.6} height={GROUND - GATE.top} fill="#244a8a" />
      ))}
      <rect x={GATE.x0} y={GATE.top} width={w} height={1.5} fill="#5b86d6" />
      <rect x={GATE.x0} y={GATE.top + 14} width={w} height={1} fill="#244a8a" />
      <rect x={GATE.x1 - 5} y={58} width={2} height={4} fill="#c9ced1" />
    </g>
  );
}

/** Estampa de fundo: um azulejo por quadrado, cada um com o seu par de pombinhas. */
const Tiles = memo(function Tiles() {
  const out: ReactNode[] = [];
  const rand = seeded(53);
  const { x0, x1, y0, y1 } = MURAL;
  for (let y = y0, r = 0; y < y1; y += TILE, r++)
    for (let x = x0, c = 0; x < x1; x += TILE, c++) {
      // Faixas brancas largas atravessam o azul, como na parede de verdade
      const band = Math.sin((x - x0) / 26 + (y - y0) / 9) > 0.55;
      const base = band ? '#eef1f8' : BLUE;
      const ink = band ? '#5b78c8' : '#c8d4f2';
      out.push(<rect key={`b${x}-${y}`} x={x} y={y} width={TILE} height={Math.min(TILE, y1 - y)} fill={base} />);
      if (y + 4 < y1) {
        out.push(<rect key={`l${x}-${y}`} x={x + 1} y={y + 2} width={1.5} height={1.2} fill={ink} />);
        out.push(<rect key={`r${x}-${y}`} x={x + 3.5} y={y + 2} width={1.5} height={1.2} fill={ink} />);
        out.push(<rect key={`c${x}-${y}`} x={x + 2} y={y + 3.2} width={2} height={0.8} fill={ink} />);
      }
      // Pintinhas
      if (rand() > 0.4) out.push(<rect key={`d${x}-${y}`} x={x + rand() * 5} y={y + rand() * 5} width={0.5} height={0.5} fill={band ? '#9fb2e2' : '#e9eef9'} />);
    }
  for (let x = x0 + TILE; x < x1; x += TILE) out.push(<rect key={`gx${x}`} x={x} y={y0} width={0.3} height={y1 - y0} fill={BLUE_D} opacity={0.35} />);
  for (let y = y0 + TILE; y < y1; y += TILE) out.push(<rect key={`gy${y}`} x={x0} y={y} width={x1 - x0} height={0.3} fill={BLUE_D} opacity={0.35} />);
  return (
    <g>
      <rect x={x0 - 1} y={y0 - 2} width={x1 - x0 + 2} height={y1 - y0 + 3} fill="#e9e4da" />
      {out}
      {/* Placa do painel, no canto de baixo */}
      <rect x={288} y={70} width={9} height={6} fill="#d8dcdf" />
      <rect x={289} y={71} width={7} height={1} fill="#8d969c" />
      <rect x={289} y={73} width={5} height={1} fill="#8d969c" />
    </g>
  );
});

/** Uma pomba grande do painel; quando ela sai voando, fica o contornozinho do lugar dela. */
function MuralDove({ d, home }: { d: (typeof DOVES)[number]; home: boolean }) {
  const tf = `translate(${d.x} ${d.y}) rotate(${d.r}) scale(${d.s})`;
  if (!home) return <path d={DOVE_PATH} transform={tf} fill="none" stroke="#c8d4f2" strokeWidth={0.6} strokeDasharray="1.2 1" />;
  return (
    <g transform={tf}>
      <path d={DOVE_PATH} fill="#f7f8fb" stroke={BLUE_D} strokeWidth={0.6} />
      {/* Penas pintadas: pontinhos e as linhas das asas */}
      {[
        [-9, 4],
        [-5, 3],
        [-1, 2.5],
        [3, 1.5],
        [-6, -6],
        [-3, -3],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={0.8} height={0.8} fill="#5b78c8" />
      ))}
      {/* Penas da asa */}
      <path d="M-8 -7L-2 0M-5 -8L0 -2" stroke="#9fb2e2" strokeWidth={0.5} fill="none" />
      <rect x={9.2} y={-3.4} width={0.9} height={0.9} fill={INK} />
    </g>
  );
}

/** Calçada de ladrilho, meio-fio, rua de asfalto e a calçada da praça do outro lado. */
const Street = memo(function Street({ night }: { night: boolean }) {
  const joints: ReactNode[] = [];
  for (let x = FULL.x + 200; x < W + EDGE; x += 5) joints.push(<rect key={x} x={x} y={GROUND} width={0.4} height={CURB - GROUND} fill="#b9b2a0" />);
  for (let y = GROUND + 4; y < CURB; y += 4) joints.push(<rect key={`h${y}`} x={FULL.x} y={y} width={FULL.w} height={0.4} fill="#b9b2a0" />);
  return (
    <g>
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={CURB - GROUND} fill={night ? '#a8a290' : '#ddd5c0'} />
      {joints}
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={1} fill="#000" opacity={0.18} />
      <rect x={FULL.x} y={CURB} width={FULL.w} height={2} fill="#c9c3b4" />
      <rect x={FULL.x} y={ROAD.y0} width={FULL.w} height={ROAD.y1 - ROAD.y0} fill="#4f5458" />
      {Array.from({ length: 50 }, (_, i) => (
        <rect key={i} x={FULL.x + 200 + i * 16} y={(ROAD.y0 + ROAD.y1) / 2} width={8} height={1} fill="#e9e4da" opacity={0.7} />
      ))}
      <rect x={FULL.x} y={ROAD.y1} width={FULL.w} height={2} fill="#c9c3b4" />
      <rect x={FULL.x} y={ROAD.y1 + 2} width={FULL.w} height={GROUND_END - ROAD.y1 - 2} fill={night ? '#2c5a32' : '#6fae3c'} />
    </g>
  );
});

/** Poste com os fios atravessando a cena. */
const Pole = memo(function Pole({ night }: { night: boolean }) {
  const x = POLE_X;
  return (
    <g pointerEvents="none">
      <path d={`M${FULL.x} 26Q${x - 60} 34 ${x} 24Q${x + 80} 34 ${W + EDGE} 22`} stroke="#2b2f33" strokeWidth={0.5} fill="none" />
      <path d={`M${FULL.x} 30Q${x - 60} 38 ${x} 28Q${x + 80} 38 ${W + EDGE} 27`} stroke="#2b2f33" strokeWidth={0.5} fill="none" />
      <rect x={x - 1.5} y={20} width={3} height={GROUND + 8 - 20} fill="#b9b8b0" />
      <rect x={x - 1.5} y={20} width={1} height={GROUND + 8 - 20} fill="#d8d7cf" />
      <rect x={x - 7} y={23} width={14} height={1.5} fill="#8d969c" />
      {/* Lâmpada */}
      <rect x={x + 1} y={34} width={7} height={1.5} fill="#8d969c" />
      <rect x={x + 5} y={35.5} width={4} height={2} fill={night ? '#ffe9a8' : '#e9e4da'} />
    </g>
  );
});

/** A arvorezinha nova na frente do painel (a da foto), com o protetor de madeira. */
function Sapling({ shaking }: { shaking: boolean }) {
  const x = SAPLING_X;
  return (
    <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '3.6s' }}>
      <rect x={x - 0.5} y={52} width={1.2} height={GROUND + 6 - 52} fill="#6b4423" />
      {[
        [x - 4, 52, 4],
        [x + 3, 56, 3.5],
        [x - 2, 60, 3],
        [x + 2, 48, 3.5],
        [x - 5, 58, 2.5],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? '#3aa655' : '#4f9a3a'} />
      ))}
      <rect x={x - 3} y={GROUND} width={6} height={6} fill="none" stroke="#8a5a2b" strokeWidth={0.8} />
    </g>
  );
}

/* ---- Coisas vivas ---- */

interface Walker {
  id: number;
  x: number;
  y: number;
  tx: number;
  speed: number;
  walk: number;
  wait: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
}

interface Car {
  id: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  runs: Run[];
}

/** Pomba que saiu do painel (i = qual pomba): voa até um poleiro, espera e volta. */
interface Flyer {
  i: number;
  mode: 'out' | 'perch' | 'back';
  t0: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  until: number;
}

interface Pigeon {
  id: number;
  x: number;
  y: number;
  face: 1 | -1;
  fly: { t0: number; sx: number; sy: number; tx: number; ty: number } | null;
  peck: number;
  next: number;
}

const AREA = { x0: -20, x1: W + 20, y0: 10, y1: GROUND };
const LANE = { y0: 84, y1: 91 };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), y: Math.round(rnd(LANE.y0, LANE.y1)), tx: rnd(20, W - 20), speed: rnd(9, 13), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

const sidewalkSpot = () => ({ x: rnd(150, 300), y: rnd(LANE.y0 + 1, LANE.y1) });

function newPigeon(): Pigeon {
  const at = sidewalkSpot();
  return { id: uid(), x: at.x, y: at.y, face: pick([-1, 1]), fly: null, peck: 0, next: rnd(0.5, 2) };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(20, 70)), newWalker(rnd(200, 290)), newWalker()],
    cars: [] as Car[],
    carTimer: rnd(1, 3),
    flyers: [] as Flyer[],
    pigeons: [newPigeon(), newPigeon(), newPigeon(), newPigeon()],
    windows: WINDOWS.map(() => ({ at: -10, until: -10 })),
    who: WINDOWS.map(() => randomLook()),
    gate: { at: -10, until: -10 },
    kid: randomLook(),
    shine: -10,
    timers: { leaf: rnd(1, 3), mote: 0 },
  };
}

const ramp = (t: number, at: number, until: number, secs: number) => (t > until ? 0 : Math.min(clamp((t - at) / secs, 0, 1), clamp((until - t) / secs, 0, 1)));
const FLY_SECS = 1.8;

/* ---- Componente ---- */

export const EducandarioScene = memo(function EducandarioScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(GROUND - 8, 113, { blocks: 4 }), []);
  const cam = useCamera((vw) => (vw < 200 ? 222 : CX));
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);
  const [shaking, setShaking] = useState<string | null>(null);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

    // Pombas do painel: chegam no poleiro, esperam e voltam para o azulejo
    for (const f of L.flyers) {
      if (f.mode === 'out' && t - f.t0 > FLY_SECS) Object.assign(f, { mode: 'perch', until: t + rnd(5, 8) });
      else if (f.mode === 'perch' && t > f.until) {
        const d = DOVES[f.i];
        Object.assign(f, { mode: 'back', t0: t, sx: f.tx, sy: f.ty, tx: d.x, ty: d.y });
      }
    }
    L.flyers = L.flyers.filter((f) => !(f.mode === 'back' && t - f.t0 > FLY_SECS));

    // Pombos da calçada: ciscam, andam um pouquinho e voltam do voo
    for (const p of L.pigeons) {
      if (p.fly) {
        if (t - p.fly.t0 > 1.4) {
          Object.assign(p, { x: p.fly.tx, y: p.fly.ty, fly: null, next: t + rnd(4, 8) });
        }
        continue;
      }
      if (p.y < GROUND && t > p.next) {
        const to = sidewalkSpot();
        p.fly = { t0: t, sx: p.x, sy: p.y, tx: to.x, ty: to.y };
        p.face = to.x > p.x ? 1 : -1;
        continue;
      }
      if (t > p.next) {
        p.next = t + rnd(1, 3);
        if (Math.random() < 0.5) p.peck = t + 0.5;
        else {
          p.face = pick([-1, 1]);
          p.x = clamp(p.x + p.face * rnd(2, 6), 140, 304);
        }
      }
    }

    // Carros passando na rua
    L.carTimer -= dt;
    if (L.carTimer <= 0 && L.cars.length < 2) {
      L.carTimer = rnd(4, 9);
      const dir = pick([1, -1] as const);
      L.cars.push({ id: uid(), x: dir > 0 ? -EDGE - 30 : W + EDGE + 30, dir, speed: rnd(26, 36), runs: pick(carRuns) });
    }
    for (const c of L.cars) c.x += c.dir * c.speed * dt;
    L.cars = L.cars.filter((c) => c.x > -EDGE - 40 && c.x < W + EDGE + 40);

    for (const w of L.walkers) {
      if (w.wait > 0) {
        w.wait -= dt;
        w.walk = 0;
        continue;
      }
      const dx = w.tx - w.x;
      if (Math.abs(dx) < 0.8) {
        if (w.x < -50 || w.x > W + 50) {
          Object.assign(w, newWalker());
          continue;
        }
        w.wait = rnd(1.2, 4.5);
        if (Math.random() < 0.3 && t > w.sayUntil) {
          w.say = pick(night ? LINES_NIGHT : LINES_DAY);
          w.sayUntil = t + 2.6;
        }
        w.tx = Math.random() < 0.25 ? pick([-60, W + 60]) : rnd(10, W - 10);
      } else {
        w.x += Math.sign(dx) * Math.min(Math.abs(dx), w.speed * dt);
        w.walk += dt;
      }
    }

    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      spawn('leaf', pick([0, 20, 330]) + rnd(-10, 10), rnd(30, 50), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a']), floor: rnd(LANE.y0, CURB) });
    }
    L.timers.mote -= dt;
    if (!night && L.timers.mote <= 0) {
      L.timers.mote = rnd(0.25, 0.6);
      spawn('mote', rnd(-60, W + 60), rnd(10, H - 10), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);
  const guard = cam.guard;

  const flyerPos = (f: Flyer, t: number): [number, number] => {
    if (f.mode === 'perch') return [f.tx, f.ty];
    const k = clamp((t - f.t0) / FLY_SECS, 0, 1);
    return [f.sx + (f.tx - f.sx) * k, f.sy + (f.ty - f.sy) * k - Math.sin(Math.PI * k) * 20];
  };

  const tapMuralDove = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    if (L.flyers.some((f) => f.i === i)) return;
    const busy = L.flyers.map((f) => f.tx);
    const free = PERCHES.filter(([x]) => !busy.includes(x));
    const [tx, ty] = pick(free.length ? free : PERCHES);
    const d = DOVES[i];
    L.flyers.push({ i, mode: 'out', t0: clock.current, sx: d.x, sy: d.y, tx, ty, until: 0 });
    sfx('chirp');
    setTimeout(() => sfx('chirp'), 220);
    for (let k = 0; k < 6; k++) spawn('spark', d.x + rnd(-6, 6), d.y + rnd(-4, 4), { life: rnd(0.4, 0.8), vx: rnd(-8, 8), vy: rnd(-8, 2), c: '#ffffff' });
    say(`d${i}`, d.x, MURAL.y0 - 3, pick(['A pomba saiu do painel! 🕊️', 'Voa, pombinha! 🕊️', 'Pruu! Pruu! 🕊️']), 2.8);
    discover('pomba');
  };

  const tapFlyer = (f: Flyer) => {
    if (!guard() || f.mode !== 'perch') return;
    const d = DOVES[f.i];
    sfx('chirp');
    Object.assign(f, { mode: 'back', t0: clock.current, sx: f.tx, sy: f.ty, tx: d.x, ty: d.y });
    say(`f${f.i}`, f.sx, f.sy - 6, 'Volta pro painel! 🕊️', 2.2);
  };

  const tapTiles = () => {
    if (!guard()) return;
    const L = life.current;
    if (clock.current - L.shine < 1.2) return;
    L.shine = clock.current;
    sfx('plim');
    say('azulejo', 220, MURAL.y0 - 3, pick(['Cada quadradinho é um azulejo! 🟦', 'Azulejo azul e branco! 💙', 'Tem pombinhas em cada azulejo! 🕊️']), 3);
    discover('azulejo');
  };

  const tapGate = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.gate.until) return;
    sfx('creak');
    L.gate = { at: t, until: t + 5.5 };
    L.kid = randomLook();
    say('portao', 104, GATE.top - 3, pick(['Educandário é lugar de estudar! 🎒', 'Olha o pátio da escola! 🏫', 'Bom dia, turma! 📚']), 3.2);
    discover('portao');
  };

  const tapWindow = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.windows[i].until) return;
    sfx('pop');
    L.windows[i] = { at: t, until: t + 4.5 };
    L.who[i] = randomLook();
    say(`jan${i}`, WINDOWS[i] + 6, HOUSE.eave - 4, pick(['Oi, lá de baixo! 👋', 'Daqui eu vejo as pombas! 🕊️', 'Que painel bonito! 💙']), 3);
    discover('janela');
  };

  const tapPigeon = (p: Pigeon) => {
    if (!guard() || p.fly) return;
    const L = life.current;
    sfx('chirp');
    // Os pombos voam juntos para o alto do muro e, depois, voltam pra calçada
    for (const q of L.pigeons) {
      if (q.fly) continue;
      const tx = rnd(MURAL.x0 + 4, MURAL.x1 - 4);
      q.fly = { t0: clock.current + rnd(0, 0.2), sx: q.x, sy: q.y, tx, ty: MURAL.y0 - 2 };
      q.face = tx > q.x ? 1 : -1;
    }
    say('pombos', p.x, p.y - 8, pick(['Pru-pru! 🐦', 'Os pombos voaram! 🐦', 'Pombos de verdade! 🐦']), 2.4);
    discover('pombos');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-10, 10), top + rnd(-4, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(LANE.y0, CURB) });
      if (Math.random() < 0.5) {
        setTimeout(() => sfx('chirp'), 120);
        ambient.current.flocks.push({ id: uid(), x, y: top, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapCar = (x: number, id: string) => {
    if (!guard()) return;
    sfx('honk');
    say(id, x, ROAD.y0 - 12, pick(['Bi-bi! 🚗', 'Fom-fom! 🚙']), 1.8);
    discover('carro');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    w.say = pick(night ? LINES_NIGHT : LINES_DAY);
    w.sayUntil = clock.current + 2.8;
    w.wait = Math.max(w.wait, 2.4);
    discover('gente');
  };

  const t = clock.current;
  const L = life.current;
  const A = ambient.current;
  const view = cam.view(t);

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (pt && pt.y > GROUND) spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  const winOpen = L.windows.map((w) => ramp(t, w.at, w.until, 0.6));
  const gateOpen = ramp(t, L.gate.at, L.gate.until, 1);
  const out = new Set(L.flyers.map((f) => f.i));
  const shineK = (t - L.shine) / 1.1;

  const walkers = [...L.walkers].sort((a, b) => a.y - b.y);
  const bubbles = [...live(t), ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: w.y - 18, text: w.say! }))];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <radialGradient id="ed-glow">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ed-mural">
            <rect x={MURAL.x0} y={MURAL.y0} width={MURAL.x1 - MURAL.x0} height={MURAL.y1 - MURAL.y0} />
          </clipPath>
        </defs>
        <g transform={view.layer(DEPTH.sky)}>
          <SkyLayer time={time} bd={bd} />
        </g>
        <g transform={view.layer(DEPTH.clouds)}>
          <Clouds A={A} t={t} time={time} />
        </g>
        <g transform={view.layer(DEPTH.far)}>
          <FarHills time={time} bd={bd} />
        </g>
        <Haze time={time} ground={bd.ground} />
        <g transform={view.layer(DEPTH.near)}>
          <NearHills time={time} bd={bd} />
        </g>

        <Street night={night} />
        <BigTree id="t3" x={334} ground={GROUND - 2} s={4.8} shaking={shaking === 't3'} onTap={tapTree} />
        <House />
        <g
          pointerEvents="none"
          // As janelas ficam por cima das áreas de toque, que vêm logo depois
        >
          <Windows open={winOpen} who={L.who} t={t} night={night} />
        </g>
        {WINDOWS.map((x, i) => (
          <rect key={x} className="cw-tap" x={x - 1} y={HOUSE.eave + 1} width={14} height={11} fill="transparent" role="button" aria-label="Janela do sobrado" onClick={(e) => (e.stopPropagation(), tapWindow(i))} />
        ))}

        {/* Muro: tijolinho, portão (com o pátio atrás) e o painel */}
        <Bricks />
        <Yard />
        {gateOpen > 0.2 && (
          <g pointerEvents="none">
            <Character x={104} y={GROUND - 2} config={L.kid} frame={Math.sin(t * 10) > 0 ? 1 : 2} />
          </g>
        )}
        <Gate k={gateOpen} />
        <rect className="cw-tap" x={GATE.x0} y={GATE.top} width={GATE.x1 - GATE.x0} height={GROUND - GATE.top} fill="transparent" role="button" aria-label="Portão azul da escola" onClick={(e) => (e.stopPropagation(), tapGate())} />

        <Tiles />
        <rect className="cw-tap" x={MURAL.x0} y={MURAL.y0} width={MURAL.x1 - MURAL.x0} height={MURAL.y1 - MURAL.y0} fill="transparent" role="button" aria-label="Azulejos do painel" onClick={(e) => (e.stopPropagation(), tapTiles())} />
        {DOVES.map((d, i) => (
          <g key={i} className="cw-tap" role="button" aria-label="Pomba do painel" onClick={(e) => (e.stopPropagation(), tapMuralDove(i))}>
            <rect x={d.x - 11 * d.s} y={d.y - 8 * d.s} width={22 * d.s} height={17 * d.s} fill="transparent" />
            <MuralDove d={d} home={!out.has(i)} />
          </g>
        ))}
        {/* Brilho que corre pelos azulejos */}
        {shineK >= 0 && shineK <= 1 && (
          <g clipPath="url(#ed-mural)" pointerEvents="none">
            <path d={`M${MURAL.x0 - 30 + shineK * 220} ${MURAL.y0}l14 0l-20 ${MURAL.y1 - MURAL.y0}l-14 0Z`} fill="#ffffff" opacity={0.45} />
          </g>
        )}
        {/* Portão azul da direita e o muro de pedra */}
        <rect x={MURAL.x1} y={MURAL.y0 - 2} width={22} height={GROUND - MURAL.y0 + 2} fill="#2f5fb3" />
        {[4, 8, 12, 16].map((d) => (
          <rect key={d} x={MURAL.x1 + d} y={MURAL.y0 - 2} width={0.6} height={GROUND - MURAL.y0 + 2} fill="#244a8a" />
        ))}
        <rect x={MURAL.x1 + 22} y={44} width={40} height={GROUND - 44} fill="#b8a07a" />
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={MURAL.x1 + 24 + (i % 5) * 7} y={47 + Math.floor(i / 5) * 9} width={5} height={3} fill="#9a8460" />
        ))}

        <Pole night={night} />
        <BigTree id="t0" x={-6} ground={CURB - 1} s={4.4} shaking={shaking === 't0'} onTap={tapTree} />
        <g className="cw-tap" onClick={(e) => (e.stopPropagation(), tapTree('s', SAPLING_X, 50))}>
          <rect x={SAPLING_X - 7} y={45} width={14} height={GROUND + 6 - 45} fill="transparent" />
          <Sapling shaking={shaking === 's'} />
        </g>

        {/* Pombos (os da calçada e os que voam até o muro) */}
        {L.pigeons.map((p) => {
          const k = p.fly ? clamp((t - p.fly.t0) / 1.4, 0, 1) : 0;
          const x = p.fly ? p.fly.sx + (p.fly.tx - p.fly.sx) * k : p.x;
          const y = p.fly ? p.fly.sy + (p.fly.ty - p.fly.sy) * k - Math.sin(Math.PI * k) * 14 : p.y;
          const runs = p.fly ? (Math.sin(t * 30) > 0 ? doveUp : doveDown) : t < p.peck ? pigeonPeck : pigeonStand;
          return (
            <g key={p.id} className="cw-tap" onClick={(e) => (e.stopPropagation(), tapPigeon(p))}>
              <rect x={x - 6} y={y - 7} width={12} height={9} fill="transparent" />
              <g transform={`translate(${x.toFixed(2)} ${(y - 5).toFixed(2)}) scale(${p.face} 1) translate(-5 0)`}>
                <Pixels runs={runs} />
              </g>
            </g>
          );
        })}

        {walkers.map((w) => (
          <g key={w.id} className="cw-tap" onClick={(e) => (e.stopPropagation(), tapWalker(w))}>
            <Character x={w.x} y={w.y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
          </g>
        ))}

        {L.cars.map((c) => (
          <g key={c.id} className="cw-tap" onClick={(e) => (e.stopPropagation(), tapCar(c.x, `car${c.id}`))}>
            <g transform={`translate(${c.x.toFixed(2)} ${ROAD.y1 - 9}) scale(${c.dir} 1) translate(-10 0)`}>
              <Pixels runs={c.runs} />
            </g>
          </g>
        ))}

        {/* Pombas que saíram do painel */}
        {L.flyers.map((f) => {
          const [x, y] = flyerPos(f, t);
          const flying = f.mode !== 'perch';
          const face = f.tx >= f.sx ? 1 : -1;
          return (
            <g key={f.i} className="cw-tap" role="button" aria-label="Pomba voando" onClick={(e) => (e.stopPropagation(), tapFlyer(f))}>
              <rect x={x - 6} y={y - 7} width={12} height={10} fill="transparent" />
              <g transform={`translate(${x.toFixed(2)} ${(y - 6).toFixed(2)}) scale(${(flying ? 1.6 : 1.3) * face} ${flying ? 1.6 : 1.3}) translate(-4 0)`}>
                <Pixels runs={flying ? (Math.sin(t * 26) > 0 ? doveUp : doveDown) : doveSit} />
              </g>
            </g>
          );
        })}

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <>
            <g transform={view.layer(DEPTH.near)}>
              <TownLights bd={bd} />
            </g>
            <g pointerEvents="none">
              {WINDOWS.map((x) => (
                <circle key={x} cx={x + 6} cy={HOUSE.eave + 6} r={9} fill="url(#ed-glow)" opacity={0.35} />
              ))}
              <circle cx={POLE_X + 7} cy={40} r={22} fill="url(#ed-glow)" opacity={0.45} />
            </g>
          </>
        )}
      </svg>

      <SceneHud
        t={t}
        view={view}
        bubbles={bubbles}
        list={DISCOVERIES}
        found={found}
        fresh={fresh}
        toast={toast.current}
        night={night}
        firstTip="Toque nas pombas do painel, no portão e nas janelas! 👆"
        dragText="👈 Arraste para ver o painel todo 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
