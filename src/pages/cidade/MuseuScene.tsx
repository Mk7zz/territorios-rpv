import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, treeRuns, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { byGender } from '../../lib/personagem';
import { shade, type Run } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import {
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
 * Visita ao Museu Energisa (Av. Astolfo Dutra, Cataguases): o casarão art nouveau amarelinho, com
 * enfeites brancos, frontão curvo, sacadas de ferro e o alpendre com a placa do museu, a escada e o
 * portão de ferro florido. No porão aberto fica a turbina laranja: tocar nela faz a energia correr
 * pelos fios do poste e acender os lampiões da rua (a água gira a turbina, a turbina faz energia).
 * Passarinhos no fio, janelas que abrem com a guia do museu acenando, gente na calçada, carros na rua.
 */

const FOCUS = 140;
/** Pé do casarão e começo da calçada. */
const GROUND = 90;
const CURB = 98;
const ROAD_Y = 111;
const LANE = { y0: GROUND + 2, y1: CURB - 1 };

const WALL = '#f2cf6b';
const WALL_SH = '#dcb14f';
const WALL_LT = '#f8e08e';
const WHITE = '#fbf7ec';
const WHITE_SH = '#e2dccb';
const IRON = '#5f6d76';
const IRON_LT = '#8a9aa3';
const BASE = '#8d969c';
const TEAL = '#12a3a0';
const ORANGE = '#e8772e';

/** Partes do casarão (x de cada coisa). */
const VER = { x0: 70, x1: 124 };
const MAIN = { x0: 124, x1: 214 };
const BAY = { x0: 140, x1: 188, cx: 164 };
const UP_WIN = [147, 173, 198];
const LOW_WIN = [146, 160, 174, 200];
const DOOR = { x: 74, y: 42 };
const TURBINE = { x: 96, y: 80 };
const LOGO = { x: 106, y: 40 };
const GATE = { x0: 30, x1: 44, y0: 76 };
const POLES = [4, 250];
const LAMPS = [{ x: 16 }, { x: 232 }, { x: 300 }];
const TREES = [
  { x: -16, s: 3.6 },
  { x: 224, s: 3.2 },
  { x: 338, s: 3.4 },
];

/** Altura do fio entre os postes (ele "barriga" no meio, e passa na frente do casarão). */
function wireY(x: number, low = 0) {
  const spans: [number, number][] = [
    [-EDGE - 20, POLES[0]],
    [POLES[0], POLES[1]],
    [POLES[1], W + EDGE + 20],
  ];
  const [a, b] = spans.find(([a, b]) => x >= a && x <= b) ?? spans[1];
  const m = (a + b) / 2;
  const half = (b - a) / 2;
  return 25 + low + 8 * (1 - ((x - m) / half) ** 2);
}

const DISCOVERIES: Discovery[] = [
  { key: 'turbina', emoji: '🌀', label: 'A turbina', tip: 'Tem uma turbina laranja no porão. Toque nela! 🌀' },
  { key: 'lampada', emoji: '💡', label: 'Os lampiões', tip: 'Toque nos lampiões da rua! 💡' },
  { key: 'passarinhos', emoji: '🐦', label: 'Os passarinhos no fio', tip: 'Toque nos passarinhos do fio! 🐦' },
  { key: 'janela', emoji: '🪟', label: 'As janelas', tip: 'Toque nas janelas lá de cima! 🪟' },
  { key: 'placa', emoji: '⚡', label: 'A placa do museu', tip: 'Toque na placa do museu! ⚡' },
  { key: 'portao', emoji: '🌸', label: 'O portão florido', tip: 'O portão de ferro tem flores. Toque nele! 🌸' },
  { key: 'gente', emoji: '👋', label: 'As pessoas na calçada', tip: 'Dê um oi pra quem passa na calçada! 👋' },
  { key: 'arvore', emoji: '🌳', label: 'As árvores da rua', tip: 'Toque nas árvores da rua! 🌳' },
];

const SIGN_LINES = ['Museu Energisa! ⚡', 'A história da energia! 💡', 'A luz chegou aqui em 1905! ✨', 'Pode entrar, é de graça! 😊'];
const LINES_DAY = ['Oi! 👋', 'Vamos no museu? 🏛️', 'Que casarão bonito! 💛', 'Bom dia! ☀️', 'Já viu a turbina? 🌀', 'Apague a luz ao sair! 💡'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Que lampião bonito! 💡', 'O museu fica lindo à noite! ✨'];

/* ---- Sprites ---- */

const SPARROW = { b: '#7a5a3a', B: '#a07a52', w: '#f1e3c4', k: INK, y: '#f2b705' };
const sparrowSit = sprite(['.bb.', 'bkby', 'bBbb', '.ww.'], SPARROW);
const WAGON = [
  '...gggggggggg.....',
  '..gGGGgGGGgGGg....',
  '.ggGGGgGGGgGGGg...',
  'wwwwwwwwwwwwwwwwwl',
  'wwwwwwwwwwwwwwwwww',
  'ssswwwwwwwwwwwsssw',
  '.skks.......skks..',
  '..kk.........kk...',
];
const wagonRuns = sprite(WAGON, { g: '#f4f6f4', G: '#7fa8be', w: '#f4f6f4', l: '#ffe27a', s: '#c9d0d3', k: '#22303a' });

/* ---- Cenário ---- */

/** Casas vizinhas (atrás das árvores da rua): a rosa à esquerda e a de azulejos à direita. */
const Neighbors = memo(function Neighbors({ night }: { night: boolean }) {
  const glass = (i: number) => (night ? (i % 3 ? '#ffd76a' : '#3d5560') : '#7fb8d6');
  const house = (x0: number, w: number, top: number, wall: string, trim: string, tiles: boolean, key: string) => (
    <g key={key}>
      <rect x={x0 - 1} y={top - 1} width={w + 2} height={GROUND - top + 1} fill={INK} />
      <rect x={x0} y={top} width={w} height={GROUND - top} fill={wall} />
      <rect x={x0 - 2} y={top - 3} width={w + 4} height={3} fill={trim} />
      <rect x={x0} y={GROUND - 5} width={w} height={5} fill={shade(wall, -0.2)} />
      {tiles &&
        Array.from({ length: Math.floor(w / 3) }, (_, i) =>
          Array.from({ length: Math.floor((GROUND - top - 6) / 3) }, (_, r) => (
            <rect key={`${i}:${r}`} x={x0 + 1 + i * 3} y={top + 2 + r * 3} width={1} height={1} fill={(i + r) % 2 ? '#2f5fb3' : '#8db6e8'} />
          )),
        )}
      {Array.from({ length: Math.floor((w - 4) / 12) }, (_, i) => (
        <g key={`w${i}`}>
          <rect x={x0 + 4 + i * 12} y={top + 5} width={7} height={11} fill={INK} />
          <rect x={x0 + 5 + i * 12} y={top + 6} width={5} height={9} fill={glass(i)} />
          <rect x={x0 + 4 + i * 12} y={top + 25} width={7} height={10} fill={INK} />
          <rect x={x0 + 5 + i * 12} y={top + 26} width={5} height={9} fill={glass(i + 1)} />
        </g>
      ))}
    </g>
  );
  return (
    <g>
      {house(-110, 48, 46, '#f4ead8', '#c0573e', false, 'a')}
      {house(-60, 84, 44, '#f2b8c6', WHITE, false, 'b')}
      {house(220, 64, 42, '#eef2f4', '#c9d3d8', true, 'c')}
      {house(286, 56, 48, '#fde2b0', '#a84a32', false, 'd')}
      {house(344, 70, 44, '#e3ecef', WHITE, false, 'e')}
    </g>
  );
});

/** Calçada de pedra portuguesa, meio-fio e o asfalto da rua com a faixa. */
const Street = memo(function Street() {
  return (
    <g>
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={CURB - GROUND} fill="#e6dcc2" />
      {Array.from({ length: 60 }, (_, i) => (
        <rect key={i} x={-EDGE + i * 11} y={GROUND + 2 + (i % 3) * 2} width={5} height={1} fill="#cfc3a2" />
      ))}
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={1} fill="#b9ad8c" />
      <rect x={FULL.x} y={CURB} width={FULL.w} height={2} fill="#b5ad9c" />
      <rect x={FULL.x} y={CURB + 2} width={FULL.w} height={GROUND_END - CURB} fill="#5d646a" />
      <rect x={FULL.x} y={CURB + 2} width={FULL.w} height={1} fill="#4a5056" />
      {Array.from({ length: 34 }, (_, i) => (
        <rect key={`f${i}`} x={-EDGE + i * 20} y={H - 3} width={10} height={1} fill="#e9e2d0" />
      ))}
    </g>
  );
});

/** Arco de pixels (do frontão e da moldura em volta das janelas do meio). */
function arcPath(cx: number, base: number, half: number, rise: number, thick = 1) {
  let d = '';
  for (let x = cx - half; x <= cx + half; x++) {
    const y = base - Math.round(rise * Math.sqrt(Math.max(0, 1 - ((x - cx) / half) ** 2)));
    d += `M${x} ${y}h1v${thick}h-1z`;
  }
  return d;
}

/** Corpo do casarão: paredes, cornijas, frontão curvo com o medalhão, pilastras e o porão. */
const Facade = memo(function Facade({ night }: { night: boolean }) {
  const pediment = useMemo(() => {
    let fill = '';
    for (let x = BAY.x0 - 2; x <= BAY.x1 + 2; x++) {
      const top = 26 - Math.round(7 * Math.sqrt(Math.max(0, 1 - ((x - BAY.cx) / 27) ** 2)));
      fill += `M${x} ${top}h1V27h-1z`;
    }
    return { fill, edge: arcPath(BAY.cx, 26, 27, 7, 2), inner: arcPath(BAY.cx, 36, 20, 8) };
  }, []);
  const glass = (i: number) => (night ? (i % 2 ? '#ffd76a' : '#ffe9a0') : '#3d4a52');
  return (
    <g>
      {/* Sombra no chão */}
      <rect x={VER.x0 - 4} y={GROUND} width={MAIN.x1 - VER.x0 + 12} height={2} fill="#000" opacity={0.12} />
      {/* Contorno */}
      <rect x={MAIN.x0 - 1} y={35} width={MAIN.x1 - MAIN.x0 + 5} height={GROUND - 35} fill={INK} />
      <path d={pediment.fill} transform="translate(0 -1)" fill={INK} />
      {/* Paredes */}
      <rect x={MAIN.x0} y={36} width={MAIN.x1 - MAIN.x0} height={GROUND - 36} fill={WALL} />
      <rect x={MAIN.x1} y={38} width={3} height={GROUND - 38} fill={WALL_SH} />
      <path d={pediment.fill} fill={WALL} />
      <rect x={BAY.x0} y={26} width={BAY.x1 - BAY.x0} height={10} fill={WALL} />
      {/* Porão com faixas (rusticado) e a barra de pedra */}
      {[73, 76, 79, 82].map((y) => (
        <rect key={y} x={MAIN.x0} y={y} width={MAIN.x1 - MAIN.x0} height={1} fill={WALL_SH} />
      ))}
      <rect x={MAIN.x0} y={GROUND - 5} width={MAIN.x1 - MAIN.x0 + 3} height={5} fill={BASE} />
      <rect x={MAIN.x0} y={GROUND - 5} width={MAIN.x1 - MAIN.x0 + 3} height={1} fill="#a9b1b5" />
      {/* Janelinhas do porão, em arco, com grade */}
      {LOW_WIN.map((x, i) => (
        <g key={x}>
          <rect x={x - 1} y={72} width={8} height={12} fill={WHITE} />
          <rect x={x} y={73} width={6} height={11} fill={glass(i)} />
          <rect x={x} y={73} width={1} height={1} fill={WHITE} />
          <rect x={x + 5} y={73} width={1} height={1} fill={WHITE} />
          {[1, 3, 5].map((k) => (
            <rect key={k} x={x + k - 0.5} y={74} width={1} height={10} fill={IRON_LT} opacity={0.9} />
          ))}
          <rect x={x} y={78} width={6} height={1} fill={IRON_LT} />
        </g>
      ))}
      {/* Cornija do meio (entre o porão e o andar de cima) */}
      <rect x={MAIN.x0 - 2} y={66} width={MAIN.x1 - MAIN.x0 + 6} height={4} fill={INK} />
      <rect x={MAIN.x0 - 1} y={67} width={MAIN.x1 - MAIN.x0 + 4} height={2} fill={WHITE} />
      <rect x={MAIN.x0 - 1} y={69} width={MAIN.x1 - MAIN.x0 + 4} height={1} fill={WHITE_SH} />
      {/* Pilastras brancas */}
      {[MAIN.x0, BAY.x0 - 3, BAY.x1, MAIN.x1 - 3].map((x) => (
        <g key={x}>
          <rect x={x} y={38} width={3} height={28} fill={WHITE} />
          <rect x={x + 2} y={38} width={1} height={28} fill={WHITE_SH} />
        </g>
      ))}
      {/* Cornija de cima com dentículos */}
      <rect x={MAIN.x0 - 3} y={34} width={MAIN.x1 - MAIN.x0 + 8} height={5} fill={INK} />
      <rect x={MAIN.x0 - 2} y={35} width={MAIN.x1 - MAIN.x0 + 6} height={2} fill={WHITE} />
      <rect x={MAIN.x0 - 2} y={37} width={MAIN.x1 - MAIN.x0 + 6} height={1} fill={WHITE_SH} />
      {Array.from({ length: Math.floor((MAIN.x1 - MAIN.x0 + 4) / 3) }, (_, i) => (
        <rect key={i} x={MAIN.x0 - 1 + i * 3} y={38} width={1} height={1} fill={WALL_SH} />
      ))}
      {/* Frontão curvo com a borda branca, a moldura em arco e o medalhão */}
      <path d={pediment.edge} transform="translate(0 -1)" fill={INK} />
      <path d={pediment.edge} fill={WHITE} />
      <path d={pediment.inner} fill={WHITE} />
      <rect x={BAY.cx - 5} y={27} width={11} height={7} fill={WHITE} />
      <rect x={BAY.cx - 4} y={28} width={9} height={5} fill={WALL_LT} />
      <rect x={BAY.cx - 2} y={29} width={1} height={3} fill={WALL_SH} />
      <rect x={BAY.cx} y={29} width={1} height={3} fill={WALL_SH} />
      <rect x={BAY.cx + 2} y={29} width={1} height={3} fill={WALL_SH} />
      <rect x={BAY.cx - 2} y={30} width={5} height={1} fill={WALL_SH} />
      {/* Enfeite do alto (concha com volutas) e as volutas dos cantos */}
      <rect x={BAY.cx - 4} y={16} width={9} height={3} fill={INK} />
      <rect x={BAY.cx - 3} y={15} width={7} height={3} fill={WHITE} />
      <rect x={BAY.cx - 1} y={13} width={3} height={3} fill={WHITE} />
      <rect x={BAY.cx} y={12} width={1} height={1} fill={WHITE} />
      <rect x={BAY.cx - 6} y={18} width={3} height={1} fill={WHITE} />
      <rect x={BAY.cx + 4} y={18} width={3} height={1} fill={WHITE} />
      {[BAY.x0 - 6, BAY.x1 + 2].map((x, i) => (
        <g key={x} fill={WHITE}>
          <rect x={x} y={30} width={4} height={1} />
          <rect x={x + (i ? 3 : 0)} y={31} width={1} height={3} />
          <rect x={x + 1} y={33} width={2} height={1} />
        </g>
      ))}
      {/* Mísulas embaixo das sacadas */}
      {[BAY.x0 + 3, BAY.cx - 1, BAY.x1 - 5, UP_WIN[2] + 1, UP_WIN[2] + 6].map((x) => (
        <rect key={x} x={x} y={70} width={2} height={2} fill={WHITE} />
      ))}
    </g>
  );
});

/** Sacadas de ferro com o desenho de curvinhas (art nouveau). */
function Balcony({ x0, x1 }: { x0: number; x1: number }) {
  const balusters: ReactNode[] = [];
  for (let x = x0 + 1; x < x1 - 1; x += 3) {
    balusters.push(<rect key={`a${x}`} x={x} y={60} width={1} height={6} fill={IRON} />);
    balusters.push(<rect key={`b${x}`} x={x + 1} y={62} width={1} height={1} fill={IRON} />);
    balusters.push(<rect key={`c${x}`} x={x + 1} y={64} width={1} height={1} fill={IRON_LT} />);
  }
  return (
    <g>
      <rect x={x0 - 1} y={65} width={x1 - x0 + 2} height={2} fill={WHITE} />
      <rect x={x0} y={58} width={x1 - x0} height={2} fill={INK} />
      <rect x={x0} y={58} width={x1 - x0} height={1} fill={IRON_LT} />
      {balusters}
    </g>
  );
}

/** Alpendre: parede do fundo, porta, telhadinho de madeira, colunas finas de ferro e o porão aberto. */
const Veranda = memo(function Veranda({ night }: { night: boolean }) {
  return (
    <g>
      <rect x={VER.x0 - 1} y={35} width={VER.x1 - VER.x0 + 1} height={GROUND - 35} fill={INK} />
      <rect x={VER.x0} y={36} width={VER.x1 - VER.x0} height={30} fill={night ? '#c9a55a' : '#e8c45f'} />
      <rect x={VER.x0} y={36} width={VER.x1 - VER.x0} height={3} fill="#000" opacity={0.12} />
      <rect x={VER.x0} y={69} width={VER.x1 - VER.x0} height={GROUND - 69} fill={WALL_SH} />
      <rect x={VER.x0} y={GROUND - 5} width={VER.x1 - VER.x0} height={5} fill={BASE} />
      {/* Porão aberto onde fica a turbina */}
      <rect x={80} y={71} width={33} height={GROUND - 76} fill={INK} />
      <rect x={81} y={72} width={31} height={GROUND - 77} fill={night ? '#3a2f28' : '#2a2622'} />
      <rect x={81} y={72} width={31} height={1} fill="#4a3e35" />
      {/* Porta do museu, lá em cima */}
      <rect x={DOOR.x - 1} y={DOOR.y - 1} width={13} height={25} fill={INK} />
      <rect x={DOOR.x} y={DOOR.y} width={11} height={24} fill={WHITE} />
      <rect x={DOOR.x + 1} y={DOOR.y + 1} width={4} height={5} fill={night ? '#ffd76a' : '#7fb8d6'} />
      <rect x={DOOR.x + 6} y={DOOR.y + 1} width={4} height={5} fill={night ? '#ffd76a' : '#7fb8d6'} />
      <rect x={DOOR.x + 1} y={DOOR.y + 8} width={4} height={14} fill={WHITE_SH} />
      <rect x={DOOR.x + 6} y={DOOR.y + 8} width={4} height={14} fill={WHITE_SH} />
      <rect x={DOOR.x + 5} y={DOOR.y} width={1} height={24} fill={INK} />
      {/* Chão do alpendre */}
      <rect x={VER.x0 - 3} y={65} width={VER.x1 - VER.x0 + 4} height={5} fill={INK} />
      <rect x={VER.x0 - 2} y={66} width={VER.x1 - VER.x0 + 2} height={3} fill={WHITE} />
      <rect x={VER.x0 - 2} y={68} width={VER.x1 - VER.x0 + 2} height={1} fill={WHITE_SH} />
      {/* Telhadinho de madeira */}
      <rect x={VER.x0 - 5} y={29} width={VER.x1 - VER.x0 + 8} height={6} fill={INK} />
      <rect x={VER.x0 - 4} y={30} width={VER.x1 - VER.x0 + 6} height={2} fill="#a84a32" />
      <rect x={VER.x0 - 4} y={32} width={VER.x1 - VER.x0 + 6} height={2} fill="#8a5a2b" />
      <rect x={VER.x0 - 4} y={33} width={VER.x1 - VER.x0 + 6} height={1} fill="#c08a52" />
      {/* Colunas */}
      {[VER.x0, 87, VER.x1 - 2].map((x) => (
        <g key={x}>
          <rect x={x} y={35} width={2} height={31} fill={IRON} />
          <rect x={x} y={35} width={1} height={31} fill={IRON_LT} />
          <rect x={x - 1} y={35} width={4} height={2} fill={IRON} />
        </g>
      ))}
    </g>
  );
});

/** Guarda-corpo do alpendre com vasinhos de flor. */
function VerandaRail() {
  const bal: ReactNode[] = [];
  for (let x = VER.x0; x < VER.x1; x += 2) bal.push(<rect key={x} x={x} y={58} width={1} height={7} fill={IRON} />);
  return (
    <g pointerEvents="none">
      {bal}
      {Array.from({ length: Math.floor((VER.x1 - VER.x0) / 6) }, (_, i) => (
        <rect key={`o${i}`} x={VER.x0 + 1 + i * 6} y={61} width={3} height={1} fill={IRON_LT} />
      ))}
      <rect x={VER.x0 - 2} y={56} width={VER.x1 - VER.x0 + 2} height={2} fill={INK} />
      <rect x={VER.x0 - 2} y={56} width={VER.x1 - VER.x0 + 2} height={1} fill={IRON_LT} />
      {[72, 79].map((x) => (
        <g key={x}>
          <rect x={x} y={53} width={5} height={3} fill="#c0573e" />
          <rect x={x - 1} y={51} width={7} height={2} fill="#3aa655" />
          <rect x={x} y={50} width={1} height={1} fill="#ec6a8c" />
          <rect x={x + 3} y={50} width={1} height={1} fill="#ec6a8c" />
          <rect x={x + 5} y={51} width={1} height={1} fill="#f7a1b5" />
        </g>
      ))}
    </g>
  );
}

/** Escada do alpendre (da calçada até lá em cima), com o corrimão de ferro. */
const Stairs = memo(function Stairs() {
  const steps = Array.from({ length: 7 }, (_, i) => ({ x: 48 + i * 3, y: GROUND - (i + 1) * 3 }));
  return (
    <g>
      <path d={`M48 ${GROUND} L48 ${GROUND - 3} ${steps.map((s) => `L${s.x} ${s.y} L${s.x + 3} ${s.y}`).join(' ')} L${VER.x0 + 1} 66 L${VER.x0 + 1} ${GROUND} Z`} fill={INK} transform="translate(-1 -1)" />
      {steps.map((s) => (
        <g key={s.x}>
          <rect x={s.x} y={s.y} width={VER.x0 + 1 - s.x} height={3} fill={WALL_SH} />
          <rect x={s.x} y={s.y} width={VER.x0 + 1 - s.x} height={1} fill={WHITE} />
        </g>
      ))}
      <rect x={48} y={GROUND - 3} width={VER.x0 - 47} height={3} fill={BASE} />
      <path d={`M47.5 ${GROUND - 12} L${VER.x0 - 1} ${GROUND - 33}`} stroke={IRON} strokeWidth={1.2} />
      {steps.map((s) => (
        <rect key={`b${s.x}`} x={s.x + 1} y={s.y - 8} width={1} height={8} fill={IRON} />
      ))}
    </g>
  );
});

/** Pilares do portão (os enfeites ficam no portão, que abre ao toque). */
function GatePillars() {
  return (
    <g>
      {[GATE.x0 - 5, GATE.x1].map((x) => (
        <g key={x}>
          <rect x={x - 1} y={GATE.y0 - 4} width={7} height={GROUND - GATE.y0 + 4} fill={INK} />
          <rect x={x} y={GATE.y0 - 3} width={5} height={GROUND - GATE.y0 + 3} fill={WALL} />
          <rect x={x + 4} y={GATE.y0 - 3} width={1} height={GROUND - GATE.y0 + 3} fill={WALL_SH} />
          <rect x={x - 1} y={GATE.y0 - 5} width={7} height={2} fill={WHITE} />
          <rect x={x + 1} y={GATE.y0 - 8} width={3} height={3} fill={WHITE} />
        </g>
      ))}
    </g>
  );
}

/** Portão de ferro com flores; `open` de 0 (fechado) a 1 (aberto) faz a folha girar para dentro. */
function Gate({ open }: { open: number }) {
  const w = GATE.x1 - GATE.x0;
  const s = Math.max(0.12, Math.cos(open * 1.3));
  const flower = (x: number, y: number, c: string) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y - 1} width={1} height={1} fill={c} />
      <rect x={x - 1} y={y} width={3} height={1} fill={c} />
      <rect x={x} y={y + 1} width={1} height={1} fill={c} />
      <rect x={x} y={y} width={1} height={1} fill="#f2b705" />
    </g>
  );
  return (
    <g transform={`translate(${GATE.x0} 0) scale(${s} 1) translate(${-GATE.x0} 0)`}>
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <rect x={GATE.x0 + 1 + i * 3} y={GATE.y0 + 1} width={1} height={GROUND - GATE.y0 - 1} fill={IRON} />
          <rect x={GATE.x0 + 1 + i * 3} y={GATE.y0 - 1} width={1} height={2} fill={IRON} />
          <rect x={GATE.x0 + i * 3} y={GATE.y0 - 2} width={3} height={1} fill={IRON} />
        </g>
      ))}
      <rect x={GATE.x0} y={GATE.y0 + 2} width={w} height={1} fill={IRON} />
      <rect x={GATE.x0} y={GROUND - 3} width={w} height={1} fill={IRON} />
      <path d={`M${GATE.x0} ${GATE.y0 + 9} Q${GATE.x0 + w / 2} ${GATE.y0 + 3} ${GATE.x1} ${GATE.y0 + 9}`} stroke={IRON_LT} strokeWidth={1} fill="none" shapeRendering="auto" />
      {flower(GATE.x0 + 4, GATE.y0 + 6, '#ec6a8c')}
      {flower(GATE.x0 + 10, GATE.y0 + 6, '#ec6a8c')}
      {flower(GATE.x0 + 7, GATE.y0 + 10, '#f7a1b5')}
    </g>
  );
}

