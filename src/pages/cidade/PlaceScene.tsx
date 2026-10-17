import { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { randomLook, ridgePath } from '../../components/CityWorld';
import { GuideSprite, Pixels, treeRuns, type DayTime } from '../../components/Scene';
import { Character, PlaceArt } from '../../components/World';
import { addPoints, getFound, saveFound, say as sayVoice, sfx, type CityPlace } from '../../lib/cidade';
import { POMBA, POMBA_CLIPS } from '../../lib/vozes';
import { boxSize, GROUND_END } from './sceneKit';
import { fromAscii, outline, seeded, shade, toRuns } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';

/*
 * Visita à Praça Santa Rita: a praça tem vida própria, como o mapa da cidade.
 * - Pombos ciscam e voam, pessoas passeiam, peixinhos nadam no espelho d'água, borboletas (dia) e
 *   vagalumes (noite), nuvens, passarinhos, folhas caindo e o carrinho de pipoca soltando fumaça.
 * - Quase tudo responde ao toque. Cada coisa tocada pela primeira vez vira uma "descoberta";
 *   achar todas vale estrelas (uma vez só).
 * - Em telas estreitas a câmera mostra o centro (igreja + espelho d'água) e dá para arrastar para os lados.
 * - Profundidade (2.5D): o cenário é feito de camadas que andam em velocidades diferentes quando a câmera
 *   se mexe (arrastar, mover o mouse ou o leve balanço automático), com névoa nas serras, luz e sombras.
 */

const W = 320;
const H = 112;
const GROUND = 82;
const CX = 154;
const FOCUS = CX + 8;
/** Largura mínima visível da cena (em pixels do desenho), mesmo em celular de pé. */
const MIN_W = 130;
/** Margem desenhada além dos lados, para telas muito largas e baixas. */
const EDGE = 170;
const INK = '#1b2b33';
const POOL = { x: CX - 56, w: 124 };
const WATER = { x0: POOL.x + 5, x1: POOL.x + POOL.w - 7, y0: GROUND + 9, y1: GROUND + 18 };
const LANE = { y0: GROUND + 24, y1: H - 1 };
const CART = { x: 30, y: H - 3 };
const BEDS = [
  { x: 40, w: 46 },
  { x: 234, w: 46 },
];
const PALMS = [
  { x: 62, flip: false },
  { x: 258, flip: true },
];
/** Onde os pombos pousam no telhado da igreja (y = linha de cima do contorno). */
const ROOF = [
  { x: CX + 8, y: GROUND - 36 },
  { x: CX + 19, y: GROUND - 26 },
  { x: CX + 26, y: GROUND - 26 },
];
const BELL = { x: CX - 4, y: GROUND - 46 };
const BONUS = 10;
const FAR_PEAKS: [number, number][] = [[-140, GROUND - 40], [-40, GROUND - 48], [70, GROUND - 54], [160, GROUND - 44], [240, GROUND - 56], [340, GROUND - 46], [440, GROUND - 52]];
const NEAR_PEAKS: [number, number][] = [[-90, GROUND - 26], [30, GROUND - 32], [120, GROUND - 26], [210, GROUND - 34], [300, GROUND - 28], [400, GROUND - 30]];
const ridgeAt = (base: number, peaks: [number, number][], x: number) => Math.round(Math.min(base, ...peaks.map(([px, py]) => py + Math.abs(x - px) * 0.8)));
/** Quanto a câmera "olha em volta" seguindo o mouse (em pixels do desenho). */
const LOOK = { x: 8, y: 3 };
/** Profundidade de cada camada: 1 = chão da praça; menor = mais longe (anda menos com a câmera); maior = mais perto. */
const DEPTH = { sky: 0.08, clouds: 0.18, far: 0.35, near: 0.55, houses: 0.8, front: 1.35 };
const SKY: Record<DayTime, [string, string]> = { day: ['#3d8ee0', '#bfe6f5'], dusk: ['#c96aa0', '#f6b26b'], night: ['#0b1730', '#24405a'] };
const WATER_C: Record<DayTime, [string, string]> = { day: ['#6cc3df', '#14718f'], dusk: ['#d99a86', '#2a6a80'], night: ['#1f4d66', '#062f3a'] };

const DISCOVERIES = [
  { key: 'sino', emoji: '🔔', label: 'O sino da igreja', tip: 'Toque na torre da igreja para o sino tocar! 🔔' },
  { key: 'agua', emoji: '🐟', label: 'Os peixinhos do laguinho', tip: 'Toque no laguinho para ver os peixinhos! 🐟' },
  { key: 'pombos', emoji: '🐦', label: 'Os pombos', tip: 'Toque nos pombos da praça! 🐦' },
  { key: 'gente', emoji: '👋', label: 'As pessoas passeando', tip: 'Dê um oi para as pessoas passeando! 👋' },
  { key: 'arvore', emoji: '🌴', label: 'As palmeiras e árvores', tip: 'Toque nas palmeiras e nas árvores! 🌴' },
  { key: 'rosas', emoji: '🌹', label: 'As rosas do canteiro', tip: 'Toque nas rosas do canteiro! 🌹' },
  { key: 'pipoca', emoji: '🍿', label: 'O carrinho de pipoca', tip: 'Tem um carrinho de pipoca na praça. Ache ele! 🍿' },
  { key: 'bicho', emoji: '🦋', label: 'Borboletas e vagalumes', tip: 'Toque nas borboletas! 🦋' },
] as const;
type DiscoveryKey = (typeof DISCOVERIES)[number]['key'];

const LINES_DAY = ['Oi! 👋', 'Que praça bonita! 🌳', 'Olha a igreja! ⛪', 'Vou comprar pipoca! 🍿', 'Já tocou o sino? 🔔', 'Bom passeio! 😊', 'Olha os peixinhos! 🐟'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Olha os vagalumes! ✨', 'A igreja fica linda à noite! ⛪', 'Que céu estrelado! ⭐'];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const inWater = (x: number, y: number) => x > POOL.x + 1 && x < POOL.x + POOL.w - 1 && y > GROUND + 5 && y < GROUND + 21;

/* ---- Sprites ---- */

const PALM = [
  '......lll.lll....',
  '....llLLlllLLll..',
  '..llLll.lLl.llLl.',
  '.lLl...lLLLl...ll',
  'lL....lLlclLl...l',
  'l....lL.cbc.Ll...',
  '....lL...b...Ll..',
  '...l.....b....l..',
  '.........b.......',
  '.........B.......',
  '........bB.......',
  '........bB.......',
  '........bB.......',
  '.........bB......',
  '.........bB......',
  '.........bB......',
  '........bbBb.....',
];
export const palmRuns = toRuns(outline(fromAscii(PALM, { l: '#3aa655', L: '#8cc63f', b: '#8a5a2b', B: '#a0703e', c: '#6b4423' }), '#0f3d2a'));

const PIGEON_PAL = { g: '#a7b1b8', G: '#6f7b84', n: '#4f9a8a', k: INK, y: '#e07a3c', w: '#e4e9ec' };
const pigeonStand = toRuns(fromAscii(['.......gg.', '.......gky', '.GGggggng.', '..GGgwwgg.', '....y..y..'], PIGEON_PAL));
const pigeonPeck = toRuns(fromAscii(['..........', '..........', '.GGgggggg.', '..GGgwwgnn', '....y..yky'], PIGEON_PAL));

/* ---- Cenário fixo ---- */

type HouseDef = { x: number; w: number; h: number; wall: string; roof: string; shut: string };
const HOUSES: HouseDef[] = [
  { x: -118, w: 22, h: 16, wall: '#f1e6cf', roof: '#c0573e', shut: '#2e8b47' },
  { x: -80, w: 18, h: 22, wall: '#e9eef2', roof: '#a84a32', shut: '#2f5fb3' },
  { x: -46, w: 24, h: 14, wall: '#fde2b0', roof: '#c0573e', shut: '#12a3a0' },
  { x: 12, w: 20, h: 16, wall: '#f1e6cf', roof: '#c0573e', shut: '#2e8b47' },
  { x: 36, w: 24, h: 24, wall: '#e9eef2', roof: '#a84a32', shut: '#2f5fb3' },
  { x: 64, w: 16, h: 14, wall: '#f4ead8', roof: '#c0573e', shut: '#12a3a0' },
  { x: 214, w: 18, h: 18, wall: '#fde2b0', roof: '#a84a32', shut: '#2e8b47' },
  { x: 240, w: 24, h: 14, wall: '#efe2c6', roof: '#c0573e', shut: '#d64545' },
  { x: 270, w: 20, h: 22, wall: '#e9eef2', roof: '#a84a32', shut: '#2f5fb3' },
  { x: 296, w: 22, h: 16, wall: '#f1e6cf', roof: '#c0573e', shut: '#12a3a0' },
  { x: 340, w: 20, h: 20, wall: '#f4ead8', roof: '#a84a32', shut: '#2e8b47' },
  { x: 380, w: 24, h: 14, wall: '#e9eef2', roof: '#c0573e', shut: '#d64545' },
];

function makeScenery() {
  const rand = seeded(9);
  const stars = Array.from({ length: 90 }, () => ({ x: Math.round(-EDGE + rand() * (W + 2 * EDGE)), y: Math.round(-160 + rand() * 210), dur: 1.4 + rand() * 3.5, delay: -rand() * 4 }));
  // Calçada portuguesa: faixas em ondas (como as das praças mineiras).
  const pave: { x: number; y: number; w: number }[] = [];
  // Perspectiva: as faixas ficam mais juntinhas lá no fundo e mais largas perto de quem olha.
  for (let y = GROUND + 3; y < GROUND_END; y++) {
    const f = Math.pow(y - GROUND, 0.72) * 1.35;
    let start: number | null = null;
    for (let x = -EDGE; x <= W + EDGE; x++) {
      const v = f + Math.sin(x / 7) * 0.22;
      const dark = x < W + EDGE && v - Math.floor(v) < 0.28;
      if (dark && start === null) start = x;
      if (!dark && start !== null) {
        pave.push({ x: start, y, w: x - start });
        start = null;
      }
    }
  }
  const trees = [-140, -100, -62, -20, 6, 88, 112, 200, 232, 316, 338, 372, 410].map((x) => ({ x, dur: 3.4 + rand() * 3, delay: -rand() * 6 }));
  const tufts: { x: number; dur: number; delay: number; c: string }[] = [];
  for (let x = -EDGE; x < W + EDGE; x += 3 + Math.round(rand() * 5)) tufts.push({ x, dur: 1.8 + rand() * 2.4, delay: -rand() * 4, c: rand() > 0.5 ? '#4f8f2c' : '#6fae3c' });
  const roses = BEDS.flatMap((b) =>
    Array.from({ length: 6 }, (_, i) => ({ x: b.x + 3 + i * 7, bed: b.x, dur: 2.2 + rand() * 2, delay: -rand() * 4, c: i % 2 ? '#ec6a8c' : '#d64545' })),
  );
  const lamps = [22, 92, 228, 298].map((x) => ({ x, y: GROUND + 8, dur: 2 + rand() * 3 }));
  // Casinhas espalhadas pela serra (como os bairros nos morros de Cataguases); à noite as janelas acendem.
  const town: { x: number; y: number; w: number; h: number; wall: string; roof: string; lit: boolean }[] = [];
  for (let i = 0; i < 140 && town.length < 64; i++) {
    const x = Math.round(-EDGE + rand() * (W + 2 * EDGE));
    const top = ridgeAt(GROUND - 8, NEAR_PEAKS, x) + 3;
    const y = Math.round(top + rand() * (GROUND - 15 - top));
    if (y > GROUND - 14 || town.some((o) => Math.abs(o.x - x) < 6 && Math.abs(o.y - y) < 4)) continue;
    town.push({ x, y, w: 3 + Math.floor(rand() * 3), h: 2 + Math.floor(rand() * 2), wall: ['#f4efe2', '#f1e3c4', '#e3ecef', '#f6dcc0'][Math.floor(rand() * 4)], roof: rand() > 0.4 ? '#c0573e' : '#a84a32', lit: rand() < 0.65 });
  }
  town.sort((a, b) => a.y - b.y);
  const dots = (n: number, base: number, peaks: [number, number][], c: string[]) =>
    Array.from({ length: n }, () => {
      const x = Math.round(-EDGE + rand() * (W + 2 * EDGE));
      const top = ridgeAt(base, peaks, x) + 2;
      return { x, y: Math.round(top + rand() * Math.max(0, GROUND - top - 4)), c: c[Math.floor(rand() * c.length)] };
    });
  const farDots = dots(70, GROUND - 14, FAR_PEAKS, ['#8cc063', '#97c96f']);
  const nearDots = dots(110, GROUND - 8, NEAR_PEAKS, ['#2f8f4a', '#268043', '#4caf5a']);
  // Galhos de ipê em primeiro plano (rosa à esquerda, amarelo à direita), pendurados no alto da tela.
  const canopy = (flowers: string[]) => {
    // Tufos de folhas ao longo do galho, iluminados de cima/esquerda, com flores nas bordas.
    const cells = new Map<string, { x: number; y: number; c: string }>();
    for (let i = 0; i < 15; i++) {
      const cx = rand() * 54;
      const cy = Math.max(2, 2 + cx * 0.3 + rand() * 13 - 2);
      const r = Math.max(3, 8 - cx / 10 + rand() * 2);
      for (let y = Math.floor((cy - r) / 2) * 2; y <= cy + r; y += 2)
        for (let x = Math.floor((cx - r) / 2) * 2; x <= cx + r; x += 2) {
          const d = Math.hypot(x - cx, y - cy);
          if (d > r || y < 0 || (d > r * 0.8 && rand() < 0.45)) continue;
          const v = (x - cx + (y - cy)) / r;
          const c = d > r * 0.45 && rand() < 0.2 ? flowers[Math.floor(rand() * flowers.length)] : v < -0.55 ? '#5aa84f' : v < 0.25 ? '#2e7d4a' : '#1e5a35';
          cells.set(`${x}:${y}`, { x, y, c });
        }
    }
    return [...cells.values()];
  };
  const canopies = [canopy(['#ec6a8c', '#f7a1b5', '#d6457a']), canopy(['#f2b705', '#ffd84a', '#e0a000'])];
  return { stars, pave, trees, tufts, roses, lamps, town, farDots, nearDots, canopies };
}
type Scenery = ReturnType<typeof makeScenery>;

/** Céu, sol/lua e estrelas (atrás das nuvens). */
const Sky = memo(function Sky({ time, sc }: { time: DayTime; sc: Scenery }) {
  const night = time === 'night';
  const sky = SKY[time];
  return (
    <g>
      <defs>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <radialGradient id="ps-glow">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-EDGE - 200} y={-400} width={W + 2 * EDGE + 400} height={400 + GROUND} fill={sky[1]} />
      <rect x={-EDGE - 200} y={-80} width={W + 2 * EDGE + 400} height={80 + GROUND} fill="url(#ps-sky)" />
      <rect x={-EDGE - 200} y={-400} width={W + 2 * EDGE + 400} height={321} fill={sky[0]} />
      {night &&
        sc.stars.map((s, i) => (
          <rect key={i} className="cw-star" x={s.x} y={s.y} width={1} height={1} fill="#e2f6f5" style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        ))}
      {night ? (
        <g>
          <circle cx={44} cy={14} r={12} fill="#f4f1de" opacity={0.12} />
          <rect x={40} y={10} width={8} height={8} fill="#f4f1de" />
          <rect x={39} y={11} width={10} height={6} fill="#f4f1de" />
          <rect x={43} y={12} width={2} height={2} fill="#dcd8c0" />
          <rect x={41} y={15} width={1} height={1} fill="#dcd8c0" />
        </g>
      ) : (
        <g>
          <circle cx={44} cy={14} r={11} fill={time === 'dusk' ? '#ffd29a' : '#fff3b0'} opacity={0.35} />
          <rect x={40} y={10} width={8} height={8} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
          <rect x={39} y={11} width={10} height={6} fill={time === 'dusk' ? '#f6a85a' : '#ffe27a'} />
          {/* Raios de sol atravessando o céu */}
          <g fill={time === 'dusk' ? '#ffd2a0' : '#fff6c8'}>
            {[
              [70, 120, 0],
              [150, 210, 1.3],
              [250, 300, 2.6],
              [-20, 20, 3.9],
            ].map(([a, b, delay]) => (
              <path key={a} className="ps-ray" d={`M44 14 L${a} ${GROUND} L${b} ${GROUND} Z`} style={{ animationDelay: `${delay}s` }} />
            ))}
          </g>
        </g>
      )}
    </g>
  );
});

function House({ d, night }: { d: HouseDef; night: boolean }) {
  const { x, w, h, wall, roof, shut } = d;
  const top = GROUND - h;
  const rows = Math.min(6, Math.floor(w / 4));
  const dark = shade(roof, -0.22);
  const winRows = h >= 20 ? [top + 3, top + 10] : [top + 4];
  const glass = (i: number) => (night ? (i % 3 === 1 ? '#3d5560' : '#ffd76a') : '#7fb8d6');
  const door = x + Math.round(w / 2) - 2;
  return (
    <g>
      <rect x={x - 1} y={top - 1} width={w + 2} height={h + 1} fill={INK} />
      {Array.from({ length: rows }, (_, i) => (
        <rect key={`o${i}`} x={x - 3 + i} y={top - 2 - i} width={w + 6 - 2 * i} height={2} fill={INK} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <rect key={`r${i}`} x={x - 2 + i} y={top - 1 - i} width={w + 4 - 2 * i} height={1} fill={i % 2 ? dark : roof} />
      ))}
      <rect x={x + w} y={top - 1} width={4} height={h + 1} fill={INK} />
      <rect x={x} y={top} width={w} height={h} fill={wall} />
      <rect x={x + w} y={top + 1} width={3} height={h - 1} fill={shade(wall, -0.3)} />
      <rect x={x + w} y={top + 2} width={1} height={2} fill={shade(wall, -0.45)} />
      <rect x={x} y={GROUND - 2} width={w} height={2} fill={shade(wall, -0.15)} />
      <rect x={door - 1} y={GROUND - 8} width={6} height={8} fill={INK} />
      <rect x={door} y={GROUND - 7} width={4} height={7} fill="#7a4a25" />
      <rect x={door + 3} y={GROUND - 4} width={1} height={1} fill="#f2b705" />
      {winRows.map((wy, r) =>
        [x + 1, x + w - 6].map((wx, i) => (
          <g key={`${r}${i}`}>
            <rect x={wx} y={wy} width={5} height={4} fill={shut} />
            <rect x={wx + 1} y={wy} width={3} height={4} fill={glass(r * 2 + i + x)} />
            <rect x={wx + 1} y={wy + 2} width={3} height={1} fill={shade(wall, -0.25)} />
          </g>
        )),
      )}
    </g>
  );
}

/** Serra do fundo (a mais distante). */
const FarHills = memo(function FarHills({ time, sc }: { time: DayTime; sc: Scenery }) {
  const night = time === 'night';
  const far = useMemo(() => ridgePath(GROUND - 14, FAR_PEAKS, -EDGE - 10, W + EDGE + 10, GROUND), []);
  return (
    <g>
      <path d={far} fill={night ? '#26503f' : time === 'dusk' ? '#9c8fa8' : '#a9d67a'} />
      {!night && sc.farDots.map((d, i) => <rect key={i} x={d.x} y={d.y} width={2} height={1} fill={time === 'dusk' ? '#8b8096' : d.c} />)}
    </g>
  );
});

/** Serra mais perto, com as casinhas dos bairros nos morros. */
const NearHills = memo(function NearHills({ time, sc }: { time: DayTime; sc: Scenery }) {
  const night = time === 'night';
  const near = useMemo(() => ridgePath(GROUND - 8, NEAR_PEAKS, -EDGE - 10, W + EDGE + 10, GROUND), []);
  return (
    <g>
      <path d={near} fill={night ? '#1a4431' : time === 'dusk' ? '#5f7a5a' : '#3aa655'} />
      {sc.nearDots.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={2} height={2} fill={night ? '#153a29' : time === 'dusk' ? '#526b4e' : d.c} />
      ))}
      {sc.town.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y - c.h} width={c.w} height={c.h} fill={night ? '#5a6670' : c.wall} />
          <rect x={c.x - 1} y={c.y - c.h - 1} width={c.w + 2} height={1} fill={night ? '#4a3a36' : c.roof} />
          <rect x={c.x + 1} y={c.y - c.h} width={1} height={1} fill={night ? (c.lit ? '#ffd76a' : '#3d4a52') : '#7fa8be'} />
        </g>
      ))}
    </g>
  );
});

