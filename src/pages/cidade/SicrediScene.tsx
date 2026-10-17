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
  PixelText,
  rnd,
  SceneBox,
  SceneHud,
  SkyLayer,
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
 * Visita ao Prédio Sicredi, o antigo Grande Hotel Villas: sobrado verde de dois andares com enfeites
 * brancos. Em cima, as janelas em arco (as do meio com sacadinha de ferro), a cornija com dentinhos,
 * as ameias que parecem de castelo e a placa arredondada com o nome do hotel. Embaixo, as portas
 * brancas em arco, as pilastras com frisos e a base de pedra. Do lado, a placa verde do Sicredi.
 * Na frente, a calçada com o meio-fio amarelo, a rua de paralelepípedo e as árvores.
 * À noite, as luzes da calçada iluminam a fachada de baixo para cima, como no prédio de verdade.
 */

const CX = 160;
const GROUND = 82;
const CURB = 90;
const ROAD = { y0: 92, y1: 107 };
const B = { x0: 50, x1: 270 };
const BAYS = 5;
const BAY = (B.x1 - B.x0) / BAYS;
const FLOOR = { parapet: 23, cornice: 29, upper: 33, band: 53, lower: 56 };
const PLAQUE = { x0: 118, x1: 202, y0: 13, y1: 25 };
const STONE_TOP = 68;
const BALCONY = [1, 2, 3];
const MERLONS = Array.from({ length: 12 }, (_, i) => B.x0 + 3 + i * 18.4);
const SIGN = { x: B.x0 + BAY - 10.5, y: 41 };
const GREEN = '#3f9a52';
const GREEN_D = '#2f7a40';
const WHITE = '#f6f5ee';
const WHITE_D = '#d9d7cc';

const bayX = (i: number) => B.x0 + BAY * (i + 0.5);

const DISCOVERIES: Discovery[] = [
  { key: 'placa', emoji: '🏨', label: 'O nome do hotel', tip: 'Toque na placa lá no alto! 🏨' },
  { key: 'janelas', emoji: '🪟', label: 'As janelas em arco', tip: 'Toque nas janelas de cima! 🪟' },
  { key: 'portas', emoji: '🚪', label: 'As portas brancas', tip: 'Toque numa porta branca! 🚪' },
  { key: 'pedras', emoji: '🪨', label: 'As pedras da parede', tip: 'Toque nas pedras da parede de baixo! 🪨' },
  { key: 'sicredi', emoji: '💚', label: 'A placa verde', tip: 'Toque na placa verde do lado! 💚' },
  { key: 'ameias', emoji: '🏰', label: 'O telhado de castelo', tip: 'Toque nos dentinhos brancos do telhado! 🏰' },
  { key: 'arvore', emoji: '🌳', label: 'As árvores', tip: 'Toque nas árvores! 🌳' },
  { key: 'carro', emoji: '🚗', label: 'Os carros da rua', tip: 'Toque num carro que passar! 🚗' },
];