/** Lampião de ferro, de rua antiga. */
function Lamp({ x, on }: { x: number; on: boolean }) {
  const y = GROUND + 3;
  return (
    <g>
      <rect x={x - 2} y={y - 3} width={5} height={3} fill={INK} />
      <rect x={x} y={y - 30} width={1} height={28} fill="#2e4a3e" />
      <rect x={x - 1} y={y - 30} width={3} height={2} fill="#2e4a3e" />
      <rect x={x - 3} y={y - 38} width={7} height={9} fill={INK} />
      <rect x={x - 2} y={y - 37} width={5} height={7} fill={on ? '#fff1b8' : '#d8d2bc'} />
      <rect x={x} y={y - 37} width={1} height={7} fill={INK} opacity={0.4} />
      <rect x={x - 3} y={y - 40} width={7} height={2} fill="#2e4a3e" />
      <rect x={x - 1} y={y - 42} width={3} height={2} fill="#2e4a3e" />
    </g>
  );
}

/** Poste de luz de concreto com a cruzeta e os isoladores. */
function Pole({ x }: { x: number }) {
  return (
    <g pointerEvents="none">
      <rect x={x - 2} y={20} width={4} height={GROUND + 4 - 20} fill={INK} />
      <rect x={x - 1} y={21} width={2} height={GROUND + 2 - 21} fill="#b7b9b4" />
      <rect x={x - 1} y={21} width={1} height={GROUND + 2 - 21} fill="#d4d6d0" />
      <rect x={x - 8} y={23} width={17} height={3} fill={INK} />
      <rect x={x - 7} y={24} width={15} height={1} fill="#8d969c" />
      {[-6, 6].map((d) => (
        <rect key={d} x={x + d} y={22} width={1} height={2} fill="#f4f1de" />
      ))}
    </g>
  );
}