/** Casario em volta da praça. */
const Houses = memo(function Houses({ night }: { night: boolean }) {
  return (
    <g>
      {HOUSES.map((d) => (
        <House key={d.x} d={d} night={night} />
      ))}
    </g>
  );
});

/** Galho florido em primeiro plano (bem perto de quem olha, por isso maior e mais escuro). */
const Canopy = memo(function Canopy({ px, onTap, shaking }: { px: { x: number; y: number; c: string }[]; onTap: () => void; shaking: boolean }) {
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <g className={shaking ? 'ps-canopy shake' : 'ps-canopy'}>
        {Array.from({ length: 34 }, (_, k) => (
          <rect key={`b${k}`} x={k} y={1 + k * 0.22} width={2} height={k < 14 ? 3 : 2} fill="#4a2e18" />
        ))}
        {px.map((p, i) => (
          <rect key={i} x={p.x} y={p.y} width={2} height={2} fill={p.c} />
        ))}
      </g>
    </g>
  );
});

/** Calçada portuguesa em ondas, meio-fio e grama com tufos balançando. */
const Pavement = memo(function Pavement({ sc }: { sc: Scenery }) {
  return (
    <g>
      <rect x={-EDGE - 10} y={GROUND} width={W + 2 * EDGE + 20} height={GROUND_END - GROUND} fill="#e6dcc2" />
      {sc.pave.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill="#c9bb95" />
      ))}
      <rect x={-EDGE - 10} y={GROUND} width={W + 2 * EDGE + 20} height={2} fill="#6fae3c" />
      <rect x={-EDGE - 10} y={GROUND + 2} width={W + 2 * EDGE + 20} height={1} fill="#b9ad8c" />
      {sc.tufts.map((t) => (
        <g key={t.x} className="cw-sway" style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s`, '--a': '10deg' } as CSSProperties}>
          <rect x={t.x} y={GROUND - 2} width={1} height={2} fill={t.c} />
          <rect x={t.x + 1} y={GROUND - 3} width={1} height={3} fill={t.c} />
          <rect x={t.x + 2} y={GROUND - 2} width={1} height={2} fill={t.c} />
        </g>
      ))}
    </g>
  );
});

const BackTree = memo(function BackTree({ x, dur, delay, shaking, onTap }: { x: number; dur: number; delay: number; shaking: boolean; onTap: (id: string, x: number, top: number) => void }) {
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(`t${x}`, x, GROUND - 18);
      }}
    >
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : `${dur}s`, animationDelay: shaking ? undefined : `${delay}s`, '--a': '1.6deg' } as CSSProperties}>
        <g transform={`translate(${x - 9} ${GROUND - 21}) scale(2)`}>
          <Pixels runs={treeRuns} />
        </g>
      </g>
    </g>
  );
});

const Palm = memo(function Palm({ x, flip, shaking, onTap }: { x: number; flip: boolean; shaking: boolean; onTap: (id: string, x: number, top: number) => void }) {
  const y = GROUND + 16;
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(`p${x}`, x, y - 34);
      }}
    >
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '4.4s', '--a': '1.2deg' } as CSSProperties}>
        <g transform={`translate(${x} ${y - 36}) scale(${flip ? -2 : 2} 2) translate(-9 0)`}>
          <Pixels runs={palmRuns} />
        </g>
      </g>
    </g>
  );
});

const Bed = memo(function Bed({ x, w, sc, onTap }: { x: number; w: number; sc: Scenery; onTap: (x: number) => void }) {
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(x + w / 2);
      }}
    >
      <rect x={x} y={GROUND + 14} width={w} height={8} fill={INK} />
      <rect x={x + 1} y={GROUND + 15} width={w - 2} height={6} fill="#5e9a35" />
      <rect x={x + 1} y={GROUND + 18} width={w - 2} height={1} fill="#7a5a3a" />
      <rect x={x + 1} y={GROUND + 19} width={w - 2} height={1} fill="#ddd6c2" />
      <rect x={x + 1} y={GROUND + 20} width={w - 2} height={1} fill="#a9a28b" />
      <ellipse cx={x + w / 2 + 4} cy={GROUND + 23} rx={w / 2} ry={1.5} fill="#000" opacity={0.1} />
      {sc.roses
        .filter((r) => r.bed === x)
        .map((r) => (
          <g key={r.x} className="cw-sway" style={{ animationDuration: `${r.dur}s`, animationDelay: `${r.delay}s`, '--a': '7deg' } as CSSProperties}>
            <rect x={r.x} y={GROUND + 13} width={5} height={4} fill="#2f7d32" />
            <rect x={r.x + 1} y={GROUND + 12} width={3} height={1} fill="#3a8a35" />
            <rect x={r.x + 1} y={GROUND + 12} width={1} height={1} fill={r.c} />
            <rect x={r.x + 3} y={GROUND + 14} width={1} height={1} fill={r.c} />
            <rect x={r.x} y={GROUND + 15} width={1} height={1} fill={r.c} />
          </g>
        ))}
    </g>
  );
});

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x + 1} ${y} L${x + 18} ${y + 4} L${x + 15} ${y + 4} Z`} fill="#000" opacity={0.1} />
      <rect x={x - 1} y={y} width={4} height={1} fill="#000" opacity={0.18} />
      <rect x={x - 1} y={y - 3} width={3} height={3} fill="#3c4a52" />
      <rect x={x} y={y - 26} width={1} height={26} fill="#5b6770" />
      <rect x={x - 2} y={y - 28} width={5} height={2} fill="#3c4a52" />
      <rect x={x - 1} y={y - 26} width={3} height={2} fill="#fff4c2" />
    </g>
  );
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y + 5} width={14} height={1} fill="#000" opacity={0.15} />
      <rect x={x} y={y - 3} width={14} height={1} fill="#7a4a25" />
      <rect x={x} y={y - 1} width={14} height={2} fill="#a0703e" />
      <rect x={x + 1} y={y + 1} width={2} height={4} fill="#5c3a1c" />
      <rect x={x + 11} y={y + 1} width={2} height={4} fill="#5c3a1c" />
    </g>
  );
}

