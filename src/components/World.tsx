import { memo, type ReactNode } from 'react';
import { fromAscii, seeded, shade, toRuns } from '../lib/pixel';
import type { AvatarConfig } from '../lib/types';
import { MAIN_PATH, PLACES, riverX, SPAWN, WORLD_H, WORLD_W, type Place } from '../lib/world';
import { AvatarSprite, SPRITE_H, SPRITE_W } from './Avatar';
import { hotelParts } from './Landmarks';
import { bridgeParts, chacaraParts, culturalParts, memorialParts, museumParts, painelParts, stationParts } from './MapLandmarks';
import { mestreParts } from './MestreHouses';
import { iconRuns } from './PixelIcon';
import { Pixels } from './Scene';

const INK = '#1b2b33';
const AVATAR_SCALE = 0.7;

type Part = [x: number, y: number, w: number, h: number, fill: string];

/** Corpo com contorno único em volta da silhueta, depois detalhes com contorno próprio. */
function Block({ body, details = [], under }: { body: Part[]; details?: Part[]; under?: ReactNode }) {
  return (
    <>
      {body.map(([x, y, w, h], i) => (
        <rect key={`o${i}`} x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
      ))}
      {body.map(([x, y, w, h, f], i) => (
        <rect key={`b${i}`} x={x} y={y} width={w} height={h} fill={f} />
      ))}
      {under}
      {details.map(([x, y, w, h, f], i) => (
        <g key={`d${i}`}>
          <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill={f} />
        </g>
      ))}
    </>
  );
}

function Sign({ x, y, icon }: { x: number; y: number; icon: string }) {
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={12} height={12} fill={INK} />
      <rect x={x} y={y} width={10} height={10} fill="#fdf6e3" />
      <g transform={`translate(${x + 1} ${y + 1}) scale(${8 / 12})`}>
        <Pixels runs={iconRuns(icon)} />
      </g>
    </g>
  );
}

function roofSteps(x0: number, top: number, w: number, roof: string, rows = 11): Part[] {
  const dark = shade(roof, -0.22);
  return Array.from({ length: rows }, (_, i) => [x0 - 3 + i, top - 1 - i, w + 6 - 2 * i, 1, i % 3 === 0 ? dark : roof] as Part);
}

/** Painel de azulejos da fachada da Igreja de Santa Rita (meia largura, espelhada). */
const TILE_HALF = [
  'BBBBBBBBBBBBBBBB',
  'Bl.l.l.l.l.l.l.l',
  'B.............bb',
  'B.....ll.....b..',
  'B..b...lll...b..',
  'B.bbb...llll.bbb',
  'B.b.b..llllllbbb',
  'B.bbb....llllbbb',
  'B..........lbbbb',
  'B.llll......bbbb',
  'Bllllllllllbbbbb',
  'Bl.l.l.l.l.l.l.l',
  'BBBBBBBBBBBBBBBB',
];
const tileRuns = toRuns(fromAscii(TILE_HALF.map((r) => r + [...r].reverse().join('')), { B: '#1d3f86', b: '#2f5fb3', l: '#8db6e8', '.': '#f4f8ff' }));