const LINES_DAY = ['Oi! 👋', 'Que prédio verde! 💚', 'Já foi hotel, sabia? 🏨', 'Que dia bonito! ☀️', 'Parece um castelo! 🏰'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Que prédio iluminado! ✨', 'Olha os vagalumes! ✨'];

/* ---- Sprites ---- */

const PIGEON_PAL = { g: '#a7b1b8', G: '#6f7b84', n: '#4f9a8a', k: INK, y: '#e07a3c', w: '#e4e9ec' };
const pigeonStand = toRuns(fromAscii(['.......gg.', '.......gky', '.GGggggng.', '..GGgwwgg.', '....y..y..'], PIGEON_PAL));
const pigeonFlyA = toRuns(fromAscii(['GG........', '.GGg..gg..', '..Ggggggky', '...wwggg..'], PIGEON_PAL));
const pigeonFlyB = toRuns(fromAscii(['..........', '...g..gg..', '.GGgggggky', 'GG.wwggg..'], PIGEON_PAL));

/* ---- Prédio ---- */

/** Pilastra branca com frisos, de `y0` até `y1`. */
function Pilaster({ x, y0, y1 }: { x: number; y0: number; y1: number }) {
  return (
    <g>
      <rect x={x - 3.5} y={y0} width={7} height={y1 - y0} fill={WHITE} />
      {[-2, 0, 2].map((d) => (
        <rect key={d} x={x + d - 0.3} y={y0 + 2} width={0.6} height={y1 - y0 - 4} fill={WHITE_D} />
      ))}
      <rect x={x - 4} y={y0} width={8} height={1.5} fill={WHITE} />
      <rect x={x - 4} y={y1 - 1.5} width={8} height={1.5} fill={WHITE_D} />
    </g>
  );
}

/** Abertura com o alto em arco (janela ou porta). */
const arch = (x: number, top: number, w: number, bottom: number) => `M${x - w / 2} ${bottom}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${top + w / 2}V${bottom}Z`;

/** Fachada fixa: paredes, cornija, ameias, faixas e as pedras da base. */
const Facade = memo(function Facade() {
  const stones = useMemo(() => {
    const rand = seeded(61);
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    for (let i = 0; i < BAYS; i++) {
      const cx = bayX(i);
      for (const [a, b] of [
        [cx - BAY / 2 + 4, cx - 9],
        [cx + 9, cx + BAY / 2 - 4],
      ])
        for (let y = STONE_TOP + 1; y < GROUND - 1; y += 2.6)
          for (let x = a; x < b - 1; x += 2 + rand() * 3) out.push({ x, y: y + rand() * 0.6, w: 1.6 + rand() * 2.4, h: 1.6 + rand() * 0.8, c: pick(['#5b5d58', '#3f413d', '#8a8c85', '#6f716b']) });
    }
    return out;
  }, []);
  const dentils: ReactNode[] = [];
  for (let x = B.x0 - 2; x < B.x1 + 2; x += 3) dentils.push(<rect key={x} x={x} y={FLOOR.cornice + 2.5} width={1.5} height={1.5} fill={WHITE_D} />);
  return (
    <g>
      {/* Paredes verdes */}
      <rect x={B.x0 - 1} y={FLOOR.parapet - 1} width={B.x1 - B.x0 + 2} height={GROUND - FLOOR.parapet + 1} fill={INK} />
      <rect x={B.x0} y={FLOOR.parapet} width={B.x1 - B.x0} height={GROUND - FLOOR.parapet} fill={GREEN} />
      <rect x={B.x0} y={FLOOR.upper} width={B.x1 - B.x0} height={2} fill={GREEN_D} />
      {/* Ameias (os dentes de castelo) em cima da platibanda */}
      {MERLONS.map((x) => (
        <g key={x}>
          <rect x={x - 0.5} y={FLOOR.parapet - 4.5} width={7} height={5} fill={INK} />
          <rect x={x} y={FLOOR.parapet - 4} width={6} height={4} fill={WHITE} />
          <rect x={x} y={FLOOR.parapet - 1} width={6} height={1} fill={WHITE_D} />
        </g>
      ))}
      <rect x={B.x0 - 1} y={FLOOR.parapet} width={B.x1 - B.x0 + 2} height={1.5} fill={WHITE} />
      {/* Quadradinhos brancos da platibanda */}
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={B.x0 + 4 + i * 10} y={FLOOR.parapet + 3} width={4} height={2} fill="#e9efe2" opacity={0.9} />
      ))}
      {/* Cornija com dentinhos */}
      <rect x={B.x0 - 3} y={FLOOR.cornice} width={B.x1 - B.x0 + 6} height={2.5} fill={WHITE} />
      {dentils}
      <rect x={B.x0 - 2} y={FLOOR.cornice + 4} width={B.x1 - B.x0 + 4} height={0.8} fill={WHITE_D} />
      {/* Faixa entre os andares */}
      <rect x={B.x0 - 2} y={FLOOR.band} width={B.x1 - B.x0 + 4} height={3} fill={WHITE} />
      <rect x={B.x0 - 2} y={FLOOR.band + 2.4} width={B.x1 - B.x0 + 4} height={0.6} fill={WHITE_D} />
      {/* Base de pedra (entre as portas) */}
      {Array.from({ length: BAYS }, (_, i) => {
        const cx = bayX(i);
        return (
          <g key={i}>
            <rect x={cx - BAY / 2 + 3} y={STONE_TOP} width={BAY / 2 - 11} height={GROUND - STONE_TOP} fill="#e7e5dc" />
            <rect x={cx + 8} y={STONE_TOP} width={BAY / 2 - 11} height={GROUND - STONE_TOP} fill="#e7e5dc" />
          </g>
        );
      })}
      {stones.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.c} />
      ))}
      <rect x={B.x0} y={GROUND - 1.5} width={B.x1 - B.x0} height={1.5} fill="#8a8c85" />
      {/* Pilastras */}
      {Array.from({ length: BAYS + 1 }, (_, i) => (
        <g key={i}>
          <Pilaster x={B.x0 + i * BAY} y0={FLOOR.upper} y1={FLOOR.band} />
          <Pilaster x={B.x0 + i * BAY} y0={FLOOR.lower} y1={GROUND} />
        </g>
      ))}
    </g>
  );
});