const Cart = memo(function Cart({ onTap }: { onTap: () => void }) {
  const { x, y } = CART;
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
    >
      <ellipse cx={x} cy={y} rx={12} ry={1.5} fill="#000" opacity={0.15} />
      {/* Toldo listrado */}
      <rect x={x - 11} y={y - 23} width={22} height={4} fill={INK} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={x - 10 + i * 4} y={y - 22} width={4} height={2} fill={i % 2 ? '#fffdf5' : '#d64545'} />
      ))}
      <rect x={x - 9} y={y - 20} width={1} height={7} fill="#5b6770" />
      <rect x={x + 8} y={y - 20} width={1} height={7} fill="#5b6770" />
      {/* Vitrine com pipoca */}
      <rect x={x - 8} y={y - 18} width={16} height={7} fill={INK} />
      <rect x={x - 7} y={y - 17} width={14} height={5} fill="#fff6d6" />
      {[-6, -3, 0, 3, 5, -5, -1, 2].map((dx, i) => (
        <rect key={i} x={x + dx} y={y - 14 + (i % 3)} width={1} height={1} fill={i % 2 ? '#f2d36b' : '#fffdf0'} />
      ))}
      <rect x={x - 7} y={y - 17} width={14} height={1} fill="#ffffff" opacity={0.6} />
      {/* Carrinho */}
      <rect x={x - 10} y={y - 11} width={20} height={8} fill={INK} />
      <rect x={x - 9} y={y - 10} width={18} height={6} fill="#d64545" />
      <rect x={x - 9} y={y - 8} width={18} height={1} fill="#fffdf5" />
      <rect x={x + 10} y={y - 9} width={5} height={1} fill="#5b6770" />
      <rect x={x - 8} y={y - 4} width={4} height={4} fill={INK} />
      <rect x={x + 4} y={y - 4} width={4} height={4} fill={INK} />
      <rect x={x - 7} y={y - 3} width={2} height={2} fill="#8a8f88" />
      <rect x={x + 5} y={y - 3} width={2} height={2} fill="#8a8f88" />
    </g>
  );
});