/** Igreja de Santa Rita (Cataguases): fachada curva com azulejos, torre pontuda branca, marquise ondulada e espelho d'água. */
function churchParts(x: number, y: number, night: boolean, yard: boolean): { body: Part[]; details: Part[]; sign: [number, number]; extra: ReactNode } {
  const wall = '#e6c77f';
  const wallDark = '#c9a75c';
  const white = '#f7f6ef';
  const x0 = x - 20;
  const sx = x - 4;
  const spireW = [10, 10, 8, 8, 6, 6, 4, 4, 2];
  const spire: Part[] = [[sx - 6, y - 38, 12, 6, white], ...spireW.map((w, i) => [sx - w / 2, y - 40 - 2 * i, w, 2, white] as Part)];
  return {
    body: [
      ...spire,
      [sx - 1, y - 63, 2, 7, white],
      [sx - 3, y - 61, 6, 2, white],
      [x + 18, y - 20, 16, 20, wall],
      [x + 14, y - 24, 22, 4, white],
      [x + 14, y - 25, 16, 1, white],
      [x0, y - 32, 40, 32, wall],
      [x0 + 2, y - 34, 36, 2, wall],
      [x0 + 6, y - 35, 28, 1, wall],
      [x0 - 3, y - 13, 58, 2, white],
    ],
    details: [
      [x0 + 4, y - 31, 32, 13, '#f4f8ff'],
      [x - 15, y - 10, 30, 10, night ? '#ffd76a' : '#3d5560'],
      [x + 20, y - 19, 12, 3, '#cfd8dc'],
    ],
    sign: [x + 22, y - 38],
    extra: (
      <g>
        {spire.slice(1).map(([px, py, w, h], i) => (
          <rect key={i} x={px + w / 2} y={py} width={w / 2} height={h} fill="#d9dcd6" />
        ))}
        <rect x={sx} y={y - 38} width={6} height={4} fill="#d9dcd6" />
        <rect x={sx - 2} y={y - 47} width={4} height={5} fill="#2a3a44" />
        <rect className="w-bell" x={sx - 1} y={y - 45} width={2} height={2} fill="#f2b705" />
        <g transform={`translate(${x0 + 4} ${y - 31})`}>
          <Pixels runs={tileRuns} />
        </g>
        <rect x={x0} y={y - 16} width={40} height={1} fill={wallDark} />
        <rect x={x + 18} y={y - 20} width={16} height={1} fill={wallDark} />
        {Array.from({ length: 5 }, (_, k) => (
          <rect key={`m${k}`} x={x - 15 + 6 * (k + 0.5)} y={y - 10} width={1} height={10} fill="#22303a" />
        ))}
        {Array.from({ length: 14 }, (_, k) => (
          <rect key={`s${k}`} x={x0 - 2 + 4 * k} y={y - 11} width={2} height={1} fill={white} />
        ))}
        <rect x={x0 - 2} y={y - 11} width={1} height={11} fill="#8a8f88" />
        <rect x={x + 33} y={y - 11} width={1} height={11} fill="#8a8f88" />
        {yard && (
          <g>
            {[x - 27, x + 9].map((px) => (
              <g key={px}>
                <rect x={px - 1} y={y + 3} width={20} height={7} fill="#d9d2bf" />
                <rect x={px} y={y + 4} width={18} height={5} fill="#12a3a0" />
                <rect className="river-shine" x={px + 3} y={y + 5} width={5} height={1} fill="#7fd8d4" />
              </g>
            ))}
            <rect x={x + 40} y={y - 14} width={2} height={14} fill="#8a5a2b" />
            <rect x={x + 35} y={y - 17} width={12} height={2} fill="#3aa655" />
            <rect x={x + 38} y={y - 19} width={6} height={2} fill="#1f7a4d" />
            <rect x={x + 34} y={y - 15} width={2} height={2} fill="#3aa655" />
            <rect x={x + 46} y={y - 15} width={2} height={2} fill="#3aa655" />
          </g>
        )}
      </g>
    ),
  };
}