/** Turbina laranja: a caixa em espiral, o cano de água e o rotor que gira (`a` é o ângulo). */
function Turbine({ a, fast }: { a: number; fast: boolean }) {
  const { x, y } = TURBINE;
  const ring: ReactNode[] = [];
  for (let dy = -7; dy <= 7; dy++)
    for (let dx = -7; dx <= 7; dx++) {
      const r = Math.hypot(dx, dy);
      if (r > 7.2 || r < 3.2) continue;
      ring.push(<rect key={`${dx}:${dy}`} x={x + dx} y={y + dy} width={1} height={1} fill={r > 6.2 ? INK : dx + dy < -2 ? '#f7a35c' : r > 5 ? ORANGE : '#c85e1c'} />);
    }
  return (
    <g>
      <rect x={x - 15} y={y - 3} width={9} height={6} fill={INK} />
      <rect x={x - 15} y={y - 2} width={9} height={4} fill={ORANGE} />
      <rect x={x - 15} y={y - 2} width={9} height={1} fill="#f7a35c" />
      <rect x={x - 9} y={y + 6} width={18} height={3} fill={INK} />
      <rect x={x - 8} y={y + 7} width={16} height={2} fill="#6f7a80" />
      {ring}
      <g transform={`rotate(${a.toFixed(1)} ${x + 0.5} ${y + 0.5})`}>
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={x} y={y - 3} width={1} height={7} fill={fast ? '#ffe27a' : '#9aa4aa'} transform={`rotate(${k * 45} ${x + 0.5} ${y + 0.5})`} />
        ))}
      </g>
      <rect x={x - 1} y={y - 1} width={3} height={3} fill={INK} />
      <rect x={x} y={y} width={1} height={1} fill="#f2b705" />
      <rect x={x + 9} y={y - 9} width={6} height={4} fill={INK} />
      <rect x={x + 10} y={y - 8} width={4} height={2} fill="#f4f1de" />
    </g>
  );
}