/** Espelho d'água: borda, água e o reflexo da igreja. */
const Pool = memo(function Pool({ time }: { time: DayTime }) {
  const [top, deep] = WATER_C[time];
  return (
    <g>
      <defs>
        <linearGradient id="ps-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
      </defs>
      <rect x={POOL.x - 2} y={GROUND + 4} width={POOL.w + 4} height={19} fill="#b9b29c" />
      <rect x={POOL.x - 1} y={GROUND + 5} width={POOL.w + 2} height={16} fill="#e9e2d0" />
      <rect x={POOL.x - 2} y={GROUND + 21} width={POOL.w + 4} height={2} fill="#9d977f" />
      <rect x={POOL.x + 2} y={GROUND + 6} width={POOL.w - 4} height={14} fill="url(#ps-water)" />
      <rect x={POOL.x + 2} y={GROUND + 6} width={POOL.w - 4} height={2} fill="#000" opacity={0.18} />
      <rect x={POOL.x + 2} y={GROUND + 6} width={2} height={14} fill="#000" opacity={0.1} />
    </g>
  );
});

const Reflection = memo(function Reflection({ art, night }: { art: CityPlace; night: boolean }) {
  return (
    <g clipPath="url(#ps-pool)">
      <g transform={`translate(0 ${2 * (GROUND + 4)}) scale(1 -1)`} opacity={0.42}>
        <PlaceArt p={art} night={night} />
      </g>
    </g>
  );
});

const Church = memo(function Church({ art, night, onTap }: { art: CityPlace; night: boolean; onTap: () => void }) {
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      role="button"
      aria-label="Tocar o sino da igreja"
    >
      <path d={`M${CX - 20} ${GROUND + 1} L${CX + 37} ${GROUND + 1} L${CX + 54} ${GROUND + 4} L${CX - 4} ${GROUND + 4} Z`} fill="#000" opacity={0.12} />
      <PlaceArt p={art} night={night} />
      <rect x={CX - 17} y={GROUND + 1} width={34} height={1} fill="#f3eedf" />
      <rect x={CX - 19} y={GROUND + 2} width={38} height={1} fill="#d6cfba" />
    </g>
  );
});

/* ---- Coisas vivas ---- */

type PKind = 'leaf' | 'petal' | 'spark' | 'ripple' | 'note' | 'drop' | 'marker' | 'puff' | 'corn' | 'fish' | 'mote';
interface Particle {
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

interface Pigeon {
  id: number;
  x: number;
  y: number;
  face: 1 | -1;
  mode: 'stand' | 'walk' | 'fly';
  next: number;
  peck: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t0: number;
  dur: number;
  arc: number;
}

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
  /** Criança de bicicleta: atravessa a praça de um lado ao outro. */
  bike?: boolean;
}

interface Koi {
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: 1 | -1;
  speed: number;
  hidden: number;
  c: string;
}