/** Desenho de cada tipo de construção (porta em p.x, p.y). Retorna também as janelas para a iluminação noturna. */
export function buildingParts(p: Place, glass: string, yard = true): { body: Part[]; details: Part[]; sign: [number, number]; under?: ReactNode; extra?: ReactNode } {
  const { x, y } = p;
  const wood = '#7a4a25';
  switch (p.kind) {
    case 'church':
      return churchParts(x, y, glass === '#ffd76a', yard);
    case 'tower': {
      const x0 = x - 10;
      const top = y - 40;
      const roof = p.roof ?? '#1f7a4d';
      return {
        body: [
          [x0, top, 20, 40, '#cfd8d3'],
          [x0 - 2, top - 4, 24, 4, '#b8c4be'],
          ...Array.from({ length: 9 }, (_, i) => [x0 - 1 + i, top - 5 - i, 22 - 2 * i, 1, i % 3 === 0 ? shade(roof, -0.22) : roof] as Part),
          [x, top - 26, 1, 12, INK],
          [x + 1, top - 26, 7, 4, '#8cc63f'],
        ],
        details: [
          [x - 2, top + 5, 4, 6, glass],
          [x - 4, y - 12, 8, 12, wood],
          [x0 + 2, top + 30, 3, 2, '#b8c4be'],
          [x0 + 15, top + 20, 3, 2, '#b8c4be'],
        ],
        sign: [x - 5, top + 15],
      };
    }
    case 'board':
      return {
        body: [
          [x - 15, y - 20, 3, 20, '#8a5a2b'],
          [x + 12, y - 20, 3, 20, '#8a5a2b'],
          [x - 17, y - 28, 34, 3, '#8a5a2b'],
          [x - 16, y - 25, 32, 15, '#c58b4a'],
        ],
        details: [
          [x - 13, y - 23, 7, 9, '#fdf6e3'],
          [x - 3, y - 24, 7, 8, '#fff6d6'],
          [x + 7, y - 22, 6, 8, '#e2f6f5'],
        ],
        sign: [x - 5, y - 41],
      };
    case 'fountain': {
      const cy = y - 8;
      return {
        body: [
          [x - 12, cy - 2, 24, 6, '#b9b29c'],
          [x - 14, cy, 28, 3, '#d9d2bf'],
          [x - 2, cy - 14, 4, 12, '#cfd8d3'],
          [x - 6, cy - 15, 12, 2, '#b9b29c'],
        ],
        details: [[x - 10, cy - 1, 20, 2, '#12a3a0']],
        sign: [x - 5, cy - 29],
        extra: (
          <g className="spout" fill="#7fd8d4">
            <rect x={x - 1} y={cy - 19} width={2} height={4} />
            <rect x={x - 4} y={cy - 17} width={1} height={2} />
            <rect x={x + 3} y={cy - 17} width={1} height={2} />
          </g>
        ),
      };
    }
    case 'arena': {
      const x0 = x - 23;
      return {
        body: [
          [x0, y - 22, 46, 22, '#c9b38a'],
          [x0 - 2, y - 25, 50, 4, '#a8916a'],
          [x0 - 2, y - 28, 4, 3, '#a8916a'],
          [x - 2, y - 28, 4, 3, '#a8916a'],
          [x0 + 44, y - 28, 4, 3, '#a8916a'],
          [x0, y - 38, 1, 10, INK],
          [x0 + 46, y - 38, 1, 10, INK],
          [x0 + 1, y - 38, 6, 4, '#d64545'],
          [x0 + 47, y - 38, 6, 4, '#12a3a0'],
        ],
        details: [
          [x - 6, y - 13, 12, 13, '#4a3220'],
          [x0 + 5, y - 19, 5, 9, '#d64545'],
          [x0 + 36, y - 19, 5, 9, '#12a3a0'],
        ],
        sign: [x - 5, y - 41],
      };
    }
    case 'mestre':
      return mestreParts(p, glass);
    case 'bridge':
      return bridgeParts(p, glass === '#ffd76a');
    case 'museum':
      return museumParts(p, glass);
    case 'station':
      return stationParts(p, glass);
    case 'chacara':
      return chacaraParts(p, glass);
    case 'cultural':
      return culturalParts(p, glass);
    case 'memorial':
      return memorialParts(p, glass);
    case 'painel':
      return painelParts(p, glass);
    case 'hotel':
      return hotelParts(p, glass);
    case 'stage': {
      const x0 = x - 22;
      return {
        body: [
          [x0, y - 33, 44, 3, '#23384a'],
          [x0, y - 30, 2, 22, '#23384a'],
          [x0 + 42, y - 30, 2, 22, '#23384a'],
          [x0 + 2, y - 30, 40, 20, '#d64545'],
          [x0, y - 10, 44, 3, '#c58b4a'],
          [x0, y - 7, 44, 7, '#8a5a2b'],
        ],
        details: [
          [x - 8, y - 28, 16, 17, '#2a1a12'],
          [x0 + 5, y - 30, 2, 20, '#a83232'],
          [x0 + 37, y - 30, 2, 20, '#a83232'],
        ],
        sign: [x - 5, y - 46],
      };
    }
    default: {
      // house, post, hall
      const w = p.w ?? (p.kind === 'post' ? 28 : 40);
      const x0 = x - Math.round(w / 2);
      const wallH = p.kind === 'hall' ? 20 : 18;
      const top = y - wallH;
      const wall = p.wall ?? (p.kind === 'hall' ? '#fdf6e3' : '#efe2c6');
      const roof = p.roof ?? '#12a3a0';
      const details: Part[] = [[x - 4, y - 12, 8, 12, '#7a4a25']];
      if (p.kind === 'hall') {
        for (const cx of [x0 + 3, x0 + 9, x0 + w - 12, x0 + w - 6]) details.push([cx, top + 2, 3, wallH - 3, '#ffffff']);
      } else {
        details.push([x0 + 4, top + 4, 7, 5, glass], [x0 + w - 11, top + 4, 7, 5, glass]);
      }
      if (p.kind === 'post') details.push([x + 16, y - 10, 6, 5, '#d64545']);
      return {
        body: [[x0, top, w, wallH, wall], [x0, y - 2, w, 2, shade(wall, -0.2)], ...roofSteps(x0, top, w, roof, Math.min(11, Math.floor(w / 4)))],
        details,
        sign: [x - 5, top - 9],
        extra: p.kind === 'post' ? <rect x={x + 18} y={y - 5} width={2} height={5} fill={INK} /> : undefined,
      };
    }
  }
}

/** Construção solta (sem placa nem clique), para cenas ampliadas fora do mapa. */
export function PlaceArt({ p, night = false }: { p: Place; night?: boolean }) {
  const parts = buildingParts(p, night ? '#ffd76a' : '#bfe9f2', false);
  return (
    <g>
      <Block body={parts.body} details={parts.details} under={parts.under} />
      {parts.extra}
    </g>
  );
}

