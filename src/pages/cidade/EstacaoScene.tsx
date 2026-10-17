import { memo, useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { seeded } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import {
  BigTree,
  clamp,
  Clouds,
  Critters,
  DEPTH,
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
 * Visita à Estação Cataguases, vista da ponta da plataforma (como nas fotos):
 * - a fachada de tijolinho fica de frente, com o frontão, os dois "olhos" redondos, a placa
 *   CATAGUAZES (com Z, o nome antigo) e os três arcos; o prédio comprido some no fundo, com a
 *   cobertura da plataforma nas mãos-francesas de ferro;
 * - perspectiva de um ponto: tudo que está mais longe fica menor e vai para o ponto de fuga (VP),
 *   onde os trilhos se encontram. O trem azul e laranja chega lá do fundo crescendo, para,
 *   apita e sai passando pela frente de quem olha.
 * Coordenadas do "mundo": x para a direita, y para baixo e z para o fundo; z = 0 é o plano da
 * fachada, onde 1 unidade do mundo é 1 pixel do desenho.
 */

const VP = { x: 340, y: 40 };
const D = 100;
const ZMIN = -78;
const ZFAR = 2000;
const GROUND = 90;
const RAIL_Y = 91;
const WALL_X = 112;
const LEN = 250;
const CAN = { x: 140, y: 58 };
const PLAT_X = 150;
const STREET_X = 198;
const RAILS = [161, 171];
const STOP = 26;
const TRAIN = { x0: 156, x1: 176, top: 62, floor: 86, wheel: 91 };
const CARS = [
  { len: 44, loco: true },
  { len: 48, loco: false },
  { len: 48, loco: false },
  { len: 48, loco: false },
];
const TRAIN_LEN = CARS.reduce((n, c) => n + c.len + 3, 0);

const BRICK = '#c0573e';
const BRICK_DK = '#9a4230';
const STONE = '#d9c9a3';
const STONE_DK = '#b5a37c';
const ROOF = '#8a5a3a';
const ROOF_DK = '#6b4423';
const WOOD = '#4a2e1a';

/** Escala de um ponto a `z` de profundidade (1 na fachada, menor lá no fundo). */
const sc = (z: number) => D / (D + Math.max(z, ZMIN));
/** Ponto do mundo → ponto do desenho. */
function P(x: number, y: number, z: number): [number, number] {
  const s = sc(z);
  return [VP.x + (x - VP.x) * s, VP.y + (y - VP.y) * s];
}
const pts = (list: [number, number, number][]) =>
  list
    .map((p) => P(...p))
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ');
/** Retângulo deitado no chão (y fixo), de x0 a x1 e de z0 a z1. */
const floorQuad = (x0: number, x1: number, y: number, z0: number, z1: number) => pts([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);
/** Retângulo em pé numa parede de x fixo (de frente para a direita), de y0 a y1 e de z0 a z1. */
const sideQuad = (x: number, y0: number, y1: number, z0: number, z1: number) => pts([[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]]);

const DISCOVERIES: Discovery[] = [
  { key: 'trem', emoji: '🚂', label: 'O trem', tip: 'Toque no trem! 🚂' },
  { key: 'placa', emoji: '🚉', label: 'A placa da estação', tip: 'Toque na placa CATAGUAZES! 🚉' },
  { key: 'sino', emoji: '🔔', label: 'O sino da estação', tip: 'Tem um sino na parede da estação. Toque nele! 🔔' },
  { key: 'relogio', emoji: '🕰️', label: 'O relógio', tip: 'Ache o relógio da plataforma! 🕰️' },
  { key: 'trilho', emoji: '🛤️', label: 'Os trilhos', tip: 'Toque nos trilhos do trem! 🛤️' },
  { key: 'vasos', emoji: '🪴', label: 'Os vasos de planta', tip: 'Toque nos vasos na frente da estação! 🪴' },
  { key: 'gente', emoji: '👋', label: 'Quem espera o trem', tip: 'Dê um oi pra quem está na plataforma! 👋' },
  { key: 'arvore', emoji: '🌳', label: 'A árvore da praça', tip: 'Toque na árvore grande! 🌳' },
];

const SIGN_LINES = ['Cataguazes, com Z! 🚉', 'O jeito antigo de escrever! ✍️', 'Estação de tijolinho! 🧱'];
const LINES_DAY = ['Oi! 👋', 'Cadê o trem? 🚂', 'Vou viajar! 🧳', 'Que estação bonita! 🧱', 'Piuí! 🚂', 'Bom dia! ☀️'];
const LINES_NIGHT = ['Boa noite! 🌙', 'O último trem! 🚂', 'Que luzinhas bonitas! 💡'];

/* ---- Cenário fixo ---- */

/** Lojinhas coloridas do outro lado da praça (à esquerda, atrás da estação). */
const SHOPS = [
  { x0: -430, x1: -340, top: 50, c: '#7fb8d6' },
  { x0: -340, x1: -260, top: 46, c: '#f2b705' },
  { x0: -260, x1: -180, top: 52, c: '#8cc63f' },
  { x0: -180, x1: -100, top: 48, c: '#ec6a8c' },
  { x0: -100, x1: -20, top: 50, c: '#f4ead8' },
];
const SHOP_Z = 70;

const Shops = memo(function Shops({ night }: { night: boolean }) {
  return (
    <g>
      {SHOPS.map((h, i) => {
        const [x0, y0] = P(h.x0, h.top, SHOP_Z);
        const [x1, y1] = P(h.x1, GROUND, SHOP_Z);
        const w = x1 - x0;
        const hh = y1 - y0;
        return (
          <g key={i}>
            <rect x={x0} y={y0} width={w} height={hh} fill={night ? '#4a5560' : h.c} />
            <rect x={x0 - 1} y={y0 - 2} width={w + 2} height={2} fill={night ? '#3a3036' : '#a84a32'} />
            {[0.2, 0.6].map((f) => (
              <rect key={f} x={x0 + w * f} y={y0 + hh * 0.2} width={w * 0.18} height={hh * 0.25} fill={night ? '#ffd76a' : '#3d5560'} />
            ))}
            <rect x={x0 + w * 0.1} y={y0 + hh * 0.62} width={w * 0.8} height={hh * 0.38} fill={night ? '#3a3f42' : '#5d646a'} />
            <rect x={x0 + w * 0.1} y={y0 + hh * 0.58} width={w * 0.8} height={hh * 0.06} fill="#d64545" />
          </g>
        );
      })}
    </g>
  );
});

/** Rua de asfalto do lado dos trilhos: meio-fio, faixa do meio, remendos, rachaduras, bueiro e a calçada do outro lado. */
const ROAD = { x0: STREET_X + 4, x1: 300, mid: 251 };
const Street = memo(function Street({ night }: { night: boolean }) {
  const d = useMemo(() => {
    const rand = seeded(73);
    const grain = Array.from({ length: 420 }, () => {
      const z = ZMIN + 2 + rand() ** 1.6 * 500;
      const x = ROAD.x0 + rand() * (ROAD.x1 - ROAD.x0);
      const [a, b] = P(x, RAIL_Y, z);
      return { a, b, s: sc(z), c: rand() < 0.5 ? '#7e858a' : '#4d5358' };
    });
    const dashes = Array.from({ length: 40 }, (_, k) => ZMIN + k * 22).map((z) => floorQuad(ROAD.mid - 1, ROAD.mid + 1, RAIL_Y, z, z + 11));
    const patches = Array.from({ length: 7 }, () => {
      const z = rand() * 220 - 40;
      const x = ROAD.x0 + 6 + rand() * 70;
      return floorQuad(x, x + 8 + rand() * 12, RAIL_Y, z, z + 6 + rand() * 14);
    });
    const cracks = Array.from({ length: 10 }, () => {
      const z = rand() * 260 - 50;
      const x = ROAD.x0 + 4 + rand() * 90;
      return pts([[x, RAIL_Y, z], [x + 3, RAIL_Y, z + 4], [x + 1, RAIL_Y, z + 9], [x + 5, RAIL_Y, z + 13]]);
    });
    return { grain, dashes, patches, cracks };
  }, []);
  const asphalt = night ? '#363c41' : '#5d646a';
  const [ma, mb] = P(ROAD.x0 + 14, RAIL_Y, -20);
  const ms = sc(-20);
  return (
    <g>
      <polygon points={floorQuad(STREET_X, 900, RAIL_Y, ZMIN, ZFAR)} fill={asphalt} />
      {d.patches.map((q, i) => (
        <polygon key={`p${i}`} points={q} fill={night ? '#2e3438' : '#535a60'} />
      ))}
      {d.grain.map((g, i) => (
        <rect key={i} x={g.a} y={g.b} width={Math.max(0.7, g.s * 1.6)} height={Math.max(0.5, g.s * 0.8)} fill={g.c} opacity={0.7} />
      ))}
      {d.cracks.map((c, i) => (
        <polyline key={`k${i}`} points={c} fill="none" stroke="#3f454a" strokeWidth={0.5} />
      ))}
      {d.dashes.map((q, i) => (
        <polygon key={`d${i}`} points={q} fill={night ? '#c9b46a' : '#f2d36b'} />
      ))}
      {/* Faixas brancas das beiradas, o meio-fio do lado dos trilhos e a calçada do outro lado */}
      <polygon points={floorQuad(ROAD.x0 + 1, ROAD.x0 + 2, RAIL_Y, ZMIN, ZFAR)} fill="#e9e2d0" opacity={0.8} />
      <polygon points={floorQuad(ROAD.x1 - 2, ROAD.x1 - 1, RAIL_Y, ZMIN, ZFAR)} fill="#e9e2d0" opacity={0.8} />
      <polygon points={floorQuad(STREET_X, ROAD.x0, RAIL_Y - 1, ZMIN, ZFAR)} fill="#c9c2ae" />
      <polygon points={sideQuad(ROAD.x0, RAIL_Y - 1, RAIL_Y, ZMIN, ZFAR)} fill="#8d969c" />
      <polygon points={floorQuad(ROAD.x1, 900, RAIL_Y - 1.5, ZMIN, ZFAR)} fill={night ? '#6b6556' : '#cfc6b0'} />
      <polygon points={sideQuad(ROAD.x1, RAIL_Y - 1.5, RAIL_Y, ZMIN, ZFAR)} fill="#b5ad9c" />
      {/* Bueiro */}
      <ellipse cx={ma} cy={mb} rx={5 * ms} ry={1.6 * ms} fill="#2e3438" />
      <ellipse cx={ma} cy={mb} rx={4 * ms} ry={1.1 * ms} fill="#4d5358" />
      {[-2, 0, 2].map((k) => (
        <rect key={k} x={ma + k * ms - 0.3} y={mb - 0.8 * ms} width={0.6} height={1.6 * ms} fill="#2e3438" />
      ))}
    </g>
  );
});

/** Chão: praça de paralelepípedo, plataforma, brita com dormentes e trilhos, e a rua. */
const Ground = memo(function Ground({ night }: { night: boolean }) {
  const dots = useMemo(() => {
    const rand = seeded(17);
    return Array.from({ length: 220 }, () => {
      const z = -70 + rand() * 300;
      const x = -300 + rand() * 410;
      const [a, b] = P(x, GROUND, z);
      return { a, b, s: sc(z), c: rand() > 0.5 ? '#a39577' : '#cfc3a2' };
    }).filter((d) => d.b > VP.y + 1);
  }, []);
  const sleepers = useMemo(() => Array.from({ length: 96 }, (_, k) => ZMIN + k * 5).map((z) => floorQuad(157, 175, RAIL_Y, z, z + 2)), []);
  return (
    <g>
      <rect x={FULL.x} y={VP.y} width={FULL.w} height={GROUND_END - VP.y} fill={night ? '#6b6556' : '#b9ab8e'} />
      {dots.map((d, i) => (
        <rect key={i} x={d.a} y={d.b} width={Math.max(1, d.s * 2)} height={Math.max(1, d.s)} fill={d.c} opacity={0.8} />
      ))}
      <Street night={night} />
      <polygon points={floorQuad(PLAT_X, STREET_X, RAIL_Y, ZMIN, ZFAR)} fill={night ? '#5a5244' : '#8d826a'} />
      {sleepers.map((q, i) => (
        <polygon key={i} points={q} fill="#6b4423" />
      ))}
      {RAILS.map((r) => (
        <polygon key={r} points={floorQuad(r, r + 1.4, RAIL_Y - 0.6, ZMIN, ZFAR)} fill="#c9d0d3" />
      ))}
      <polygon points={floorQuad(WALL_X, PLAT_X, GROUND, ZMIN, ZFAR)} fill={night ? '#8a8270' : '#cfc6b0'} />
      <polygon points={floorQuad(PLAT_X - 4, PLAT_X - 2.5, GROUND, ZMIN, ZFAR)} fill="#f2b705" />
      <polygon points={sideQuad(PLAT_X, GROUND, RAIL_Y, ZMIN, ZFAR)} fill="#9d977f" />
    </g>
  );
});

/** Ponto do telhado: `f` de 0 (cumeeira) a 1 (beiral), na profundidade `z`. */
const roofAt = (f: number, z: number): [number, number, number] => [71 + 45 * f, 24 + 30 * f, z];
/** Ponto da cobertura da plataforma: `g` de 0 (parede) a 1 (beirada). */
const canopyAt = (g: number, z: number): [number, number, number] => [WALL_X + (CAN.x - WALL_X) * g, 54 + (CAN.y - 54) * g, z];

/**
 * Telhas do telhado e da cobertura (gerado uma vez): canais de telha descendo da cumeeira até o
 * beiral, fileiras atravessadas, algumas telhas mais claras ou mais escuras, a cumeeira e o beiral.
 */
function roofDetail() {
  const rand = seeded(61);
  const main: ReactNode[] = [];
  const canopy: ReactNode[] = [];
  for (let z = -3, k = 0; z < LEN; z += 3.2, k++) {
    main.push(<polygon key={`c${k}`} points={pts([roofAt(0, z), roofAt(0, z + 1.3), roofAt(1, z + 1.3), roofAt(1, z)])} fill={ROOF_DK} opacity={0.55} />);
    main.push(<polygon key={`l${k}`} points={pts([roofAt(0, z + 1.6), roofAt(0, z + 2.2), roofAt(1, z + 2.2), roofAt(1, z + 1.6)])} fill="#a8724c" opacity={0.5} />);
    if (z > 0) canopy.push(<polygon key={`k${k}`} points={pts([canopyAt(0, z), canopyAt(0, z + 1.3), canopyAt(1, z + 1.3), canopyAt(1, z)])} fill={ROOF_DK} opacity={0.6} />);
  }
  // Fileiras de telha (cada uma com um brilho logo abaixo)
  for (let i = 1; i < 9; i++) {
    const f = i / 9;
    main.push(<polyline key={`r${i}`} points={pts([roofAt(f, -3), roofAt(f, LEN)])} stroke="#5a3a22" strokeWidth={0.7} fill="none" />);
    main.push(<polyline key={`h${i}`} points={pts([roofAt(f + 0.015, -3), roofAt(f + 0.015, LEN)])} stroke="#b88660" strokeWidth={0.4} fill="none" opacity={0.7} />);
  }
  // Telhas trocadas: umas mais novas (claras), outras velhas e com limo (escuras)
  for (let i = 0; i < 70; i++) {
    const f = Math.floor(rand() * 9) / 9;
    const z = -3 + Math.floor(rand() * 78) * 3.2;
    const c = rand() < 0.5 ? '#c08458' : rand() < 0.5 ? '#5e3c24' : '#6b6a3a';
    main.push(<polygon key={`t${i}`} points={pts([roofAt(f + 0.01, z), roofAt(f + 0.01, z + 3), roofAt(f + 0.1, z + 3), roofAt(f + 0.1, z)])} fill={c} opacity={0.75} />);
  }
  // Cumeeira (as telhas de cima) e o beiral de madeira
  main.push(<polyline key="cume" points={pts([[71, 23, -3], [71, 23, LEN]])} stroke="#5a3a22" strokeWidth={2.2} fill="none" />);
  main.push(<polyline key="cume2" points={pts([[71, 22.6, -3], [71, 22.6, LEN]])} stroke="#b07a52" strokeWidth={0.8} fill="none" />);
  for (let z = 0; z < LEN; z += 8) {
    const [a, b] = P(71, 22.5, z);
    main.push(<rect key={`cc${z}`} x={a - 0.4} y={b - 0.6} width={0.8} height={1.2} fill="#3a2414" opacity={0.7} />);
  }
  main.push(<polygon key="beiral" points={sideQuad(116.5, 54, 55.6, -3, LEN)} fill={WOOD} />);
  return { main, canopy };
}

/** Telhado, parede comprida com as portas e janelas em arco, e a cobertura da plataforma. */
const Building = memo(function Building({ night }: { night: boolean }) {
  const glass = night ? '#ffd76a' : '#2a1e16';
  const openings: ReactNode[] = [];
  for (let i = 0, z = 10; z + 12 < LEN - 6; i++, z += 24) {
    const door = i % 3 === 1;
    const top = 62;
    const bot = door ? GROUND : 80;
    openings.push(
      <g key={z}>
        <polygon points={sideQuad(WALL_X, top - 2, bot, z - 1.5, z + 13.5)} fill={STONE} />
        <polygon points={sideQuad(WALL_X, top, bot, z, z + 12)} fill={door ? '#2a1e16' : glass} />
        <polygon points={sideQuad(WALL_X, top, top + 4, z, z + 12)} fill={night ? '#ffe9a0' : '#5a4030'} />
      </g>,
    );
  }
  const brackets: ReactNode[] = [];
  for (let z = 8; z < LEN; z += 30) {
    const arc: [number, number, number][] = [
      [WALL_X, 70, z],
      [116, 64, z],
      [122, 61, z],
      [130, 59.6, z],
      [CAN.x - 2, CAN.y + 0.5, z],
    ];
    brackets.push(<polyline key={z} points={pts(arc)} fill="none" stroke="#3a3f42" strokeWidth={Math.max(0.6, sc(z) * 1.1)} />);
  }
  const roof = roofDetail();
  return (
    <g>
      {/* Sombra da estação na plataforma */}
      <polygon points={floorQuad(WALL_X, WALL_X + 12, GROUND, 0, LEN)} fill="#000" opacity={0.12} />
      {/* Telhado */}
      <polygon points={pts([[71, 23, -3], [71, 23, LEN], [117, 55, LEN], [117, 55, -3]])} fill={INK} />
      <polygon points={pts([[71, 24, -3], [71, 24, LEN], [116, 54, LEN], [116, 54, -3]])} fill={ROOF} />
      {roof.main}
      {/* Parede comprida */}
      <polygon points={sideQuad(WALL_X, 52, GROUND, 0, LEN)} fill="url(#es-brick)" />
      <polygon points={sideQuad(WALL_X, 82, GROUND, 0, LEN)} fill={STONE} />
      <polygon points={sideQuad(WALL_X, 85.5, 86, 0, LEN)} fill={STONE_DK} />
      {openings}
      <polygon points={sideQuad(WALL_X, 52, GROUND, LEN - 1, LEN)} fill={BRICK_DK} />
      {/* Cobertura da plataforma, com a beirada de madeira e as mãos-francesas */}
      {brackets}
      <polygon points={pts([[WALL_X, 54, 0], [WALL_X, 54, LEN], [CAN.x, CAN.y, LEN], [CAN.x, CAN.y, 0]])} fill={ROOF_DK} />
      <polygon points={pts([[WALL_X + 6, 55, 0], [WALL_X + 6, 55, LEN], [CAN.x - 4, CAN.y - 0.5, LEN], [CAN.x - 4, CAN.y - 0.5, 0]])} fill={ROOF} opacity={0.7} />
      {roof.canopy}
      <polygon points={sideQuad(CAN.x, CAN.y, CAN.y + 2, 0, LEN)} fill={WOOD} />
    </g>
  );
});

/** Arco de pedra com bandeira em leque (as portas e janelas da fachada). */
function Arch({ cx, bottom, door, night }: { cx: number; bottom: number; door: boolean; night: boolean }) {
  const top = 62;
  const rays = [-60, -30, 0, 30, 60].map((a) => {
    const r = (a * Math.PI) / 180;
    return `M${cx} ${top}L${(cx + Math.sin(r) * 5).toFixed(1)} ${(top - Math.cos(r) * 5).toFixed(1)}`;
  });
  return (
    <g>
      <path d={`M${cx - 8} ${bottom}V${top}A8 8 0 0 1 ${cx + 8} ${top}V${bottom}Z`} fill={INK} />
      <path d={`M${cx - 7} ${bottom}V${top}A7 7 0 0 1 ${cx + 7} ${top}V${bottom}Z`} fill={STONE} />
      <path d={`M${cx - 5} ${bottom}V${top}A5 5 0 0 1 ${cx + 5} ${top}V${bottom}Z`} fill={door ? '#2a1e16' : night ? '#ffd76a' : '#3d2a1e'} />
      <path d={`M${cx - 5} ${top}A5 5 0 0 1 ${cx + 5} ${top}Z`} fill={night ? '#ffe9a0' : '#7a5a3a'} />
      <path d={rays.join('')} stroke={STONE} strokeWidth={0.8} />
      <rect x={cx - 5} y={top} width={10} height={1} fill={STONE} />
      {!door && (
        <g>
          <rect x={cx - 0.5} y={top + 1} width={1} height={bottom - top - 1} fill={STONE} />
          <rect x={cx - 5} y={top + 8} width={10} height={1} fill={STONE} opacity={0.8} />
        </g>
      )}
      {door && <rect x={cx - 5} y={top + 1} width={4} height={bottom - top - 1} fill="#6b4423" />}
    </g>
  );
}

/** Fachada de frente (z = 0, então é desenhada direto nas coordenadas da tela). */
const Facade = memo(function Facade({ night, onSign }: { night: boolean; onSign: () => void }) {
  const wall = 'M30 90V52L71 24L112 52V90Z';
  return (
    <g>
      <path d={wall} fill={INK} transform="translate(-1 0)" />
      <path d={wall} fill={INK} transform="translate(1 0)" />
      <path d={wall} fill="url(#es-brick)" />
      <rect x={30} y={52} width={82} height={2} fill="#d98c6c" />
      <rect x={30} y={82} width={82} height={8} fill={STONE} />
      {[34, 46, 58, 82, 94, 106].map((x) => (
        <rect key={x} x={x} y={82} width={1} height={8} fill={STONE_DK} />
      ))}
      <rect x={30} y={86} width={82} height={1} fill={STONE_DK} />
      {/* Beiral de madeira do frontão */}
      <path d="M25 56L71 21L117 56" stroke={INK} strokeWidth={3.4} fill="none" />
      <path d="M25 56L71 21L117 56" stroke={WOOD} strokeWidth={2} fill="none" />
      {/* Os dois olhos redondos */}
      {[64, 78].map((x) => (
        <g key={x}>
          <circle cx={x} cy={35} r={4} fill={INK} />
          <circle cx={x} cy={35} r={3.2} fill="#f4f1de" />
          <circle cx={x} cy={35} r={1.8} fill={night ? '#ffd76a' : '#2a1e16'} />
        </g>
      ))}
      <Arch cx={44} bottom={82} door={false} night={night} />
      <Arch cx={71} bottom={GROUND} door night={night} />
      <Arch cx={98} bottom={82} door={false} night={night} />
      {/* Placa */}
      <g
        className="cw-tap"
        onClick={(e) => {
          e.stopPropagation();
          onSign();
        }}
        role="button"
        aria-label="Placa CATAGUAZES"
      >
        <rect x={47} y={40} width={48} height={9} fill={INK} />
        <rect x={48} y={41} width={46} height={7} fill="#f4f1de" />
        <PixelText text="CATAGUAZES" x={52} y={42} fill="#3a2a1e" />
      </g>
    </g>
  );
});

/** Vaso com espada-de-são-jorge / agave, na frente da fachada. */
function Pot({ x }: { x: number }) {
  const leaves = [-50, -25, 0, 25, 50].map((a, i) => {
    const r = (a * Math.PI) / 180;
    const len = i === 2 ? 9 : 7;
    return `M${x} ${GROUND - 5}L${(x + Math.sin(r) * len).toFixed(1)} ${(GROUND - 5 - Math.cos(r) * len).toFixed(1)}`;
  });
  return (
    <g>
      <path d={leaves.join('')} stroke="#2f7d4a" strokeWidth={1.4} />
      <path d={leaves.join('')} stroke="#7fbf6a" strokeWidth={0.5} />
      <path d={`M${x - 4} ${GROUND - 5}H${x + 4}L${x + 3} ${GROUND}H${x - 3}Z`} fill={INK} />
      <path d={`M${x - 3.4} ${GROUND - 4.4}H${x + 3.4}L${x + 2.5} ${GROUND - 0.6}H${x - 2.5}Z`} fill="#b8b0a0" />
    </g>
  );
}

/* ---- Trem ---- */

/** Desenha o trem com a frente da locomotiva em `zf` (só o que está na frente de ZMIN). */
function Train({ zf, night, t }: { zf: number; night: boolean; t: number }) {
  const { x0, x1, top, floor, wheel } = TRAIN;
  const parts: ReactNode[] = [];
  let z = zf;
  const cars = CARS.map((c) => {
    const z0 = z;
    z += c.len + 3;
    return { ...c, z0, z1: z0 + c.len };
  });
  for (const c of [...cars].reverse()) {
    if (c.z1 <= ZMIN + 2) continue;
    const a = Math.max(c.z0, ZMIN + 2);
    const body = c.loco ? '#2f5fb3' : '#a8482a';
    const roof = c.loco ? '#4a7fd0' : '#c25a36';
    const key = c.z0.toFixed(0);
    parts.push(
      <g key={key}>
        <polygon points={pts([[x0, top, a], [x1, top, a], [x1, top, c.z1], [x0, top, c.z1]])} fill={roof} />
        <polygon points={sideQuad(x1, top, floor, a, c.z1)} fill={body} />
        <polygon points={sideQuad(x1, floor, wheel, a, c.z1)} fill="#2a2f33" />
        {c.loco ? (
          <>
            <polygon points={sideQuad(x1, 72, 75, a, c.z1)} fill="#e8772e" />
            {c.z0 + 10 > a && <polygon points={sideQuad(x1, 65, 70, Math.max(a, c.z0 + 3), c.z0 + 10)} fill={night ? '#ffd76a' : '#bfe9f2'} />}
          </>
        ) : (
          Array.from({ length: 7 }, (_, k) => c.z0 + 4 + k * 6.5)
            .filter((rz) => rz > a)
            .map((rz) => <polygon key={rz} points={sideQuad(x1, top + 1, floor - 1, rz, rz + 1.2)} fill="#7a3420" />)
        )}
        {[c.z0 + 6, c.z1 - 8].filter((wz) => wz > a).map((wz) => {
          const [cx, cy] = P(x1, wheel - 1.5, wz);
          return <circle key={wz} cx={cx} cy={cy} r={Math.max(0.6, 2.2 * sc(wz))} fill="#5f6d76" />;
        })}
      </g>,
    );
  }
  // Frente da locomotiva (para-brisa, faixas em V laranja e branco, farol).
  if (zf > ZMIN + 2) {
    const s = sc(zf);
    const [fx, fy] = P(x0, top, zf);
    const w = (x1 - x0) * s;
    const h = (wheel - top) * s;
    parts.push(
      <g key="front">
        <rect x={fx - 0.6} y={fy - 0.6} width={w + 1.2} height={h + 1.2} fill={INK} />
        <rect x={fx} y={fy} width={w} height={h * 0.55} fill="#2f5fb3" />
        <rect x={fx + w * 0.12} y={fy + h * 0.1} width={w * 0.76} height={h * 0.2} fill={night ? '#ffd76a' : '#bfe9f2'} />
        <rect x={fx + w * 0.5 - 0.5} y={fy + h * 0.1} width={1} height={h * 0.2} fill={INK} />
        <rect x={fx} y={fy + h * 0.55} width={w} height={h * 0.45} fill="#2a2f33" />
        {[0, 1, 2].map((k) => (
          <path
            key={k}
            d={`M${fx} ${fy + h * (0.5 + k * 0.1)}L${fx + w / 2} ${fy + h * (0.62 + k * 0.1)}L${fx + w} ${fy + h * (0.5 + k * 0.1)}`}
            stroke={k % 2 ? '#ffffff' : '#e8772e'}
            strokeWidth={Math.max(0.6, 1.4 * s)}
            fill="none"
          />
        ))}
        <circle cx={fx + w / 2} cy={fy + h * 0.42} r={Math.max(0.7, 1.6 * s)} fill="#fff1b8" opacity={night || Math.sin(t * 6) > 0 ? 1 : 0.75} />
      </g>,
    );
  }
  return <g>{parts}</g>;
}

/* ---- Coisas vivas ---- */

interface Walker {
  id: number;
  x: number;
  z: number;
  tz: number;
  speed: number;
  walk: number;
  wait: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
}

const AREA = { x0: -20, x1: W + 20, y0: 50, y1: 100 };
const LAMPS = [24, 96, 168];

function newWalker(): Walker {
  const z = rnd(-30, 200);
  return { id: uid(), x: rnd(120, 142), z, tz: z, speed: rnd(10, 16), walk: 0, wait: rnd(0, 3), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    walkers: Array.from({ length: 5 }, newWalker),
    train: { z: 520, v: 0, mode: 'arrive' as 'arrive' | 'wait' | 'leave' | 'gone', until: 0 },
    bell: 0,
    clockSpin: 0,
    timers: { leaf: rnd(1, 3), mote: 0, puff: 0 },
  };
}

/* ---- Componente ---- */

export const EstacaoScene = memo(function EstacaoScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(54, 41, { blocks: 6 }), []);
  const cam = useCamera((vw) => (vw < 200 ? 84 : 132));
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);
  const [shaking, setShaking] = useState<string | null>(null);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

    // Trem: chega lá do fundo freando, para, apita e sai passando pela frente.
    const tr = L.train;
    if (tr.mode === 'arrive') {
      tr.v = clamp((tr.z - STOP) * 0.7, 5, 110);
      tr.z -= tr.v * dt;
      if (tr.z - STOP < 0.6) Object.assign(tr, { z: STOP, v: 0, mode: 'wait', until: t + 8 });
    } else if (tr.mode === 'wait') {
      if (t > tr.until) depart();
    } else if (tr.mode === 'leave') {
      tr.v = Math.min(140, tr.v + 22 * dt);
      tr.z -= tr.v * dt;
      if (tr.z + TRAIN_LEN < ZMIN) Object.assign(tr, { mode: 'gone', until: t + rnd(5, 9) });
    } else if (t > tr.until) {
      Object.assign(tr, { z: 1100, mode: 'arrive' });
      sfx('apito');
    }
    // Fumacinha do motor
    L.timers.puff -= dt;
    if (tr.mode !== 'gone' && L.timers.puff <= 0) {
      L.timers.puff = tr.mode === 'wait' ? rnd(0.5, 1) : rnd(0.15, 0.35);
      const zz = tr.z + 8;
      if (zz > ZMIN + 4) {
        const [px, py] = P(166, TRAIN.top - 1, zz);
        spawn('puff', px, py, { vx: rnd(-1.5, 1.5) + 2, vy: rnd(-6, -3), life: rnd(1.2, 2), c: '#b9c2c6' });
      }
    }

    // Gente andando na plataforma
    for (const w of L.walkers) {
      if (w.wait > 0) {
        w.wait -= dt;
        w.walk = 0;
        continue;
      }
      const dz = w.tz - w.z;
      if (Math.abs(dz) < 0.8) {
        w.wait = rnd(1.5, 5);
        if (Math.random() < 0.3 && t > w.sayUntil) {
          w.say = pick(night ? LINES_NIGHT : LINES_DAY);
          w.sayUntil = t + 2.6;
        }
        w.tz = rnd(-34, 210);
      } else {
        w.z += Math.sign(dz) * Math.min(Math.abs(dz), w.speed * dt);
        w.walk += dt;
      }
    }
    L.clockSpin = Math.max(0, L.clockSpin - dt);

    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      spawn('leaf', rnd(-20, 34), rnd(40, 60), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a', '#d9a441']), floor: rnd(92, 108) });
    }
    L.timers.mote -= dt;
    if (!night && L.timers.mote <= 0) {
      L.timers.mote = rnd(0.25, 0.6);
      spawn('mote', rnd(-60, W + 60), rnd(20, H - 4), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);
  const guard = cam.guard;

  function depart() {
    const tr = life.current.train;
    if (tr.mode !== 'wait') return;
    Object.assign(tr, { mode: 'leave', v: 4 });
    sfx('apito');
  }

  const tapTrain = () => {
    if (!guard()) return;
    const tr = life.current.train;
    sfx('apito');
    const [fx, fy] = P(166, TRAIN.top, Math.max(tr.z, ZMIN + 4));
    say('trem', fx, fy - 2, tr.mode === 'wait' ? pick(['Piuí! Lá vou eu! 🚂', 'Todos a bordo! 🚂']) : pick(['Piuí! 🚂', 'Piuí, piuí! 🚂']), 2.4);
    if (tr.mode === 'wait') setTimeout(depart, 600);
    discover('trem');
  };

  const tapSign = useCallback(() => {
    if (!guard()) return;
    sfx('pop');
    for (let i = 0; i < 8; i++) spawn('spark', rnd(48, 94), rnd(40, 49), { life: rnd(0.4, 0.8), vx: rnd(-6, 6), vy: rnd(-8, 2), c: pick(['#ffe27a', '#ffffff']) });
    say('placa', 71, 39, pick(SIGN_LINES), 3);
    discover('placa');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discover]);

  const tapBell = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('bell');
    L.bell = clock.current + 2;
    const [bx, by] = P(WALL_X, 63, 4);
    for (let i = 0; i < 5; i++) spawn('note', bx + 3 + rnd(-2, 2), by, { vx: rnd(2, 8), vy: rnd(-12, -7), life: rnd(1.4, 2.2), c: pick(['#1d3f86', '#d64545', '#f2b705']) });
    say('sino', bx + 4, by - 6, 'Blém, blém! O trem vai chegar! 🔔', 2.6);
    discover('sino');
  };

  const tapClock = () => {
    if (!guard()) return;
    sfx('tictac');
    life.current.clockSpin = 1.6;
    const [cx, cy] = P(WALL_X, 60, 44);
    say('relogio', cx, cy - 6, pick(['Tic-tac! Hora do trem! 🕰️', 'O trem tem hora certa! 🕰️']), 2.6);
    discover('relogio');
  };

  const tapPot = (x: number) => {
    if (!guard()) return;
    sfx('rustle');
    for (let i = 0; i < 5; i++) spawn('leaf', x + rnd(-3, 3), GROUND - 10, { vx: rnd(-6, 6), vy: rnd(-10, -4), life: rnd(1.4, 2), c: pick(['#2f7d4a', '#7fbf6a']), floor: GROUND + 1 });
    say(`vaso${x}`, x, GROUND - 14, pick(['Que planta bonita! 🪴', 'Cuidado, pontuda! 🌵']), 2.2);
    discover('vasos');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    w.say = pick(night ? LINES_NIGHT : LINES_DAY);
    w.sayUntil = clock.current + 2.8;
    w.wait = Math.max(w.wait, 2.4);
    discover('gente');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-16, 16), top + rnd(-6, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(92, 110) });
      if (Math.random() < 0.5) {
        setTimeout(() => sfx('chirp'), 120);
        ambient.current.flocks.push({ id: uid(), x, y: top, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const t = clock.current;
  const L = life.current;
  const A = ambient.current;
  const view = cam.view(t);

  /** Toque no chão: nos trilhos, faz faísca. */
  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (!pt || pt.y < VP.y + 2) return;
    const s = (pt.y - VP.y) / (RAIL_Y - VP.y);
    const x = VP.x + (pt.x - VP.x) / s;
    if (x > PLAT_X && x < STREET_X - 4) {
      sfx('clang');
      for (let i = 0; i < 6; i++) spawn('spark', pt.x, pt.y, { life: rnd(0.4, 0.8), vx: rnd(-8, 8), vy: rnd(-10, -2), c: pick(['#ffe27a', '#ffffff']) });
      say('trilho', pt.x, pt.y - 6, pick(['Trilhos de ferro! 🛤️', 'O trem anda aqui em cima! 🛤️']), 2.4);
      discover('trilho');
    } else spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  const tr = L.train;
  const ringing = L.bell > t;
  const swing = ringing ? Math.sin(t * 16) * 1.2 : 0;
  const [bx, by] = P(WALL_X, 63, 4);
  const [ckx, cky] = P(WALL_X, 60, 44);
  const cks = sc(44);
  const minute = (t * (L.clockSpin > 0 ? 900 : 6)) % 360;

  const walkers = [...L.walkers].sort((a, b) => b.z - a.z);
  const bubbles = [
    ...live(t),
    ...L.walkers
      .filter((w) => w.say && w.sayUntil > t)
      .map((w) => {
        const [x, y] = P(w.x, GROUND - 19, w.z);
        return { key: `w${w.id}`, x, y, text: w.say! };
      }),
  ];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <pattern id="es-brick" width="6" height="3" patternUnits="userSpaceOnUse">
            <rect width="6" height="3" fill={BRICK} />
            <rect y="2" width="6" height="1" fill={BRICK_DK} opacity={0.55} />
            <rect x="2" width="1" height="2" fill={BRICK_DK} opacity={0.35} />
          </pattern>
          <radialGradient id="es-glow">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
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
        <Haze time={time} ground={VP.y + 6} />
        <g transform={view.layer(DEPTH.near)}>
          <NearHills time={time} bd={bd} />
        </g>
        <Ground night={night} />
        <Shops night={night} />

        <Building night={night} />
        {/* Sino e relógio na parede da plataforma */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapBell();
          }}
          role="button"
          aria-label="Sino da estação"
        >
          <rect x={bx - 1} y={by - 4} width={10} height={12} fill="transparent" />
          <rect x={bx} y={by - 3} width={5} height={1} fill="#3a3f42" />
          <g transform={`rotate(${swing.toFixed(1)} ${bx + 4} ${by - 2})`}>
            <path d={`M${bx + 2} ${by + 3}Q${bx + 2} ${by - 2} ${bx + 4} ${by - 2}Q${bx + 6} ${by - 2} ${bx + 6} ${by + 3}Z`} fill="#c99400" stroke={INK} strokeWidth={0.5} />
            <rect x={bx + 3.5} y={by + 3} width={1} height={1} fill={INK} />
          </g>
        </g>
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapClock();
          }}
          role="button"
          aria-label="Relógio"
        >
          <rect x={ckx - 2} y={cky - 6} width={8} height={11} fill="transparent" />
          <ellipse cx={ckx + 1.5} cy={cky} rx={2.6 * cks} ry={4.4 * cks} fill={INK} />
          <ellipse cx={ckx + 1.5} cy={cky} rx={2 * cks} ry={3.7 * cks} fill="#f4f1de" />
          <line x1={ckx + 1.5} y1={cky} x2={ckx + 1.5 + Math.sin((minute * Math.PI) / 180) * 1.6 * cks} y2={cky - Math.cos((minute * Math.PI) / 180) * 3 * cks} stroke={INK} strokeWidth={0.5} />
          <line x1={ckx + 1.5} y1={cky} x2={ckx + 1.5 + Math.sin((minute * Math.PI) / 2160) * 1.1 * cks} y2={cky - Math.cos((minute * Math.PI) / 2160) * 2 * cks} stroke="#d64545" strokeWidth={0.5} />
        </g>
        {/* Postes da plataforma */}
        {LAMPS.map((z) => {
          const s = sc(z);
          const [lx, ly] = P(146, GROUND, z);
          return (
            <g key={z}>
              <rect x={lx - 0.5 * s} y={ly - 26 * s} width={Math.max(0.6, s)} height={26 * s} fill="#2e4a3e" />
              <circle cx={lx} cy={ly - 27 * s} r={2 * s} fill={night ? '#fff1b8' : '#e9eef2'} stroke={INK} strokeWidth={0.4} />
            </g>
          );
        })}
        <Facade night={night} onSign={tapSign} />
        {[37, 58, 84, 105].map((x) => (
          <g
            key={x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapPot(x);
            }}
          >
            <rect x={x - 6} y={GROUND - 15} width={12} height={15} fill="transparent" />
            <Pot x={x} />
          </g>
        ))}

        {walkers.map((w) => {
          const s = sc(w.z);
          const [x, y] = P(w.x, GROUND, w.z);
          return (
            <g
              key={w.id}
              className="cw-tap"
              onClick={(e) => {
                e.stopPropagation();
                tapWalker(w);
              }}
            >
              <g transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`}>
                <Character x={x} y={y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
              </g>
            </g>
          );
        })}

        {tr.mode !== 'gone' && (
          <g
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapTrain();
            }}
            role="button"
            aria-label="Trem"
          >
            <Train zf={tr.z} night={night} t={t} />
          </g>
        )}

        <BigTree id="arvore" x={14} ground={110} s={4.6} shaking={shaking === 'arvore'} onTap={tapTree} />

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <>
            <g transform={view.layer(DEPTH.near)}>
              <TownLights bd={bd} />
            </g>
            <g pointerEvents="none">
              {LAMPS.map((z) => {
                const s = sc(z);
                const [lx, ly] = P(146, GROUND, z);
                return <circle key={z} className="cw-glow" cx={lx} cy={ly - 27 * s} r={14 * s} fill="url(#es-glow)" />;
              })}
              <circle cx={71} cy={70} r={14} fill="url(#es-glow)" opacity={0.6} />
              {tr.mode !== 'gone' && tr.z > ZMIN + 4 && (() => {
                const [hx, hy] = P(166, 79, tr.z);
                return <circle cx={hx} cy={hy} r={16 * sc(tr.z)} fill="url(#es-glow)" />;
              })()}
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
        firstTip="Toque no trem, na placa e no sino para descobrir! 👆"
        dragText="👈 Arraste para ver a estação toda 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