interface Flyer {
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

interface Glow {
  id: number;
  x: number;
  y: number;
  ph: number;
  f: number;
  vx: number;
  vy: number;
}

interface Flock {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  birds: { dx: number; dy: number; ph: number }[];
}

interface Bubble {
  x: number;
  y: number;
  text: string;
  until: number;
}

let uid = 1;

function groundSpot() {
  return Math.random() < 0.7 ? { x: rnd(8, W - 8), y: Math.round(rnd(LANE.y0, LANE.y1)) } : { x: rnd(POOL.x + 6, POOL.x + POOL.w - 6), y: GROUND + 3 };
}

function newPigeon(at: { x: number; y: number }): Pigeon {
  return { id: uid++, x: at.x, y: at.y, face: pick([-1, 1]), mode: 'stand', next: rnd(0, 2), peck: 0, sx: 0, sy: 0, tx: at.x, ty: at.y, t0: 0, dur: 1, arc: 0 };
}

function newWalker(x?: number): Walker {
  const from = x ?? pick([-20, W + 20]);
  return { id: uid++, x: from, y: Math.round(rnd(LANE.y0 + 2, LANE.y1)), tx: rnd(20, W - 20), speed: rnd(10, 16), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function newBiker(): Walker {
  return { ...newWalker(-40), bike: true, tx: W + 40, speed: 32, wait: rnd(2, 5) };
}

function initLife() {
  return {
    pigeons: [newPigeon(ROOF[0]), newPigeon(ROOF[1]), ...Array.from({ length: 6 }, () => newPigeon(groundSpot()))],
    walkers: [newWalker(rnd(40, 120)), newWalker(rnd(190, 280)), newWalker(), newWalker(), newBiker()],
    koi: ['#f07a2a', '#f4f1de', '#f2b705'].map((c): Koi => {
      const x = rnd(WATER.x0, WATER.x1);
      const y = rnd(WATER.y0, WATER.y1);
      return { x, y, tx: x, ty: y, face: 1, speed: rnd(4, 7), hidden: 0, c };
    }),
    flyers: Array.from({ length: 5 }, (): Flyer => {
      const x = rnd(30, 290);
      const y = rnd(GROUND - 14, GROUND + 22);
      return { id: uid++, x, y, tx: x, ty: y, c: pick(['#f2b705', '#ec6a8c', '#ffffff', '#7fb8ff', '#ff8a5c']), rest: rnd(0, 2), phase: rnd(0, 6), speed: rnd(10, 16), flee: 0 };
    }),
    glows: Array.from({ length: 18 }, (): Glow => ({ id: uid++, x: rnd(0, W), y: rnd(GROUND - 34, H - 4), ph: rnd(0, 6), f: rnd(1.2, 3.2), vx: rnd(-3, 3), vy: rnd(-2, 2) })),
    clouds: Array.from({ length: 6 }, () => ({ x: rnd(-EDGE, W + EDGE), y: rnd(-30, 26), w: rnd(14, 32), speed: rnd(1.2, 3.4) })),
    flocks: [] as Flock[],
    particles: [] as Particle[],
    timers: { spark: 0, leaf: rnd(1, 3), flock: rnd(3, 9), puff: 0, petal: rnd(3, 6), mote: 0, canopy: rnd(2, 4) },
    bell: 0,
  };
}

/* ---- Componente ---- */

export const PlaceScene = memo(function PlaceScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const sc = useMemo(makeScenery, []);
  const art = useMemo(() => ({ ...place, x: CX, y: GROUND }), [place]);
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const size = useRef({ w: 1280, h: 480, pad: 0 });
  const camX = useRef<number | null>(null);
  const drag = useRef<{ x: number; cam: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const suppress = useRef(false);
  const life = useRef(initLife());
  const clock = useRef(0);
  const bubbles = useRef(new Map<string, Bubble>());
  const dove = useRef<{ text: string; until: number }>({ text: '', until: 0 });
  const toast = useRef<{ text: string; big: boolean; until: number }>({ text: '', big: false, until: 0 });
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [shaking, setShaking] = useState<string | null>(null);
  // Câmera 2.5D: para onde o mouse "olha", o deslocamento das camadas e onde estão os galhos da frente.
  const look = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const view = useRef({ x: 0, w: W, houseShift: 0 });
  const canopyAt = useRef({ lx: 0, rx: 0, top: 0, k: 1 });
  const [found, setFound] = useState<string[]>(() => getFound(place.id));
  const foundRef = useRef(found);
  const [fresh, setFresh] = useState<string | null>(null);

  const spawn = (kind: PKind, x: number, y: number, o: Partial<Particle> = {}) => {
    const list = life.current.particles;
    if (list.length > 260) list.shift();
    list.push({ id: uid++, kind, x, y, vx: 0, vy: 0, age: 0, life: 1, c: '#fff', seed: Math.random() * 6, ...o });
  };

  const say = (key: string, x: number, y: number, text: string, secs = 2.6) => bubbles.current.set(key, { x, y, text, until: clock.current + secs });

  const discover = useCallback(
    (key: DiscoveryKey) => {
      if (foundRef.current.includes(key)) return;
      const next = [...foundRef.current, key];
      foundRef.current = next;
      setFound(next);
      setFresh(key);
      saveFound(place.id, next);
      const d = DISCOVERIES.find((x) => x.key === key)!;
      if (next.length >= DISCOVERIES.length) {
        const total = addPoints(BONUS);
        onPoints?.(total);
        toast.current = { text: `Você descobriu tudo! +${BONUS} ⭐`, big: true, until: clock.current + 4 };
        setTimeout(() => sfx('ok'), 250);
      } else {
        toast.current = { text: `Descoberta: ${d.emoji} ${d.label}!`, big: false, until: clock.current + 2.4 };
      }
    },
    [place.id, onPoints],
  );

  const guard = () => !suppress.current;

  /** Pombo levanta voo e pousa em outro lugar (às vezes no telhado da igreja). */
  const scare = (p: Pigeon) => {
    if (p.mode === 'fly') return;
    const L = life.current;
    const free = ROOF.filter((r) => !L.pigeons.some((o) => o !== p && Math.abs(o.tx - r.x) < 3 && Math.abs(o.ty - r.y) < 3));
    const to = free.length && Math.random() < 0.3 ? pick(free) : groundSpot();
    const dist = Math.hypot(to.x - p.x, to.y - p.y);
    Object.assign(p, { mode: 'fly', sx: p.x, sy: p.y, tx: to.x, ty: to.y, t0: clock.current, dur: clamp(dist / 55, 0.9, 2.4), arc: rnd(14, 28), face: to.x > p.x ? 1 : -1 });
  };

  const tapChurch = useCallback(() => {
    if (!guard()) return;
    const L = life.current;
    sfx('bell');
    L.bell = clock.current + 2.4;
    for (let i = 0; i < 6; i++) spawn('note', BELL.x + rnd(-4, 4), BELL.y - 2, { vx: rnd(-7, 7), vy: rnd(-13, -7), life: rnd(1.6, 2.4), c: pick(['#1d3f86', '#2f5fb3', '#d64545', '#f2b705']), seed: rnd(0, 6) + i });
    say('bell', BELL.x, BELL.y - 6, 'Blém, blém! 🔔');
    let flew = false;
    for (const p of L.pigeons)
      if (p.y < GROUND || Math.random() < 0.5) {
        scare(p);
        flew = true;
      }
    if (flew) setTimeout(() => sfx('chirp'), 300);
    discover('sino');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discover]);

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      if (id.startsWith('t')) x += view.current.houseShift;
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++)
        spawn('leaf', x + rnd(-8, 8), top + rnd(-4, 6), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(GROUND + 4, LANE.y1) });
      if (Math.random() < 0.4) {
        setTimeout(() => sfx('chirp'), 120);
        life.current.flocks.push({ id: uid++, x, y: top, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapBed = useCallback(
    (x: number) => {
      if (!guard()) return;
      sfx('rustle');
      for (let i = 0; i < 8; i++) spawn('petal', x + rnd(-18, 18), GROUND + 12, { vx: rnd(-6, 6), vy: rnd(-14, -6), life: rnd(1.6, 2.6), c: pick(['#d64545', '#ec6a8c', '#f7a1b5']), floor: GROUND + rnd(16, 26) });
      say(`bed${x}`, x, GROUND + 8, 'As rosas de Santa Rita! 🌹');
      discover('rosas');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapCanopy = useCallback(
    (side: 0 | 1) => {
      if (!guard()) return;
      const id = `c${side}`;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      const c = canopyAt.current;
      const x0 = side ? c.rx - 40 * c.k : c.lx;
      for (let i = 0; i < 12; i++)
        spawn('petal', x0 + rnd(0, 40 * c.k), c.top + rnd(2, 20 * c.k), { vx: rnd(-6, 6), vy: rnd(5, 10), life: rnd(2.4, 3.6), c: side ? pick(['#f2b705', '#ffd84a']) : pick(['#ec6a8c', '#f7a1b5']), floor: rnd(GROUND + 4, LANE.y1) });
      say(id, side ? c.rx - 20 * c.k : c.lx + 20 * c.k, c.top + 22 * c.k, side ? 'Ipê amarelo! 🌼' : 'Ipê rosa! 🌸');
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapCart = useCallback(() => {
    if (!guard()) return;
    [0, 110, 230].forEach((ms) => setTimeout(() => sfx('pop'), ms));
    for (let i = 0; i < 14; i++) spawn('corn', CART.x + rnd(-5, 5), CART.y - 17, { vx: rnd(-12, 12), vy: rnd(-34, -18), life: 2.2, c: pick(['#fffdf0', '#f2d36b', '#ffffff']), floor: CART.y - rnd(0, 3) });
    say('cart', CART.x, CART.y - 25, 'Pipoca quentinha! 🍿');
    // Alguém vem comprar pipoca.
    const w = life.current.walkers.reduce((a, b) => (Math.abs(b.x - CART.x) < Math.abs(a.x - CART.x) ? b : a));
    w.tx = CART.x + 16;
    w.wait = 0;
    discover('pipoca');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discover]);

  // Tamanho da área da cena (a câmera se ajusta a qualquer formato de tela).
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => {
      size.current = boxSize(el);
    });
    size.current = boxSize(el);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A pomba dá a primeira dica quando a cena termina de abrir.
  useEffect(() => {
    const id = setTimeout(() => (dove.current = { text: 'Toque nas coisas da praça para descobrir! 👆', until: clock.current + 5 }), 1600);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!fresh) return;
    const id = setTimeout(() => setFresh(null), 1500);
    return () => clearTimeout(id);
  }, [fresh]);

  // Laço principal: todo o ambiente da praça.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const L = life.current;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock.current += dt;
      const t = clock.current;

      // Câmera "olhando em volta" (segue o mouse devagar)
      const lk = look.current;
      lk.x += (lk.tx - lk.x) * Math.min(1, dt * 2);
      lk.y += (lk.ty - lk.y) * Math.min(1, dt * 2);

      // Nuvens
      for (const c of L.clouds) {
        c.x += c.speed * dt;
        if (c.x > W + EDGE) {
          c.x = -EDGE - c.w;
          c.y = rnd(-30, 26);
          c.w = rnd(14, 32);
          c.speed = rnd(1.2, 3.4);
        }
      }

      // Bandos de passarinhos atravessando o céu
      L.timers.flock -= dt;
      if (L.timers.flock <= 0) {
        L.timers.flock = rnd(9, 22);
        const dir = pick([-1, 1]);
        const n = 2 + Math.floor(Math.random() * 4);
        L.flocks.push({
          id: uid++,
          x: dir > 0 ? -EDGE : W + EDGE,
          y: rnd(-10, 30),
          vx: dir * rnd(24, 36),
          vy: rnd(-1.5, 1.5),
          birds: Array.from({ length: n }, (_, i) => ({ dx: -dir * i * rnd(5, 8), dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * rnd(2, 4), ph: rnd(0, 6) })),
        });
      }
      for (const f of L.flocks) {
        f.x += f.vx * dt;
        f.y += f.vy * dt + Math.sin(t * 1.3 + f.id) * 2 * dt;
      }
      L.flocks = L.flocks.filter((f) => f.x > -EDGE - 40 && f.x < W + EDGE + 40 && f.y > -200);

      // Pombos: ciscam, andam um pouquinho, viram de lado; voam quando assustados.
      for (const p of L.pigeons) {
        if (p.mode === 'fly') {
          if (t - p.t0 >= p.dur) {
            p.x = p.tx;
            p.y = p.ty;
            p.mode = 'stand';
            p.next = t + rnd(0.6, 2);
          }
          continue;
        }
        if (p.mode === 'walk') {
          const dx = p.tx - p.x;
          if (Math.abs(dx) < 0.5) {
            p.mode = 'stand';
            p.next = t + rnd(0.4, 1.8);
          } else {
            p.face = dx > 0 ? 1 : -1;
            p.x += Math.sign(dx) * Math.min(Math.abs(dx), 7 * dt);
          }
          continue;
        }
        p.peck = Math.max(0, p.peck - dt);
        if (t > p.next) {
          const roof = p.y < GROUND;
          const r = Math.random();
          if (r < 0.45 && !roof) {
            const [lo, hi] = p.y >= LANE.y0 ? [6, W - 6] : [POOL.x + 4, POOL.x + POOL.w - 4];
            p.mode = 'walk';
            p.tx = clamp(p.x + pick([-1, 1]) * rnd(4, 14), lo, hi);
          } else if (r < 0.75 && !roof) p.peck = 0.22;
          else p.face = p.face === 1 ? -1 : 1;
          p.next = t + rnd(0.5, 2.2);
        }
      }

      // Pessoas passeando pela calçada (espantam os pombos do caminho)
      for (const w of L.walkers) {
        if (w.bike) {
          if (w.wait > 0) {
            w.wait -= dt;
            w.walk = 0;
            continue;
          }
          const bx = w.tx - w.x;
          if (Math.abs(bx) < 1) {
            // Saiu da praça: espera um pouco e volta pelo outro lado, com outra criança.
            Object.assign(w, { wait: rnd(5, 12), tx: w.x < 0 ? W + 40 : -40, y: Math.round(rnd(LANE.y0 + 3, LANE.y1)), config: randomLook() });
            continue;
          }
          w.x += Math.sign(bx) * Math.min(Math.abs(bx), w.speed * dt);
          w.walk += dt;
          for (const p of L.pigeons) if (p.mode !== 'fly' && p.y >= GROUND && Math.abs(p.x - w.x) < 12 && Math.abs(p.y - w.y) < 5) scare(p);
          continue;
        }
        if (w.wait > 0) {
          w.wait -= dt;
          w.walk = 0;
          continue;
        }
        const dx = w.tx - w.x;
        if (Math.abs(dx) < 0.8) {
          if (w.x < -10 || w.x > W + 10) {
            Object.assign(w, newWalker());
            continue;
          }
          w.wait = rnd(1.2, 5);
          if (Math.random() < 0.3 && t > w.sayUntil) {
            w.say = pick(night ? LINES_NIGHT : LINES_DAY);
            w.sayUntil = t + 2.6;
          }
          w.tx = Math.random() < 0.18 ? pick([-20, W + 20]) : rnd(10, W - 10);
        } else {
          w.x += Math.sign(dx) * Math.min(Math.abs(dx), w.speed * dt);
          w.walk += dt;
          for (const p of L.pigeons) if (p.mode !== 'fly' && p.y >= GROUND && Math.abs(p.x - w.x) < 7 && Math.abs(p.y - w.y) < 4) scare(p);
        }
      }

      // Peixinhos no espelho d'água
      for (const k of L.koi) {
        if (t < k.hidden) continue;
        const dx = k.tx - k.x;
        const dy = k.ty - k.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) {
          k.tx = rnd(WATER.x0, WATER.x1);
          k.ty = rnd(WATER.y0, WATER.y1);
          k.speed = rnd(4, 8);
        } else {
          k.x += (dx / d) * k.speed * dt;
          k.y += (dy / d) * k.speed * dt * 0.5;
          if (Math.abs(dx) > 0.3) k.face = dx > 0 ? 1 : -1;
        }
      }

      // Borboletas (dia) e vagalumes (noite)
      if (!night) {
        for (const f of L.flyers) {
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
            f.ty = clamp(f.y + rnd(-20, 20), GROUND - 20, GROUND + 22);
          } else {
            const sp = f.speed * (f.flee > 0 ? 2.6 : 1);
            f.x += (vx / dist) * sp * dt + Math.sin(t * 3.1 + f.phase) * 6 * dt;
            f.y += (vy / dist) * sp * dt + Math.sin(t * 5.3 + f.phase * 2) * 9 * dt;
          }
        }
      } else {
        for (const g of L.glows) {
          g.vx = clamp(g.vx + rnd(-6, 6) * dt, -4, 4);
          g.vy = clamp(g.vy + rnd(-6, 6) * dt, -3, 3);
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          if (g.x < -20 || g.x > W + 20) g.vx *= -1;
          if (g.y < GROUND - 36 || g.y > H - 2) g.vy *= -1;
        }
      }

      // Partículas: brilhos na água, folhas e pétalas, fumaça da pipoca...
      L.timers.spark -= dt;
      if (L.timers.spark <= 0) {
        L.timers.spark = rnd(0.1, 0.3);
        spawn('spark', rnd(WATER.x0, WATER.x1), rnd(GROUND + 7, GROUND + 19), { life: rnd(0.4, 1.1), vx: rnd(0.5, 2), c: night ? '#8fd6e0' : '#e9fbff' });
      }
      L.timers.leaf -= dt;
      if (L.timers.leaf <= 0) {
        L.timers.leaf = rnd(1.4, 3.6);
        const palm = Math.random() < 0.35 ? pick(PALMS) : null;
        const x = palm ? palm.x : pick(sc.trees).x + view.current.houseShift;
        spawn('leaf', x + rnd(-6, 6), palm ? GROUND - 18 : GROUND - rnd(8, 16), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a', '#d9a441']), floor: rnd(GROUND + 2, LANE.y1) });
      }
      L.timers.petal -= dt;
      if (L.timers.petal <= 0) {
        L.timers.petal = rnd(3, 7);
        const b = pick(BEDS);
        spawn('petal', b.x + rnd(4, b.w - 4), GROUND + 12, { vx: rnd(-4, 4), vy: rnd(2, 4), life: rnd(2, 3), c: pick(['#d64545', '#ec6a8c']), floor: GROUND + rnd(22, 28) });
      }
      // Poeirinha brilhando na luz (dia e fim de tarde) e flores caindo dos ipês
      L.timers.mote -= dt;
      if (!night && L.timers.mote <= 0) {
        L.timers.mote = rnd(0.25, 0.6);
        const v = view.current;
        spawn('mote', rnd(v.x, v.x + v.w), rnd(GROUND - 50, H - 4), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
      }
      L.timers.canopy -= dt;
      if (L.timers.canopy <= 0) {
        L.timers.canopy = rnd(1.5, 3.5);
        const c = canopyAt.current;
        const right = Math.random() < 0.5;
        spawn('petal', right ? c.rx - rnd(0, 40 * c.k) : c.lx + rnd(0, 40 * c.k), c.top + rnd(4, 18 * c.k), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(3, 5), c: right ? pick(['#f2b705', '#ffd84a']) : pick(['#ec6a8c', '#f7a1b5']), floor: rnd(GROUND + 4, LANE.y1) });
      }
      L.timers.puff -= dt;
      if (L.timers.puff <= 0) {
        L.timers.puff = rnd(0.5, 1.1);
        spawn('puff', CART.x + rnd(-4, 4), CART.y - 24, { vx: rnd(-1.5, 1.5), vy: rnd(-5, -3), life: rnd(1.4, 2.2), c: '#ffffff' });
      }
      for (const q of L.particles) {
        q.age += dt;
        if (q.kind === 'drop' || q.kind === 'corn' || q.kind === 'fish') {
          q.vy += 70 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          if (q.vy > 0 && q.y > (q.floor ?? H)) {
            if (q.kind === 'fish') {
              q.age = q.life;
              spawn('ripple', q.x, q.floor!, { life: 1, c: '#d6f6fa' });
              for (let i = 0; i < 4; i++) spawn('drop', q.x, q.floor!, { vx: rnd(-8, 8), vy: rnd(-20, -10), life: 1.4, c: '#bfeaf2', floor: q.floor! });
              sfx('splash');
            } else if (q.kind === 'corn') {
              q.y = q.floor!;
              q.vy = 0;
              q.vx = 0;
              q.age += dt; // no chão, some mais rápido
            } else q.age = q.life;
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
      L.particles = L.particles.filter((q) => q.age < q.life);

      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [night, time, sc]);

  const t = clock.current;
  const L = life.current;

  /* ---- Câmera ---- */
  const { w: bw, h: bh } = size.current;
  const aspect = bw / Math.max(1, bh);
  let vw = Math.min(W, Math.max(MIN_W, H * aspect));
  let vh = vw / aspect;
  if (H - vh > 12) {
    // Tela larga e baixa: mostra a torre inteira e abre para os lados (há cenário desenhado além das bordas).
    vh = H - 12;
    vw = Math.min(W + 2 * EDGE - 20, vh * aspect);
    vh = vw / aspect;
  }
  const [lo, hi] = vw <= W ? [0, W - vw] : [(W - vw) / 2, (W - vw) / 2];
  const defX = clamp(FOCUS - vw / 2, lo, hi);
  const vx = clamp(camX.current ?? defX, lo, hi);
  const vy = H - vh;
  // A tela continua por baixo do quadro de perguntas: o enquadramento vai até lá embaixo.
  vh += (size.current.pad * vw) / Math.max(1, bw);
  const canDrag = vw < W - 1;
  // Balanço leve e automático + o "olhar" do mouse: as camadas se deslocam em velocidades diferentes (profundidade).
  const lookX = look.current.x + Math.sin(t * 0.13) * 2;
  const lookY = look.current.y + Math.sin(t * 0.09 + 1) * 0.6;
  const fx = vx + lookX;
  const fy = vy + lookY;
  const off = fx - defX;
  const layer = (d: number) => `translate(${(off * (1 - d)).toFixed(2)} ${(lookY * (1 - d)).toFixed(2)})`;
  view.current = { x: fx, w: vw, houseShift: off * (1 - DEPTH.houses) };
  // Galhos da frente presos às bordas da tela, com um pouco de paralaxe ao olhar em volta.
  const ck = clamp(vw / 200, 0.7, 1.3);
  const canopy = { lx: fx - 10 - lookX * 0.4, rx: fx + vw + 10 - lookX * 0.4, top: fy - 3 - lookY * 0.4, k: ck };
  canopyAt.current = canopy;

  const toWorld = (e: MouseEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = toWorld(e);
    if (!pt) return;
    if (inWater(pt.x, pt.y)) {
      sfx('splash');
      spawn('ripple', pt.x, pt.y, { life: 1.1, c: '#d6f6fa' });
      setTimeout(() => spawn('ripple', pt.x, pt.y, { life: 0.9, c: '#d6f6fa' }), 180);
      for (let i = 0; i < 5; i++) spawn('drop', pt.x, pt.y, { vx: rnd(-9, 9), vy: rnd(-24, -12), life: 1.4, c: '#bfeaf2', floor: pt.y });
      // O peixinho mais perto pula para fora d'água.
      const visible = L.koi.filter((k) => t >= k.hidden);
      if (visible.length) {
        const k = visible.reduce((a, b) => (Math.hypot(b.x - pt.x, b.y - pt.y) < Math.hypot(a.x - pt.x, a.y - pt.y) ? b : a));
        const lx = clamp(k.x + (pt.x >= k.x ? 1 : -1) * rnd(10, 18), WATER.x0, WATER.x1);
        spawn('fish', k.x, k.y, { vx: (lx - k.x) / 0.97, vy: -34, life: 3, c: k.c, floor: k.y });
        k.hidden = t + 1.15;
        k.x = lx;
        k.tx = lx;
        k.ty = k.y;
        say('fish', lx, GROUND + 2, pick(['Olha o peixinho! 🐟', 'Splash! 💦', 'Que pulo! 🐠']), 2);
        discover('agua');
      }
      return;
    }
    if (pt.y < GROUND) return;
    spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
    let any = false;
    for (const p of L.pigeons)
      if (p.mode !== 'fly' && p.y >= GROUND && Math.hypot(p.x - pt.x, (p.y - pt.y) * 2) < 18) {
        scare(p);
        any = true;
      }
    if (any) {
      sfx('chirp');
      discover('pombos');
    }
  };

  const tapPigeon = (p: Pigeon) => {
    if (!guard()) return;
    sfx('chirp');
    scare(p);
    for (const o of L.pigeons) if (o !== p && o.y >= GROUND && Math.abs(o.x - p.x) < 24 && Math.abs(o.y - p.y) < 10) scare(o);
    discover('pombos');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    if (w.bike) {
      w.say = pick(['Trim, trim! 🚲', 'Olha eu de bicicleta! 🚲', 'Uhuuu! 🚲']);
      w.sayUntil = t + 2.2;
    } else {
      w.say = pick(night ? LINES_NIGHT : LINES_DAY);
      w.sayUntil = t + 2.8;
      w.wait = Math.max(w.wait, 2.4);
    }
    discover('gente');
  };

  const tapFlyer = (f: Flyer) => {
    if (!guard()) return;
    sfx('chirp');
    f.flee = 1.4;
    f.rest = 0;
    f.tx = clamp(f.x + rnd(-60, 60), 10, W - 10);
    f.ty = clamp(f.y - rnd(10, 24), GROUND - 24, GROUND + 22);
    for (let i = 0; i < 4; i++) spawn('spark', f.x, f.y, { life: rnd(0.4, 0.7), vx: rnd(-6, 6), vy: rnd(-6, 2), c: f.c });
    discover('bicho');
  };

  const tapGlow = (g: Glow) => {
    if (!guard()) return;
    sfx('chirp');
    g.vx = rnd(-4, 4);
    g.vy = -3;
    for (let i = 0; i < 6; i++) spawn('spark', g.x, g.y, { life: rnd(0.5, 0.9), vx: rnd(-6, 6), vy: rnd(-6, 3), c: '#fff59a' });
    discover('bicho');
  };

  const tapDove = () => {
    sfx('chirp');
    const missing = DISCOVERIES.filter((d) => !foundRef.current.includes(d.key));
    const tip = missing.length ? (missing[0].key === 'bicho' && night ? 'Toque nos vagalumes! ✨' : pick(missing).tip) : 'Você é um ótimo explorador! ⭐';
    dove.current = { text: tip, until: t + 4 };
    sayVoice([POMBA_CLIPS.tip], POMBA);
  };

  // Arrastar para os lados (quando a praça não cabe inteira na tela).
  const onPointerDown = (e: PointerEvent) => {
    if (!canDrag || e.button > 0) return;
    drag.current = { x: e.clientX, cam: vx, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
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
    camX.current = clamp(dr.cam - dx * (vw / Math.max(1, bw)), lo, hi);
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      suppress.current = true;
      setTimeout(() => (suppress.current = false), 0);
    }
    drag.current = null;
  };

  /* ---- Profundidade: quem está mais embaixo é desenhado por cima ---- */
  const pigeonNode = (p: Pigeon) => {
    let x = p.x;
    let y = p.y;
    let flap = false;
    if (p.mode === 'fly') {
      const k = clamp((t - p.t0) / p.dur, 0, 1);
      x = p.sx + (p.tx - p.sx) * k;
      y = p.sy + (p.ty - p.sy) * k - Math.sin(Math.PI * k) * p.arc;
      flap = Math.sin(t * 28 + p.id) > 0;
    }
    const fly = p.mode === 'fly';
    return (
      <g
        className="cw-tap"
        onClick={(e) => {
          e.stopPropagation();
          tapPigeon(p);
        }}
      >
        {!fly && <ellipse cx={x} cy={y} rx={4} ry={0.8} fill="#000" opacity={0.15} />}
        <g transform={`translate(${x.toFixed(2)} ${(y - 5 - (p.mode === 'walk' && Math.sin(t * 22 + p.id) > 0 ? 0.5 : 0)).toFixed(2)}) scale(${p.face} 1) translate(-5 0)`}>
          <rect x={-1} y={-2} width={12} height={8} fill="transparent" />
          <Pixels runs={p.peck > 0 ? pigeonPeck : pigeonStand} />
          {fly && (flap ? <rect x={2} y={-2} width={4} height={3} fill="#6f7b84" /> : <rect x={2} y={3} width={4} height={2} fill="#6f7b84" />)}
        </g>
      </g>
    );
  };

  const bikeNode = (w: Walker) => {
    const spin = Math.floor(w.walk * 10) % 2;
    const pedal = w.walk > 0 ? ((spin + 1) as 1 | 2) : 0;
    return (
      <g
        className="cw-tap"
        onClick={(e) => {
          e.stopPropagation();
          tapWalker(w);
        }}
      >
        <ellipse cx={w.x} cy={w.y} rx={9} ry={1.3} fill="#000" opacity={0.16} />
        {[w.x - 5, w.x + 5].map((wx) => (
          <g key={wx} fill={INK}>
            <rect x={wx - 2} y={w.y - 5} width={4} height={1} />
            <rect x={wx - 3} y={w.y - 4} width={1} height={3} />
            <rect x={wx + 2} y={w.y - 4} width={1} height={3} />
            <rect x={wx - 2} y={w.y - 1} width={4} height={1} />
            {spin ? <rect x={wx - 0.5} y={w.y - 4} width={1} height={3} fill="#8a8f88" /> : <rect x={wx - 2} y={w.y - 3} width={4} height={1} fill="#8a8f88" />}
          </g>
        ))}
        <rect x={w.x - 5} y={w.y - 4} width={10} height={1} fill="#2f5fb3" />
        <rect x={w.x - 1} y={w.y - 7} width={1} height={4} fill="#2f5fb3" />
        <rect x={w.x + 4} y={w.y - 8} width={1} height={4} fill={INK} />
        <rect x={w.x + 3} y={w.y - 8} width={3} height={1} fill={INK} />
        <Character x={w.x} y={w.y - 4} config={w.config} frame={pedal} />
      </g>
    );
  };

  const entities: { key: string; y: number; node: ReactNode }[] = [
    ...BEDS.map((b) => ({ key: `b${b.x}`, y: GROUND + 22, node: <Bed x={b.x} w={b.w} sc={sc} onTap={tapBed} /> })),
    ...PALMS.map((p) => ({ key: `p${p.x}`, y: GROUND + 16, node: <Palm x={p.x} flip={p.flip} shaking={shaking === `p${p.x}`} onTap={tapTree} /> })),
    ...sc.lamps.map((l) => ({ key: `l${l.x}`, y: l.y, node: <Lamp x={l.x} y={l.y} /> })),
    { key: 'bench1', y: GROUND + 18, node: <Bench x={4} y={GROUND + 18} /> },
    { key: 'bench2', y: GROUND + 18, node: <Bench x={300} y={GROUND + 18} /> },
    { key: 'cart', y: CART.y, node: <Cart onTap={tapCart} /> },
    ...L.walkers.map((w) => ({
      key: `w${w.id}`,
      y: w.y,
      node: w.bike ? (
        bikeNode(w)
      ) : (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapWalker(w);
          }}
        >
          <Character x={w.x} y={w.y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
        </g>
      ),
    })),
    ...L.pigeons.map((p) => ({ key: `g${p.id}`, y: p.mode === 'fly' ? 999 : p.y, node: pigeonNode(p) })),
  ].sort((a, b) => a.y - b.y);

  const pct = (x: number, y: number) => ({ left: `${((x - fx) / vw) * 100}%`, top: `${((y - fy) / vh) * 100}%` });
  const sky = SKY[time];
  const tapCanopy0 = useCallback(() => tapCanopy(0), [tapCanopy]);
  const tapCanopy1 = useCallback(() => tapCanopy(1), [tapCanopy]);
  const ringing = L.bell > t;
  const swing = ringing ? Math.round(Math.sin(t * 16)) : 0;
  const done = found.length >= DISCOVERIES.length;

  return (
    <div
      className="ps"
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => Object.assign(look.current, { tx: 0, ty: 0 })}
    >
      <svg ref={svg} className="visit-art" viewBox={`${fx.toFixed(2)} ${fy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <clipPath id="ps-pool">
            <rect x={POOL.x + 2} y={GROUND + 6} width={POOL.w - 4} height={14} />
          </clipPath>
          {/* Névoa: deixa as serras mais longe mais claras e azuladas (perspectiva do ar). */}
          <linearGradient id="ps-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[1]} stopOpacity="0" />
            <stop offset="1" stopColor={sky[1]} stopOpacity={night ? 0.35 : 0.6} />
          </linearGradient>
        </defs>
        <g transform={layer(DEPTH.sky)}>
          <Sky time={time} sc={sc} />
        </g>
        <g transform={layer(DEPTH.clouds)}>
        {L.clouds.map((cl, i) => (
          <g key={i} fill={night ? '#3a5068' : time === 'dusk' ? '#ffe3d6' : '#ffffff'} opacity={night ? 0.55 : 0.92}>
            <rect x={cl.x} y={cl.y} width={cl.w} height={5} />
            <rect x={cl.x + cl.w * 0.2} y={cl.y - 4} width={cl.w * 0.45} height={4} />
            <rect x={cl.x + cl.w * 0.55} y={cl.y - 2} width={cl.w * 0.3} height={2} />
            <rect x={cl.x + 2} y={cl.y + 5} width={cl.w - 4} height={1} fill={night ? '#2c3e52' : '#d6e8f0'} />
          </g>
        ))}
        {L.flocks.map((f) =>
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
        <g transform={layer(DEPTH.far)}>
          <FarHills time={time} sc={sc} />
        </g>
        <rect x={-EDGE - 300} y={GROUND - 62} width={W + 2 * EDGE + 600} height={62} fill="url(#ps-haze)" />
        <g transform={layer(DEPTH.near)}>
          <NearHills time={time} sc={sc} />
        </g>
        <rect x={-EDGE - 300} y={GROUND - 40} width={W + 2 * EDGE + 600} height={40} fill="url(#ps-haze)" opacity={0.45} />
        <g transform={layer(DEPTH.houses)}>
          <Houses night={night} />
          {sc.trees.map((tr) => (
            <BackTree key={tr.x} x={tr.x} dur={tr.dur} delay={tr.delay} shaking={shaking === `t${tr.x}`} onTap={tapTree} />
          ))}
        </g>
        <Pavement sc={sc} />

        <Church art={art} night={night} onTap={tapChurch} />
        {ringing && (
          <g pointerEvents="none">
            <rect x={BELL.x - 2} y={BELL.y - 1} width={4} height={5} fill="#2a3a44" />
            <rect x={BELL.x - 1 + swing} y={BELL.y + 1} width={2} height={2} fill="#f2b705" />
            <rect x={BELL.x - 1 + swing} y={BELL.y + 3} width={2} height={1} fill="#c99400" />
          </g>
        )}

        <Pool time={time} />
        <g clipPath="url(#ps-pool)" pointerEvents="none">
          {L.koi
            .filter((k) => t >= k.hidden)
            .map((k, i) => (
              <g key={i} opacity={0.8}>
                <rect x={k.x - 2} y={k.y} width={4} height={2} fill={k.c} />
                <rect x={k.face > 0 ? k.x - 4 : k.x + 2} y={k.y + (Math.sin(t * 9 + i) > 0 ? 0 : 1)} width={2} height={1} fill={shade(k.c, -0.15)} />
                <rect x={k.x + (k.face > 0 ? 1 : -2)} y={k.y} width={1} height={1} fill={i === 1 ? '#f07a2a' : '#ffffff'} />
              </g>
            ))}
        </g>
        <Reflection art={art} night={night} />
        <g clipPath="url(#ps-pool)" pointerEvents="none" fill="#bfeaf2" opacity={0.7}>
          {[0, 1, 2, 3, 4].map((i) => {
            const span = WATER.x1 - WATER.x0 - 8;
            return <rect key={i} x={WATER.x0 + ((t * (2 + i * 0.6) + i * 29) % span)} y={GROUND + 8 + i * 2.5} width={6 + (i % 3) * 2} height={1} />;
          })}
        </g>

        {entities.map((e) => (
          <g key={e.key}>{e.node}</g>
        ))}

        {/* Partículas */}
        <g pointerEvents="none">
          {L.particles.map((q) => {
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
              case 'corn':
                return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={Math.min(1, fade * 2)} />;
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
              case 'mote':
                return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={Math.sin((q.age / q.life) * Math.PI) * 0.85} />;
              case 'drop':
                return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} />;
              default:
                return <rect key={q.id} x={q.x} y={q.y} width={1} height={1} fill={q.c} opacity={Math.sin((q.age / q.life) * Math.PI)} />;
            }
          })}
        </g>

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

        {/* Galhos de ipê em primeiro plano */}
        <g transform={`translate(${canopy.lx.toFixed(2)} ${canopy.top.toFixed(2)}) scale(${ck})`}>
          <Canopy px={sc.canopies[0]} shaking={shaking === 'c0'} onTap={tapCanopy0} />
        </g>
        <g transform={`translate(${canopy.rx.toFixed(2)} ${canopy.top.toFixed(2)}) scale(${-ck} ${ck})`}>
          <Canopy px={sc.canopies[1]} shaking={shaking === 'c1'} onTap={tapCanopy1} />
        </g>

        {time === 'dusk' && <rect x={-EDGE - 300} y={-400} width={W + 2 * EDGE + 600} height={GROUND_END + 420} fill="#ff8a4a" opacity={0.08} pointerEvents="none" />}
        {night && <rect x={-EDGE - 300} y={-400} width={W + 2 * EDGE + 600} height={GROUND_END + 420} fill="#0d1b2e" opacity={0.28} pointerEvents="none" />}
        {/* Luzes dos bairros nos morros, acesas por cima da noite */}
        {night && (
          <g transform={layer(DEPTH.near)} pointerEvents="none">
            {sc.town
              .filter((c) => c.lit)
              .map((c, i) => (
                <g key={i}>
                  <circle cx={c.x + 1.5} cy={c.y - c.h + 0.5} r={2.2} fill="#ffd76a" opacity={0.18} />
                  <rect x={c.x + 1} y={c.y - c.h} width={1} height={1} fill="#ffe08a" />
                </g>
              ))}
          </g>
        )}
        {/* Luzes por cima da noite: postes, porta da igreja e vagalumes */}
        {night && (
          <g>
            <g pointerEvents="none">
              {sc.lamps.map((l) => (
                <circle key={l.x} className="cw-glow" cx={l.x + 0.5} cy={l.y - 25} r={14} fill="url(#ps-glow)" style={{ animationDuration: `${l.dur}s` }} />
              ))}
              {sc.lamps.map((l) => (
                <ellipse key={`g${l.x}`} cx={l.x + 0.5} cy={l.y + 1} rx={11} ry={3} fill="#ffe9a8" opacity={0.16} />
              ))}
              <ellipse cx={CX} cy={GROUND + 1} rx={18} ry={3} fill="#ffe9a8" opacity={0.18} />
            </g>
            {L.glows.map((g) => {
              const a = Math.max(0, Math.sin(t * g.f + g.ph));
              return (
                <g
                  key={g.id}
                  className="cw-tap"
                  onClick={(e) => {
                    e.stopPropagation();
                    tapGlow(g);
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
        )}
      </svg>

      {/* Balões de fala */}
      {[...bubbles.current.entries()]
        .filter(([, b]) => b.until > t)
        .map(([k, b]) => (
          <div key={k} className="cw-bubble" style={pct(b.x, b.y)}>
            {b.text}
          </div>
        ))}
      {L.walkers
        .filter((w) => w.say && w.sayUntil > t)
        .map((w) => (
          <div key={w.id} className="cw-bubble" style={pct(w.x, w.y - (w.bike ? 21 : 17))}>
            {w.say}
          </div>
        ))}

      <button className="visit-dove" onClick={tapDove} aria-label="Pomba guia: pedir uma dica" title="Pedir uma dica">
        <GuideSprite size={64} flying />
        {dove.current.until > t && <span className="cw-bubble dove ps-dove-say">{dove.current.text}</span>}
      </button>

      <div className={`ps-found ${done ? 'done' : ''}`} aria-label={`Descobertas: ${found.length} de ${DISCOVERIES.length}`}>
        <span className="ps-found-count">
          {done ? '🏆' : '🔍'} {found.length}/{DISCOVERIES.length}
        </span>
        <span className="ps-found-list">
          {DISCOVERIES.map((d) => (
            <span key={d.key} className={`${found.includes(d.key) ? 'on' : ''} ${fresh === d.key ? 'new' : ''}`} title={found.includes(d.key) ? d.label : '???'}>
              {d.emoji}
            </span>
          ))}
        </span>
      </div>
      {toast.current.until > t && (
        <div key={toast.current.text} className={`ps-toast ${toast.current.big ? 'big' : ''}`} role="status">
          {toast.current.text}
        </div>
      )}
      {canDrag && !dragged.current && t > 2 && t < 14 && <div className="ps-drag">👈 Arraste para ver a praça toda 👉</div>}
    </div>
  );
});