export const Building = memo(function Building({ p, night, onEnter, highlight, noSign }: { p: Place; night: boolean; onEnter: (p: Place) => void; highlight: boolean; noSign?: boolean }) {
  const parts = buildingParts(p, night ? '#ffd76a' : '#bfe9f2');
  return (
    <g
      className={`w-building ${highlight ? 'near' : ''} ${p.soon ? 'soon' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onEnter(p);
      }}
      role="link"
      aria-label={`${p.label}: ${p.hint}`}
    >
      <Block body={parts.body} details={parts.details} under={parts.under} />
      {parts.extra}
      {!noSign && <Sign x={parts.sign[0]} y={parts.sign[1]} icon={p.soon ? 'lock' : p.icon} />}
    </g>
  );
});

const NPC_SPOTS = [
  [118, 148],
  [184, 150],
  [112, 104],
  [190, 108],
];

const WIDE: Place['kind'][] = ['house', 'hall', 'arena', 'stage', 'mestre', 'museum', 'station', 'chacara', 'cultural', 'memorial', 'painel', 'hotel'];

/** Árvores espalhadas sem invadir caminhos, rio e construções. */
/** Medidas do terreno usadas para espalhar as árvores (a base do Multiverso ou o mapa do Territórios). */
export interface TreeGeo {
  w: number;
  h: number;
  path: { y: number; h: number };
  riverX: (y: number) => number;
  spawn: { x: number; y: number };
  plaza: { x: number; y: number };
  npcSpots: number[][];
  /** Quantas árvores no máximo e o espaço entre as da fileira do fundo. */
  trees?: number;
  rowStep?: number;
}

const BASE_GEO: TreeGeo = { w: WORLD_W, h: WORLD_H, path: MAIN_PATH, riverX, spawn: SPAWN, plaza: { x: 150, y: 132 }, npcSpots: NPC_SPOTS };

export function makeTrees(places: Place[] = PLACES, seed = 1234, geo: TreeGeo = BASE_GEO) {
  const { w: WORLD_W, h: WORLD_H, path: MAIN_PATH, riverX, spawn: SPAWN, plaza, npcSpots: NPC_SPOTS, trees: max = 46, rowStep = 13 } = geo;
  const rand = seeded(seed);
  const trees: { x: number; y: number }[] = [];
  const blocked = (x: number, y: number) =>
    y < 54 ||
    x < 6 ||
    x > WORLD_W - 6 ||
    Math.abs(y - (MAIN_PATH.y + 6)) < 12 ||
    Math.abs(x - riverX(y)) < 14 ||
    Math.hypot((x - plaza.x) / 30, (y - plaza.y) / 18) < 1 ||
    Math.hypot(x - SPAWN.x, y - SPAWN.y) < 18 ||
    NPC_SPOTS.some(([nx, ny]) => Math.abs(x - nx) < 14 && Math.abs(y - ny) < 16) ||
    places.some((p) =>
      p.kind === 'church'
        ? x > p.x - 34 && x < p.x + 54 && y > p.y - 70 && y < p.y + 20
        : Math.abs(x - p.x) < (p.kind === 'hotel' ? 46 : p.kind === 'museum' || p.kind === 'station' ? 40 : WIDE.includes(p.kind) ? 34 : 30) && y > p.y - (p.kind === 'hotel' ? 66 : 52) && y < p.y + (p.kind === 'mestre' || p.kind === 'station' ? 30 : p.kind === 'museum' ? 26 : 16),
    ) ||
    places.some((p) => Math.abs(x - p.x) < 10 && y > Math.min(p.y, MAIN_PATH.y) - 4 && y < Math.max(p.y, MAIN_PATH.y) + 14) ||
    trees.some((t) => Math.abs(t.x - x) < 11 && Math.abs(t.y - y) < 8);
  for (let x = 4; x < WORLD_W; x += rowStep) if (!blocked(x, 56)) trees.push({ x, y: 56 + Math.round(rand() * 4) });
  for (let i = 0; i < 400 && trees.length < max; i++) {
    const x = Math.round(rand() * WORLD_W);
    const y = 56 + Math.round(rand() * (WORLD_H - 56));
    if (!blocked(x, y)) trees.push({ x, y });
  }
  return trees;
}

export function Character({ x, y, config, frame, name, me }: { x: number; y: number; config: AvatarConfig | null; frame: 0 | 1 | 2; name?: string; me?: boolean }) {
  const w = SPRITE_W * AVATAR_SCALE;
  const h = SPRITE_H * AVATAR_SCALE;
  return (
    <g className={`w-char ${me ? 'me' : 'npc'}`} transform={`translate(${(x - w / 2).toFixed(2)} ${(y - h).toFixed(2)})`}>
      <ellipse cx={w / 2} cy={h - 0.5} rx={5} ry={1.6} fill="#000" opacity={0.18} />
      <g className={frame === 0 ? 'w-idle' : undefined} transform={`scale(${AVATAR_SCALE})`}>
        <AvatarSprite config={config} frame={frame} />
      </g>
      {name && (
        <text x={w / 2} y={-2} className="w-name" textAnchor="middle">
          {name}
        </text>
      )}
    </g>
  );
}