/** Árvore grande de calçada (a mesma árvore do mapa, bem maior). */
const StreetTree = memo(function StreetTree({ x, s, shaking, onTap }: { x: number; s: number; shaking: boolean; onTap: (id: string, x: number, top: number) => void }) {
  const w = 11 * s;
  const h = 13 * s;
  return (
    <g
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        onTap(`t${x}`, x, GROUND + 2 - h * 0.8);
      }}
    >
      <ellipse cx={x} cy={GROUND + 3} rx={w * 0.4} ry={1.4} fill="#000" opacity={0.16} />
      <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '5s', '--a': '0.9deg' } as CSSProperties}>
        <g transform={`translate(${x - w / 2} ${GROUND + 3 - h}) scale(${s})`}>
          <Pixels runs={treeRuns} />
        </g>
      </g>
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

interface Sparrow {
  id: number;
  /** Lugar no fio. */
  home: number;
  x: number;
  y: number;
  /** Até quando está fora do fio (voou). */
  away: number;
  face: 1 | -1;
  hop: number;
}

const AREA = { x0: -20, x1: W + 20, y0: 44, y1: CURB };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), y: Math.round(rnd(LANE.y0 + 1, LANE.y1)), tx: rnd(20, W - 20), speed: rnd(9, 14), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(20, 60)), newWalker(rnd(150, 210)), newWalker(rnd(240, 300)), newWalker()],
    cars: [] as Car[],
    carTimer: rnd(1, 3),
    sparrows: [36, 46, 118, 178, 192, 270].map((x): Sparrow => ({ id: uid(), home: x, x, y: wireY(x) - 1, away: 0, face: pick([1, -1] as const), hop: rnd(1, 4) })),
    timers: { leaf: rnd(1, 3), mote: 0, puff: 0 },
    /** Ângulo do rotor da turbina e até quando ela gira rápido. */
    spin: 0,
    spinUntil: 0,
    /** Pulsos de energia correndo pelo fio (hora em que saíram do poste). */
    pulses: [] as number[],
    lampUntil: [0, 0, 0],
    windowUntil: [0, 0, 0],
    windowWho: [randomLook(), randomLook(), randomLook()],
    gate: { open: 0, until: 0 },
    signUntil: 0,
  };
}