/** A placa arredondada do alto com o nome do hotel e o enfeite em cima. */
const Plaque = memo(function Plaque({ glow }: { glow: number }) {
  const { x0, x1, y0, y1 } = PLAQUE;
  const cx = (x0 + x1) / 2;
  return (
    <g>
      {/* Enfeite: dois laços brancos */}
      <circle cx={cx - 3} cy={y0 - 1} r={2.4} fill="none" stroke={WHITE} strokeWidth={1.2} />
      <circle cx={cx + 3} cy={y0 - 1} r={2.4} fill="none" stroke={WHITE} strokeWidth={1.2} />
      <path d={`M${x0 - 1} ${y1 + 1}V${y0 + 5}Q${x0 - 1} ${y0 + 1} ${x0 + 6} ${y0 + 1}H${x1 - 6}Q${x1 + 1} ${y0 + 1} ${x1 + 1} ${y0 + 5}V${y1 + 1}Z`} fill={INK} />
      <path d={`M${x0} ${y1}V${y0 + 5}Q${x0} ${y0 + 2} ${x0 + 6} ${y0 + 2}H${x1 - 6}Q${x1} ${y0 + 2} ${x1} ${y0 + 5}V${y1}Z`} fill={WHITE} />
      <path d={`M${x0 + 2} ${y1}V${y0 + 6}Q${x0 + 2} ${y0 + 4} ${x0 + 7} ${y0 + 4}H${x1 - 7}Q${x1 - 2} ${y0 + 4} ${x1 - 2} ${y0 + 6}V${y1}Z`} fill={GREEN_D} />
      <PixelText text="GRANDE HOTEL VILLAS" x={cx - 37} y={y0 + 6} fill={glow > 0 ? '#fff6c8' : WHITE} />
      {glow > 0 && <rect x={x0} y={y0 + 2} width={x1 - x0} height={y1 - y0 - 2} fill="#fff6c8" opacity={glow * 0.35} />}
    </g>
  );
});