/* ---- Componente ---- */

export const MuseuScene = memo(function MuseuScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(GROUND - 12, 33, { blocks: 5 }), []);
  const cam = useCamera(FOCUS);
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);
  const [shaking, setShaking] = useState<string | null>(null);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

    // Turbina: gira devagar sempre (como no museu) e bem rápido depois do toque
    L.spin += dt * (t < L.spinUntil ? 720 : 40);

    // Energia correndo pelo fio: quando o pulso chega no fim, os lampiões acendem
    L.pulses = L.pulses.filter((t0) => {
      if (t - t0 < 1.4) {
        if (Math.random() < 0.5) {
          const x = POLES[0] + ((t - t0) / 1.4) * (POLES[1] - POLES[0] + 60);
          spawn('bolt', x, wireY(x), { life: 0.35, c: '#ffe27a' });
        }
        return true;
      }
      L.lampUntil = L.lampUntil.map((u) => Math.max(u, t + 4));
      sfx('zap');
      for (const l of LAMPS) for (let i = 0; i < 6; i++) spawn('spark', l.x + 0.5, GROUND - 31, { life: rnd(0.4, 0.8), vx: rnd(-10, 10), vy: rnd(-10, 4), c: '#fff1b8' });
      return false;
    });

    // Carros passando na rua
    L.carTimer -= dt;
    if (L.carTimer <= 0 && L.cars.length < 2) {
      L.carTimer = rnd(4, 9);
      const dir = pick([1, -1] as const);
      L.cars.push({ id: uid(), x: dir > 0 ? -EDGE - 30 : W + EDGE + 30, dir, speed: rnd(26, 36), runs: pick(carRuns) });
    }
    for (const c of L.cars) c.x += c.dir * c.speed * dt;
    L.cars = L.cars.filter((c) => c.x > -EDGE - 40 && c.x < W + EDGE + 40);

    // Gente na calçada (às vezes para na frente do museu)
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

    // Passarinhos no fio: pulam de lado, viram e voltam depois de voar
    for (const s of L.sparrows) {
      if (t < s.away) continue;
      s.hop -= dt;
      if (s.hop <= 0) {
        s.hop = rnd(1.5, 4);
        if (Math.random() < 0.5) s.face = s.face === 1 ? -1 : 1;
        else s.x = clamp(s.home + rnd(-4, 4), s.home - 6, s.home + 6);
        s.y = wireY(s.x) - 1;
      }
    }

    // Portão volta a fechar sozinho
    const gt = L.gate;
    gt.open += ((t < gt.until ? 1 : 0) - gt.open) * Math.min(1, dt * 4);

    // Folhas caindo das árvores e a poeirinha na luz
    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      const tr = pick(TREES);
      spawn('leaf', tr.x + rnd(-14, 14), GROUND - 13 * tr.s * 0.7, { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a', '#d9a441']), floor: rnd(GROUND + 2, CURB) });
    }
    L.timers.mote -= dt;
    if (!night && L.timers.mote <= 0) {
      L.timers.mote = rnd(0.25, 0.6);
      spawn('mote', rnd(-EDGE, W + EDGE), rnd(20, H - 4), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);
  const guard = cam.guard;

  const tapTurbine = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('whir');
    L.spinUntil = clock.current + 3;
    setTimeout(() => (L.pulses.push(clock.current), sfx('zap')), 700);
    for (let i = 0; i < 8; i++) spawn('bolt', TURBINE.x + rnd(-8, 8), TURBINE.y + rnd(-8, 4), { life: rnd(0.4, 0.9), vy: rnd(-8, -2), vx: rnd(-4, 4), c: pick(['#ffe27a', '#fff1b8']) });
    say('turbina', TURBINE.x, TURBINE.y - 12, pick(['A água gira a turbina! 🌀', 'Vruuum! Isso é energia! ⚡', 'Olha a luz chegando nos postes! 💡']), 3);
    discover('turbina');
  };

  const tapLamp = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    sfx('zap');
    L.lampUntil[i] = clock.current + 4;
    for (let k = 0; k < 6; k++) spawn('spark', LAMPS[i].x + 0.5, GROUND - 31, { life: rnd(0.4, 0.8), vx: rnd(-10, 10), vy: rnd(-10, 4), c: '#fff1b8' });
    say(`lamp${i}`, LAMPS[i].x, GROUND - 42, night ? 'Que luz bonita! 💡' : 'Plim! A luz acendeu! 💡', 2.4);
    discover('lampada');
  };

  const tapSparrow = (s: { x: number; y: number }) => {
    if (!guard()) return;
    const L = life.current;
    sfx('chirp');
    // O passarinho tocado e os vizinhos voam juntos e voltam depois.
    for (const o of L.sparrows)
      if (clock.current >= o.away && Math.abs(o.x - s.x) < 30) {
        o.away = clock.current + rnd(5, 9);
        ambient.current.flocks.push({ id: uid(), x: o.x, y: o.y - 2, vx: pick([-1, 1]) * rnd(26, 38), vy: -rnd(10, 18), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
    say('fio', s.x, s.y - 4, pick(['Piu piu! 🐦', 'Os passarinhos voaram! 🐦']), 2);
    discover('passarinhos');
  };

  const tapWindow = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    sfx('creak');
    L.windowUntil[i] = clock.current + 4.5;
    L.windowWho[i] = randomLook();
    say(`jan${i}`, UP_WIN[i] + 4, 42, pick([`${byGender('Bem-vindo', 'Bem-vinda')} ao museu! 👋`, 'Oi! Vem conhecer! 😊', 'Aqui tem muita história! 📜']), 3);
    discover('janela');
  };

  const tapSign = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('zap');
    L.signUntil = clock.current + 2;
    for (let i = 0; i < 6; i++) spawn('spark', LOGO.x + rnd(-6, 6), LOGO.y + rnd(-2, 14), { life: rnd(0.4, 0.8), vx: rnd(-8, 8), vy: rnd(-8, 2), c: pick([TEAL, ORANGE, '#ffffff']) });
    say('placa', LOGO.x, LOGO.y - 4, pick(SIGN_LINES), 3);
    discover('placa');
  };

  const tapGate = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('creak');
    L.gate.until = clock.current + 2.2;
    say('portao', (GATE.x0 + GATE.x1) / 2, GATE.y0 - 8, pick(['Nheeec! 🌸', 'Um portão de flores de ferro! 🌸', 'Pode subir a escada! 😊']), 2.4);
    discover('portao');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    w.say = pick(night ? LINES_NIGHT : LINES_DAY);
    w.sayUntil = clock.current + 2.8;
    w.wait = Math.max(w.wait, 2.4);
    discover('gente');
  };

  const tapCar = (x: number, y: number, id: string) => {
    if (!guard()) return;
    sfx('honk');
    say(id, x, y, pick(['Bi-bi! 🚗', 'Fom-fom! 🚙']), 1.8);
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-14, 14), top + rnd(-6, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(GROUND + 2, CURB) });
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

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (pt && pt.y > GROUND) spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  const lampOn = (i: number) => night || t < L.lampUntil[i];
  const signGlow = t < L.signUntil;
  const logoS = signGlow ? Math.cos((L.signUntil - t) * 9) : 1;

  const wire = (low: number) => {
    let d = '';
    for (let x = -EDGE - 20; x <= W + EDGE + 20; x++) d += `M${x} ${Math.round(wireY(x, low))}h1v1h-1z`;
    return d;
  };

  // Profundidade na calçada: quem está mais embaixo é desenhado por cima.
  const entities: { key: string; y: number; node: ReactNode }[] = [
    ...LAMPS.map((l, i) => ({
      key: `l${i}`,
      y: GROUND + 3,
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapLamp(i);
          }}
        >
          <rect x={l.x - 5} y={GROUND - 40} width={11} height={44} fill="transparent" />
          <Lamp x={l.x} on={lampOn(i)} />
        </g>
      ),
    })),
    ...TREES.map((tr) => ({ key: `t${tr.x}`, y: GROUND + 3, node: <StreetTree x={tr.x} s={tr.s} shaking={shaking === `t${tr.x}`} onTap={tapTree} /> })),
    ...L.walkers.map((w) => ({
      key: `w${w.id}`,
      y: w.y,
      node: (
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
  ].sort((a, b) => a.y - b.y);

  const bubbles = [...live(t), ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: w.y - 18, text: w.say! }))];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <radialGradient id="mu-glow">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mu-teal">
            <stop offset="0" stopColor="#7fe8e2" stopOpacity="0.7" />
            <stop offset="1" stopColor="#7fe8e2" stopOpacity="0" />
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
        <Haze time={time} ground={bd.ground} />
        <g transform={view.layer(DEPTH.near)}>
          <NearHills time={time} bd={bd} />
        </g>
        <g transform={view.layer(DEPTH.mid)}>
          <Neighbors night={night} />
        </g>
        <Street />

        {/* O casarão */}
        <Veranda night={night} />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapTurbine();
          }}
          role="button"
          aria-label="Turbina"
        >
          <rect x={80} y={70} width={34} height={GROUND - 74} fill="transparent" />
          <Turbine a={L.spin} fast={t < L.spinUntil} />
        </g>
        <Facade night={night} />
        {UP_WIN.map((x, i) => {
          const open = t < L.windowUntil[i];
          return (
            <g
              key={x}
              className="cw-tap"
              onClick={(e) => {
                e.stopPropagation();
                tapWindow(i);
              }}
            >
              <rect x={x - 2} y={40} width={12} height={24} fill={INK} />
              <rect x={x - 1} y={41} width={10} height={22} fill={WHITE} />
              <rect x={x} y={42} width={8} height={5} fill={night ? '#ffd76a' : '#7fb8d6'} />
              <rect x={x} y={42} width={1} height={1} fill={WHITE} />
              <rect x={x + 7} y={42} width={1} height={1} fill={WHITE} />
              {open ? (
                <g>
                  <rect x={x} y={47} width={8} height={15} fill={night ? '#a8742e' : '#4a3328'} />
                  <svg x={x} y={47} width={8} height={15} viewBox={`${x} 47 8 15`} overflow="hidden">
                    <Character x={x + 4} y={66} config={L.windowWho[i]} frame={Math.sin(t * 10) > 0 ? 1 : 2} />
                  </svg>
                  <rect x={x - 3} y={47} width={2} height={15} fill="#f4f1e6" />
                  <rect x={x + 9} y={47} width={2} height={15} fill="#f4f1e6" />
                </g>
              ) : (
                <g>
                  <rect x={x} y={47} width={8} height={15} fill="#f4f1e6" />
                  {Array.from({ length: 7 }, (_, k) => (
                    <rect key={k} x={x} y={48 + k * 2} width={8} height={1} fill={WHITE_SH} />
                  ))}
                  <rect x={x + 4} y={47} width={1} height={15} fill="#c9c2ae" />
                </g>
              )}
            </g>
          );
        })}
        <Balcony x0={BAY.x0 + 3} x1={BAY.x1 - 3} />
        <Balcony x0={UP_WIN[2] - 3} x1={UP_WIN[2] + 11} />
        <VerandaRail />
        {/* Placa do museu no alpendre */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapSign();
          }}
          role="button"
          aria-label="Placa do Museu Energisa"
        >
          <rect x={88} y={36} width={35} height={20} fill="transparent" />
          {(night || signGlow) && <circle cx={LOGO.x + 0.5} cy={LOGO.y + 3} r={10} fill="url(#mu-teal)" pointerEvents="none" />}
          <g transform={`translate(${LOGO.x + 0.5} 0) scale(${logoS.toFixed(2)} 1) translate(${-LOGO.x - 0.5} 0)`}>
            <rect x={LOGO.x - 3} y={LOGO.y - 2} width={7} height={1} fill={TEAL} />
            <rect x={LOGO.x - 4} y={LOGO.y - 1} width={1} height={3} fill={TEAL} />
            <rect x={LOGO.x + 4} y={LOGO.y - 1} width={1} height={2} fill="#8a9aa3" />
            <rect x={LOGO.x - 3} y={LOGO.y + 2} width={7} height={1} fill={ORANGE} />
            <rect x={LOGO.x + 4} y={LOGO.y + 1} width={1} height={1} fill={ORANGE} />
          </g>
          <PixelText text="MUSEU" x={97} y={45} fill={TEAL} />
          <PixelText text="ENERGISA" x={90} y={51} fill={TEAL} />
        </g>
        <Stairs />
        <GatePillars />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapGate();
          }}
          role="button"
          aria-label="Portão de ferro"
        >
          <rect x={GATE.x0} y={GATE.y0 - 3} width={GATE.x1 - GATE.x0} height={GROUND - GATE.y0 + 3} fill="transparent" />
          <Gate open={L.gate.open} />
        </g>

        {/* Postes, fios e passarinhos */}
        {POLES.map((x) => (
          <Pole key={x} x={x} />
        ))}
        <path d={wire(0)} fill={INK} opacity={0.85} pointerEvents="none" />
        <path d={wire(3)} fill={INK} opacity={0.6} pointerEvents="none" />
        {L.pulses.map((t0) => {
          const x = POLES[0] + ((t - t0) / 1.4) * (POLES[1] - POLES[0] + 60);
          return <circle key={t0} cx={x} cy={wireY(x)} r={3} fill="url(#mu-glow)" pointerEvents="none" />;
        })}
        {L.sparrows
          .filter((s) => t >= s.away)
          .map((s) => (
            <g
              key={s.id}
              className="cw-tap"
              onClick={(e) => {
                e.stopPropagation();
                tapSparrow(s);
              }}
            >
              <g transform={`translate(${s.x.toFixed(2)} ${(s.y - 5).toFixed(2)}) scale(${s.face} 1) translate(-3 0)`}>
                <rect x={-3} y={-3} width={12} height={10} fill="transparent" />
                <Pixels runs={sparrowSit} />
              </g>
            </g>
          ))}

        {entities.map((e) => (
          <g key={e.key}>{e.node}</g>
        ))}

        {/* Carro branco estacionado (como na frente do museu) e os carros que passam */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapCar(268, CURB - 2, 'wagon');
          }}
        >
          <g transform={`translate(258 ${CURB - 1})`}>
            <Pixels runs={wagonRuns} />
          </g>
        </g>
        {L.cars.map((c) => (
          <g
            key={c.id}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapCar(c.x, ROAD_Y - 12, `car${c.id}`);
            }}
          >
            <g transform={`translate(${c.x.toFixed(2)} ${ROAD_Y - 10}) scale(${c.dir} 1) translate(-10 0)`}>
              <Pixels runs={c.runs} />
            </g>
          </g>
        ))}

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <g transform={view.layer(DEPTH.near)}>
            <TownLights bd={bd} />
          </g>
        )}
        <g pointerEvents="none">
          {LAMPS.map((l, i) =>
            lampOn(i) ? (
              <g key={i}>
                <circle className="cw-glow" cx={l.x + 0.5} cy={GROUND - 31} r={night ? 16 : 10} fill="url(#mu-glow)" style={{ animationDuration: `${2 + i * 0.7}s` }} />
                {night && <ellipse cx={l.x + 0.5} cy={GROUND + 4} rx={12} ry={3} fill="#ffe9a8" opacity={0.18} />}
              </g>
            ) : null,
          )}
          {night && (
            <>
              <circle cx={DOOR.x + 5.5} cy={DOOR.y + 4} r={9} fill="url(#mu-glow)" opacity={0.6} />
              {UP_WIN.map((x) => (
                <circle key={x} cx={x + 4} cy={44} r={6} fill="url(#mu-glow)" opacity={0.5} />
              ))}
            </>
          )}
        </g>
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
        firstTip="Toque na turbina, nas janelas e nos postes para descobrir! 👆"
        dragText="👈 Arraste para ver o museu todo 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