/** Janelas em arco do andar de cima: folhas de madeira que abrem, e às vezes alguém aparece. */
function UpperWindows({ open, who, t, night }: { open: number[]; who: AvatarConfig[]; t: number; night: boolean }) {
  const top = FLOOR.upper + 3;
  const bottom = FLOOR.band - 2;
  const w = 12;
  return (
    <g>
      {Array.from({ length: BAYS }, (_, i) => {
        const x = bayX(i);
        const k = open[i];
        const id = `sc-win${i}`;
        return (
          <g key={i}>
            <path d={arch(x, top - 2, w + 4, bottom + 1)} fill={WHITE} />
            <path d={arch(x, top, w, bottom)} fill={night ? '#f3d68a' : '#33434a'} />
            <clipPath id={id}>
              <path d={arch(x, top, w, bottom)} />
            </clipPath>
            <g clipPath={`url(#${id})`}>
              {k > 0.3 && <Character x={x} y={bottom + 7} config={who[i]} frame={Math.sin(t * 10) > 0 ? 1 : 2} />}
              {/* Folhas de madeira com vidrinho, que abrem para dentro */}
              <rect x={x - w / 2} y={top} width={(w / 2) * (1 - k * 0.8)} height={bottom - top} fill="#f4f1e6" />
              <rect x={x + w / 2 - (w / 2) * (1 - k * 0.8)} y={top} width={(w / 2) * (1 - k * 0.8)} height={bottom - top} fill="#f4f1e6" />
              {k < 0.5 && (
                <>
                  <rect x={x - w / 2 + 1} y={top + 3} width={w / 2 - 2} height={bottom - top - 5} fill={night ? '#ffe7a8' : '#8fb7c0'} />
                  <rect x={x + 1} y={top + 3} width={w / 2 - 2} height={bottom - top - 5} fill={night ? '#ffe7a8' : '#8fb7c0'} />
                </>
              )}
            </g>
            <rect x={x - 0.4} y={top + 1} width={0.8} height={bottom - top - 1} fill={WHITE_D} opacity={1 - k} />
            {/* Peitoril */}
            <rect x={x - w / 2 - 3} y={bottom} width={w + 6} height={1.5} fill={WHITE} />
            {/* Sacadinha de ferro nas janelas do meio */}
            {BALCONY.includes(i) && (
              <g>
                <rect x={x - w / 2 - 3} y={bottom - 6} width={w + 6} height={0.8} fill="#1f2326" />
                {Array.from({ length: 9 }, (_, k2) => (
                  <rect key={k2} x={x - w / 2 - 2 + k2 * 2.1} y={bottom - 6} width={0.6} height={6} fill="#1f2326" />
                ))}
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Portas brancas em arco do térreo, com a bandeira de vidro em cima; abrem mostrando o salão. */
function Doors({ open, night }: { open: number[]; night: boolean }) {
  const top = FLOOR.lower + 3;
  const w = 13;
  return (
    <g>
      {Array.from({ length: BAYS }, (_, i) => {
        const x = bayX(i);
        const k = open[i];
        const leaf = (w / 2) * (1 - k * 0.85);
        return (
          <g key={i}>
            <path d={arch(x, top - 2, w + 4, GROUND)} fill={WHITE} />
            <path d={arch(x, top, w, GROUND)} fill={night ? '#f3d68a' : '#f0e2c4'} />
            {/* Salão lá dentro: piso e a luz */}
            <rect x={x - w / 2} y={GROUND - 4} width={w} height={4} fill="#c9a87a" />
            {/* Bandeira de vidro em arco */}
            <path d={arch(x, top, w, top + w / 2 + 3)} fill={night ? '#ffe7a8' : '#9fc4c8'} />
            {[-3, 0, 3].map((d) => (
              <rect key={d} x={x + d - 0.3} y={top + 1} width={0.6} height={w / 2 + 2} fill={WHITE} />
            ))}
            <rect x={x - w / 2} y={top + w / 2 + 3} width={w} height={1} fill={WHITE} />
            {/* Folhas da porta */}
            <rect x={x - w / 2} y={top + w / 2 + 4} width={leaf} height={GROUND - top - w / 2 - 4} fill={WHITE} />
            <rect x={x + w / 2 - leaf} y={top + w / 2 + 4} width={leaf} height={GROUND - top - w / 2 - 4} fill={WHITE} />
            {k < 0.5 && (
              <>
                <rect x={x - w / 2 + 1.2} y={top + w / 2 + 6} width={w / 2 - 2.4} height={8} fill={WHITE_D} />
                <rect x={x + 1.2} y={top + w / 2 + 6} width={w / 2 - 2.4} height={8} fill={WHITE_D} />
                <rect x={x - w / 2 + 1.2} y={top + w / 2 + 16} width={w / 2 - 2.4} height={7} fill={WHITE_D} />
                <rect x={x + 1.2} y={top + w / 2 + 16} width={w / 2 - 2.4} height={7} fill={WHITE_D} />
                <rect x={x - 0.3} y={top + w / 2 + 4} width={0.6} height={GROUND - top - w / 2 - 4} fill="#b9b6a8" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Placa verde do Sicredi, presa na pilastra, com a florzinha. */
function Sign({ on }: { on: number }) {
  const { x, y } = SIGN;
  const lit = on > 0 && Math.sin(on * 40) > -0.3;
  return (
    <g>
      <rect x={x + 9.5} y={y - 3} width={2} height={3} fill="#8d969c" />
      <rect x={x - 1} y={y - 1} width={23} height={12} fill={INK} />
      <rect x={x} y={y} width={21} height={10} fill={lit ? '#5fd46a' : '#3fae49'} />
      <rect x={x} y={y} width={21} height={1} fill="#7fdc88" />
      {/* Florzinha de quatro pétalas */}
      {[
        [0, -1.6],
        [1.6, 0],
        [0, 1.6],
        [-1.6, 0],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={x + 10.5 + dx} cy={y + 5 + dy} r={1.4} fill="#e9fbe9" />
      ))}
      <circle cx={x + 10.5} cy={y + 5} r={0.8} fill="#3fae49" />
    </g>
  );
}

/** Vizinhos dos dois lados: o sobrado salmão da esquerda e o prédio cinza da direita. */
const Neighbors = memo(function Neighbors({ night }: { night: boolean }) {
  return (
    <g>
      <rect x={-EDGE} y={30} width={EDGE + B.x0 - 1} height={GROUND - 30} fill="#c8735a" />
      <rect x={-EDGE} y={28} width={EDGE + B.x0 - 1} height={3} fill="#e8d9c4" />
      {[-40, -16, 10, 30].map((x) => (
        <path key={x} d={arch(x, 38, 10, 52)} fill={night ? '#f3d68a' : '#33434a'} />
      ))}
      {[-40, -16, 10, 30].map((x) => (
        <path key={`p${x}`} d={arch(x, 60, 10, GROUND)} fill={night ? '#e9cf8a' : '#7a4a2a'} />
      ))}
      <rect x={B.x1 + 1} y={36} width={W + EDGE - B.x1} height={GROUND - 36} fill="#cfd2cc" />
      <rect x={B.x1 + 1} y={36} width={W + EDGE - B.x1} height={2} fill="#e9ebe6" />
      {[290, 316, 342].map((x) => (
        <rect key={x} x={x} y={44} width={16} height={10} fill={night ? '#f3d68a' : '#8fb7c0'} />
      ))}
      <rect x={B.x1 + 1} y={60} width={W + EDGE - B.x1} height={GROUND - 60} fill="#3d4549" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={B.x1 + 3 + i * 3} y={60} width={1} height={GROUND - 60} fill="#555f63" />
      ))}
    </g>
  );
});

/** Calçada, meio-fio amarelo, rua de paralelepípedo e o canteiro do outro lado. */
const Street = memo(function Street({ night }: { night: boolean }) {
  const cobbles = useMemo(() => {
    const rand = seeded(67);
    const out: { x: number; y: number; c: string }[] = [];
    for (let y = ROAD.y0 + 0.5; y < ROAD.y1; y += 2) for (let x = FULL.x + 200 + (y % 4 ? 0 : 1.5); x < W + EDGE; x += 3) out.push({ x, y, c: rand() > 0.5 ? '#9c978c' : '#7d786e' });
    return out;
  }, []);
  return (
    <g>
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={CURB - GROUND} fill={night ? '#8a7a72' : '#c9a89a'} />
      {Array.from({ length: 120 }, (_, i) => (
        <rect key={i} x={FULL.x + 200 + i * 6} y={GROUND} width={0.4} height={CURB - GROUND} fill="#a8887a" />
      ))}
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={1} fill="#000" opacity={0.2} />
      <rect x={FULL.x} y={CURB} width={FULL.w} height={2} fill="#e8c62e" />
      <rect x={FULL.x} y={ROAD.y0} width={FULL.w} height={ROAD.y1 - ROAD.y0} fill="#6b665d" />
      {cobbles.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={2.4} height={1.4} fill={c.c} />
      ))}
      <rect x={FULL.x} y={ROAD.y1} width={FULL.w} height={2} fill="#e8c62e" />
      <rect x={FULL.x} y={ROAD.y1 + 2} width={FULL.w} height={GROUND_END - ROAD.y1 - 2} fill={night ? '#2c5a32' : '#6fae3c'} />
    </g>
  );
});

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

/** Pombo pousado numa ameia; quando voa, sai da tela e volta depois. */
interface Roost {
  m: number;
  fly: number;
  back: number;
  dir: 1 | -1;
}

const AREA = { x0: -20, x1: W + 20, y0: 10, y1: GROUND };
const LANE = { y0: 84, y1: 89 };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), y: Math.round(rnd(LANE.y0, LANE.y1)), tx: rnd(20, W - 20), speed: rnd(9, 13), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(20, 70)), newWalker(rnd(180, 260)), newWalker()],
    cars: [] as Car[],
    carTimer: rnd(1, 3),
    roosts: [2, 5, 9].map((m) => ({ m, fly: -10, back: -10, dir: 1 as 1 | -1 })) as Roost[],
    windows: Array.from({ length: BAYS }, () => ({ at: -10, until: -10 })),
    who: Array.from({ length: BAYS }, () => randomLook()),
    doors: Array.from({ length: BAYS }, () => ({ at: -10, until: -10 })),
    plaque: -10,
    sign: -10,
    timers: { leaf: rnd(1, 3), mote: 0 },
  };
}

const ramp = (t: number, at: number, until: number, secs: number) => (t > until ? 0 : Math.min(clamp((t - at) / secs, 0, 1), clamp((until - t) / secs, 0, 1)));

/* ---- Componente ---- */

export const SicrediScene = memo(function SicrediScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(GROUND - 8, 131, { blocks: 4 }), []);
  const cam = useCamera(CX);
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);
  const [shaking, setShaking] = useState<string | null>(null);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

    L.carTimer -= dt;
    if (L.carTimer <= 0 && L.cars.length < 2) {
      L.carTimer = rnd(4, 9);
      const dir = pick([1, -1] as const);
      L.cars.push({ id: uid(), x: dir > 0 ? -EDGE - 30 : W + EDGE + 30, dir, speed: rnd(22, 30), runs: pick(carRuns) });
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
      spawn('leaf', pick([10, 300, 320]) + rnd(-10, 10), rnd(30, 50), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a']), floor: rnd(LANE.y0, CURB) });
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

  const tapPlaque = () => {
    if (!guard()) return;
    const L = life.current;
    L.plaque = clock.current;
    sfx('plim');
    for (let i = 0; i < 10; i++) spawn('spark', rnd(PLAQUE.x0, PLAQUE.x1), rnd(PLAQUE.y0, PLAQUE.y1), { life: rnd(0.5, 1), vx: rnd(-6, 6), vy: rnd(-8, 2), c: '#fff1b8' });
    say('placa', CX, PLAQUE.y1 + 4, pick(['Grande Hotel Villas! 🏨', 'Antes, aqui era um hotel! 🏨', 'O nome do hotel ficou lá no alto! ✨']), 3.2);
    discover('placa');
  };

  const tapMerlons = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    sfx('chirp');
    for (const r of L.roosts) if (t > r.back) Object.assign(r, { fly: t, back: t + rnd(6, 9), dir: pick([-1, 1]) });
    say('ameias', bayX(3), FLOOR.parapet - 6, pick(['Parece um castelinho! 🏰', 'Que telhado de castelo! 🏰']), 2.8);
    discover('ameias');
  };

  const tapWindow = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.windows[i].until) return;
    sfx('creak');
    L.windows[i] = { at: t, until: t + 4.5 };
    L.who[i] = randomLook();
    say(`jan${i}`, bayX(i), FLOOR.upper, pick(['Aqui já foi quarto de hotel! 🛏️', 'Oi, lá de baixo! 👋', 'Que janela redondinha! 🌈']), 3);
    discover('janelas');
  };

  const tapDoor = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.doors[i].until) return;
    sfx('creak');
    L.doors[i] = { at: t, until: t + 4 };
    say(`porta${i}`, bayX(i), FLOOR.lower, pick(['Pode entrar! 🚪', 'Que porta grande! 🚪', 'Bom dia! 😊']), 2.6);
    discover('portas');
  };

  const tapStones = (x: number) => {
    if (!guard()) return;
    sfx('clang');
    for (let i = 0; i < 6; i++) spawn('spark', x + rnd(-4, 4), rnd(STONE_TOP + 2, GROUND - 2), { life: rnd(0.4, 0.7), vx: rnd(-8, 8), vy: rnd(-8, 0), c: '#e7e5dc' });
    say('pedras', x, STONE_TOP - 3, pick(['Pedras de verdade na parede! 🪨', 'Toc, toc! É pedra! 🪨']), 2.6);
    discover('pedras');
  };

  const tapSign = () => {
    if (!guard()) return;
    life.current.sign = clock.current;
    sfx('zap');
    say('sicredi', SIGN.x + 10, SIGN.y - 3, pick(['Hoje aqui é o Sicredi! 💚', 'Uma placa verdinha! 💚']), 3);
    discover('sicredi');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-12, 12), top + rnd(-4, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(LANE.y0, CURB) });
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
    say(id, x, ROAD.y0 - 12, pick(['Bi-bi! 🚗', 'Fom-fom! 🚙', 'Tremendo no paralelepípedo! 🚗']), 1.8);
    discover('carro');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    w.say = pick(night ? LINES_NIGHT : LINES_DAY);
    w.sayUntil = clock.current + 2.8;
    w.wait = Math.max(w.wait, 2.4);
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
  const doorOpen = L.doors.map((d) => ramp(t, d.at, d.until, 0.5));
  const plaqueGlow = clamp(1 - (t - L.plaque) / 1.6, 0, 1);
  const signOn = t - L.sign < 1.4 ? t - L.sign : 0;

  const walkers = [...L.walkers].sort((a, b) => a.y - b.y);
  const bubbles = [...live(t), ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: w.y - 18, text: w.say! }))];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <radialGradient id="sc-glow">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-up" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.75" />
            <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
          </linearGradient>
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
        <Neighbors night={night} />
        <Facade />
        <Plaque glow={plaqueGlow} />
        <rect className="cw-tap" x={PLAQUE.x0} y={PLAQUE.y0 - 4} width={PLAQUE.x1 - PLAQUE.x0} height={PLAQUE.y1 - PLAQUE.y0 + 4} fill="transparent" role="button" aria-label="Placa do Grande Hotel Villas" onClick={(e) => (e.stopPropagation(), tapPlaque())} />
        <rect className="cw-tap" x={B.x0} y={FLOOR.parapet - 5} width={PLAQUE.x0 - B.x0} height={7} fill="transparent" role="button" aria-label="Ameias do telhado" onClick={(e) => (e.stopPropagation(), tapMerlons())} />
        <rect className="cw-tap" x={PLAQUE.x1} y={FLOOR.parapet - 5} width={B.x1 - PLAQUE.x1} height={7} fill="transparent" onClick={(e) => (e.stopPropagation(), tapMerlons())} />

        {/* Pombos pousados nas ameias (voam quando tocam no telhado) */}
        {L.roosts.map((r) => {
          const k = clamp((t - r.fly) / 2.2, 0, 1);
          const away = t < r.back;
          const back = clamp((t - (r.back - 1.2)) / 1.2, 0, 1);
          const hx = MERLONS[r.m] + 3;
          const hy = FLOOR.parapet - 4;
          let x = hx;
          let y = hy;
          let flying = false;
          if (away && t < r.back - 1.2) {
            x = hx + r.dir * k * 160;
            y = hy - Math.sin(k * Math.PI * 0.6) * 30;
            flying = k < 1;
          } else if (away) {
            x = hx + r.dir * (1 - back) * 160;
            y = hy - Math.sin((1 - back) * Math.PI * 0.6) * 30;
            flying = true;
          }
          return (
            <g key={r.m} transform={`translate(${x.toFixed(2)} ${(y - 5).toFixed(2)}) scale(${r.dir} 1) translate(-5 0)`} pointerEvents="none">
              <Pixels runs={flying ? (Math.sin(t * 30) > 0 ? pigeonFlyA : pigeonFlyB) : pigeonStand} />
            </g>
          );
        })}

        <g pointerEvents="none">
          <UpperWindows open={winOpen} who={L.who} t={t} night={night} />
        </g>
        {Array.from({ length: BAYS }, (_, i) => (
          <rect key={i} className="cw-tap" x={bayX(i) - 9} y={FLOOR.upper + 2} width={18} height={FLOOR.band - FLOOR.upper - 2} fill="transparent" role="button" aria-label="Janela em arco" onClick={(e) => (e.stopPropagation(), tapWindow(i))} />
        ))}
        <g pointerEvents="none">
          <Doors open={doorOpen} night={night} />
        </g>
        {Array.from({ length: BAYS }, (_, i) => (
          <g key={i}>
            <rect className="cw-tap" x={bayX(i) - 8} y={FLOOR.lower + 1} width={16} height={GROUND - FLOOR.lower - 1} fill="transparent" role="button" aria-label="Porta branca" onClick={(e) => (e.stopPropagation(), tapDoor(i))} />
            {[bayX(i) - BAY / 2 + 4, bayX(i) + 9].map((x) => (
              <rect key={x} className="cw-tap" x={x} y={STONE_TOP} width={BAY / 2 - 13} height={GROUND - STONE_TOP} fill="transparent" role="button" aria-label="Pedras da parede" onClick={(e) => (e.stopPropagation(), tapStones(x + BAY / 4 - 6))} />
            ))}
          </g>
        ))}
        <g className="cw-tap" role="button" aria-label="Placa verde do Sicredi" onClick={(e) => (e.stopPropagation(), tapSign())}>
          <Sign on={signOn} />
        </g>

        <BigTree id="t0" x={14} ground={CURB - 1} s={4.6} shaking={shaking === 't0'} onTap={tapTree} />
        <BigTree id="t1" x={300} ground={CURB - 1} s={5} shaking={shaking === 't1'} onTap={tapTree} />

        {walkers.map((w) => (
          <g key={w.id} className="cw-tap" onClick={(e) => (e.stopPropagation(), tapWalker(w))}>
            <Character x={w.x} y={w.y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
          </g>
        ))}

        {L.cars.map((c) => (
          <g key={c.id} className="cw-tap" onClick={(e) => (e.stopPropagation(), tapCar(c.x, `car${c.id}`))}>
            <g transform={`translate(${c.x.toFixed(2)} ${(ROAD.y1 - 9 + (Math.sin(t * 40 + c.id) > 0.6 ? -0.4 : 0)).toFixed(2)}) scale(${c.dir} 1) translate(-10 0)`}>
              <Pixels runs={c.runs} />
            </g>
          </g>
        ))}

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <>
            <g transform={view.layer(DEPTH.near)}>
              <TownLights bd={bd} />
            </g>
            {/* Luzes da calçada iluminando a fachada de baixo para cima */}
            <g pointerEvents="none">
              {Array.from({ length: BAYS + 1 }, (_, i) => (
                <g key={i}>
                  <path d={`M${B.x0 + i * BAY - 2} ${GROUND}L${B.x0 + i * BAY - 6} ${FLOOR.upper}L${B.x0 + i * BAY + 6} ${FLOOR.upper}L${B.x0 + i * BAY + 2} ${GROUND}Z`} fill="url(#sc-up)" opacity={0.6} />
                  <rect x={B.x0 + i * BAY - 1} y={GROUND} width={2} height={1} fill="#fff1b8" />
                </g>
              ))}
              {Array.from({ length: BAYS }, (_, i) => (
                <circle key={i} cx={bayX(i)} cy={GROUND - 12} r={12} fill="url(#sc-glow)" opacity={0.3} />
              ))}
              <circle cx={SIGN.x + 10} cy={SIGN.y + 5} r={14} fill="#5fd46a" opacity={0.18} />
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
        firstTip="Toque na placa lá no alto, nas janelas e nas portas! 👆"
        dragText="👈 Arraste para ver o prédio todo 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
