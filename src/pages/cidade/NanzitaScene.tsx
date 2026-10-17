import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, type DayTime } from '../../components/Scene';
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
 * Visita ao Memorial Nanzita (a antiga residência Ottoni Alvim Gomes, hoje Sicoob): casa moderna
 * de dois andares. Em cima, a fileira comprida de janelas de vidro com cortinas verdes e rosadas,
 * debaixo da laje fina com o brise de lâminas; embaixo, o térreo recuado com os pilares em V e o
 * grande painel colorido de azulejos (a moça com o cesto de frutas na cabeça, o burrinho, o galo
 * e as plantas). Na frente, o canteiro de bromélias, a grade de tela preta, a calçada, a rua de
 * pedra e os trilhos onde o trem passa. O passarinho do painel sai voando e o burrinho zurra.
 */

const CX = 168;
const GROUND = 76;
const B = { x0: 58, x1: 274 };
const ROOF = { y: 14, h: 3 };
const BAYS = 10;
const BAY_W = (B.x1 - B.x0) / BAYS;
const WIN = { top: 28, bottom: 38 };
const MURAL = { x0: 130, x1: 236, y0: 50, y1: 75 };
const FENCE = { top: 74, base: 86 };
const RAIL = 103;
const BROMELIAS = [134, 144, 156, 168, 180, 192, 204, 216, 228];
const CURTAIN = ['#6fb5a5', '#d9a7a0', '#6fb5a5', '#6fb5a5', '#d9a7a0', '#6fb5a5', '#d9a7a0', '#6fb5a5', '#6fb5a5', '#d9a7a0'];
const BIRD_HOME: [number, number] = [163, 55];
const TREE_SPOT: [number, number] = [300, 30];
const BEIGE = '#cfc8ae';
const WALL_LO = '#5a5a52';

const DISCOVERIES: Discovery[] = [
  { key: 'painel', emoji: '🎨', label: 'O painel colorido', tip: 'Toque na moça do cesto, lá no painel! 🎨' },
  { key: 'burro', emoji: '🐴', label: 'O burrinho do painel', tip: 'Tem um burrinho no painel. Toque nele! 🐴' },
  { key: 'passaro', emoji: '🐓', label: 'O galo que voa', tip: 'Toque no galo do painel! 🐓' },
  { key: 'janelas', emoji: '🪟', label: 'As janelas compridas', tip: 'Toque nas janelas lá de cima! 🪟' },
  { key: 'trem', emoji: '🚂', label: 'O trem na rua', tip: 'Toque nos trilhos para o trem passar! 🚂' },
  { key: 'arvore', emoji: '🌳', label: 'As árvores da calçada', tip: 'Toque nas árvores! 🌳' },
  { key: 'plantas', emoji: '🌺', label: 'As bromélias do canteiro', tip: 'Toque nas plantas do canteiro! 🌺' },
  { key: 'gente', emoji: '👋', label: 'Quem passa na calçada', tip: 'Dê um oi pra quem passa na calçada! 👋' },
];

const LINES_DAY = ['Oi! 👋', 'Que painel bonito! 🎨', 'Olha o burrinho! 🐴', 'Que dia bonito! ☀️', 'Lá vem o trem? 🚂'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Olha os vagalumes! ✨', 'As janelas acesas! 🪟'];
const FRUIT = ['#d64545', '#f2b705', '#e8772e', '#8cc63f'];

/* ---- Sprites ---- */

const roosterRuns = sprite(['..r..', '.rrr.', 'rrwrr', '.oooy', 'oooo.', '.o.o.'], { r: '#c8262b', w: '#ffffff', o: '#d0603a', y: '#f2c200' });

/* ---- Casa ---- */

/** Laje fina de cima com o brise de lâminas, a caixa d'água e a parede de tijolo do lado. */
const Shell = memo(function Shell() {
  const slats: ReactNode[] = [];
  for (let x = B.x0 - 6; x < B.x1 + 6; x += 3) slats.push(<path key={x} d={`M${x} ${ROOF.y + ROOF.h}L${x + 2} ${ROOF.y + ROOF.h}L${x + 4} ${ROOF.y + ROOF.h + 4}L${x + 2} ${ROOF.y + ROOF.h + 4}Z`} fill="#efe9d6" />);
  const bricks: ReactNode[] = [];
  for (let y = ROOF.y + 2; y < GROUND; y += 2) bricks.push(<rect key={y} x={B.x1} y={y} width={11} height={0.5} fill="#a8623a" />);
  return (
    <g>
      {/* Caixa d'água em cima */}
      <rect x={149} y={6} width={11} height={9} fill={INK} />
      <rect x={150} y={7} width={9} height={8} fill="#b9c0c4" />
      {[9, 12].map((y) => (
        <rect key={y} x={150} y={y} width={9} height={1} fill="#8d969c" />
      ))}
      <rect x={151} y={7} width={2} height={8} fill="#dfe4e6" />
      {/* Parede de tijolo do lado direito */}
      <rect x={B.x1 - 1} y={ROOF.y + 1} width={13} height={GROUND - ROOF.y - 1} fill={INK} />
      <rect x={B.x1} y={ROOF.y + 2} width={11} height={GROUND - ROOF.y - 2} fill="#c27a4a" />
      {bricks}
      {/* Laje com a beirada clara e o brise por baixo */}
      <rect x={B.x0 - 9} y={ROOF.y - 1} width={B.x1 - B.x0 + 18} height={ROOF.h + 2} fill={INK} />
      <rect x={B.x0 - 8} y={ROOF.y} width={B.x1 - B.x0 + 16} height={ROOF.h} fill={BEIGE} />
      <rect x={B.x0 - 8} y={ROOF.y} width={B.x1 - B.x0 + 16} height={1} fill="#e4dec6" />
      <rect x={B.x0 - 6} y={ROOF.y + ROOF.h} width={B.x1 - B.x0 + 12} height={4} fill="#a8a08a" />
      {slats}
    </g>
  );
});

/** Andar de cima: a fileira de basculantes, as janelas grandes com cortina e os painéis de vidro opaco. */
function Upper({ open, who, t, night }: { open: number[]; who: AvatarConfig[]; t: number; night: boolean }) {
  const glass = night ? '#ffd76a' : '#9fc4c8';
  return (
    <g>
      <rect x={B.x0 - 1} y={ROOF.y + ROOF.h + 4} width={B.x1 - B.x0 + 2} height={48 - ROOF.y - ROOF.h - 4} fill={INK} />
      {Array.from({ length: BAYS }, (_, i) => {
        const x = B.x0 + i * BAY_W;
        const w = BAY_W - 1;
        const k = open[i];
        const half = (w / 2) * (1 - k * 0.8);
        return (
          <g key={i}>
            {/* Basculante de cima */}
            <rect x={x + 1} y={22} width={w - 1} height={5} fill="#f4f1de" />
            <rect x={x + 2} y={23} width={w - 3} height={3} fill={glass} opacity={0.85} />
            {/* Janela grande: por trás, a sala; a cortina abre para os lados */}
            <rect x={x + 1} y={WIN.top} width={w - 1} height={WIN.bottom - WIN.top} fill="#f4f1de" />
            <rect x={x + 2} y={WIN.top + 1} width={w - 3} height={WIN.bottom - WIN.top - 2} fill={night ? '#f3d68a' : '#efe2c4'} />
            {k > 0.3 && (
              <svg x={x + 2} y={WIN.top + 1} width={w - 3} height={WIN.bottom - WIN.top - 2} viewBox={`${x + 2} ${WIN.top + 1} ${w - 3} ${WIN.bottom - WIN.top - 2}`} overflow="hidden">
                <Character x={x + w / 2 + 0.5} y={WIN.bottom + 6} config={who[i]} frame={Math.sin(t * 10) > 0 ? 1 : 2} />
              </svg>
            )}
            <rect x={x + 2} y={WIN.top + 1} width={half} height={WIN.bottom - WIN.top - 2} fill={CURTAIN[i]} />
            <rect x={x + w - 1 - half} y={WIN.top + 1} width={half} height={WIN.bottom - WIN.top - 2} fill={CURTAIN[i]} />
            {Array.from({ length: Math.floor(half / 2) }, (_, f) => (
              <g key={f} opacity={0.25} fill="#000">
                <rect x={x + 3 + f * 2} y={WIN.top + 1} width={0.6} height={WIN.bottom - WIN.top - 2} />
                <rect x={x + w - 2 - f * 2} y={WIN.top + 1} width={0.6} height={WIN.bottom - WIN.top - 2} />
              </g>
            ))}
            <rect x={x + 2} y={WIN.top + 1} width={w - 3} height={1} fill="#ffffff" opacity={0.35} />
            {/* Painel de vidro opaco embaixo da janela */}
            <rect x={x + 1} y={39} width={w - 1} height={5} fill="#f4f1de" />
            <rect x={x + 2} y={40} width={w - 3} height={3} fill="#dfe6dc" />
          </g>
        );
      })}
      {/* Faixa da laje do meio */}
      <rect x={B.x0 - 2} y={44} width={B.x1 - B.x0 + 3} height={5} fill={INK} />
      <rect x={B.x0 - 1} y={45} width={B.x1 - B.x0 + 1} height={3} fill={BEIGE} />
      <rect x={B.x0 - 1} y={45} width={B.x1 - B.x0 + 1} height={1} fill="#e4dec6" />
    </g>
  );
}

/** Térreo recuado: garagem escura, pilares em V e o muro de pedra. */
const Ground = memo(function Ground({ night }: { night: boolean }) {
  const stones = useMemo(() => {
    const rand = seeded(71);
    return Array.from({ length: 34 }, () => ({ x: 237 + rand() * 33, y: 49 + rand() * 26, w: 2 + rand() * 4, h: 1.5 + rand() * 2, c: rand() > 0.5 ? '#787b74' : '#4a4d48' }));
  }, []);
  const leg = (xt: number, xb: number) => `M${xt} 48L${xt + 5} 48L${xb + 2.5} ${GROUND}L${xb - 2.5} ${GROUND}Z`;
  return (
    <g>
      <rect x={B.x0} y={48} width={B.x1 - B.x0} height={GROUND - 48} fill={WALL_LO} />
      {/* Garagem com portão de tela */}
      <rect x={B.x0 + 2} y={51} width={70} height={GROUND - 51} fill="#3d4549" />
      {Array.from({ length: 23 }, (_, i) => (
        <rect key={i} x={B.x0 + 3 + i * 3} y={51} width={1} height={GROUND - 51} fill="#555f63" />
      ))}
      {/* Pilares em V */}
      {[
        [64, 80],
        [92, 80],
      ].map(([xt, xb]) => (
        <g key={xt}>
          <path d={leg(xt, xb)} fill={INK} transform="translate(-0.6 0)" />
          <path d={leg(xt, xb)} fill="#e9e6dc" />
        </g>
      ))}
      {/* Porta de vidro escura */}
      <rect x={112} y={52} width={16} height={GROUND - 52} fill={night ? '#c9a95a' : '#2f3a3e'} />
      <rect x={119.5} y={52} width={1} height={GROUND - 52} fill="#8d969c" />
      {/* Muro de pedra à direita */}
      <rect x={237} y={48} width={B.x1 - 237} height={GROUND - 48} fill="#5f625c" />
      {stones.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={Math.min(s.w, B.x1 - s.x)} height={s.h} fill={s.c} />
      ))}
      {/* Sombra da laje */}
      <rect x={B.x0} y={48} width={B.x1 - B.x0} height={3} fill="#000" opacity={0.3} />
    </g>
  );
});

/** Painel de azulejos: a moça com o cesto, o jarro, o galo, o burrinho e as plantas. */
function Mural({ t, nod, birdHome, basket }: { t: number; nod: number; birdHome: boolean; basket: number }) {
  const { x0, x1, y0, y1 } = MURAL;
  const blocks: [number, number, number, number, string][] = [
    [x0, y0, 22, y1 - y0, '#e3cf9a'],
    [x0 + 22, y0, 18, 12, '#d9c48c'],
    [x0 + 22, y0 + 12, 18, 13, '#cdbb86'],
    [x0 + 40, y0, 34, 9, '#e8dcb0'],
    [x0 + 40, y0 + 9, 34, 16, '#d8c590'],
    [x0 + 74, y0, 32, 13, '#b9c4a6'],
    [x0 + 74, y0 + 13, 32, 12, '#e3cf9a'],
  ];
  const tiles: ReactNode[] = [];
  for (let x = x0 + 4; x < x1; x += 4) tiles.push(<rect key={`x${x}`} x={x} y={y0} width={0.4} height={y1 - y0} fill="#8a7a5a" opacity={0.3} />);
  for (let y = y0 + 4; y < y1; y += 4) tiles.push(<rect key={`y${y}`} x={x0} y={y} width={x1 - x0} height={0.4} fill="#8a7a5a" opacity={0.3} />);
  const wob = Math.sin(t * 30) * basket;
  return (
    <g>
      <rect x={x0 - 1} y={y0 - 1} width={x1 - x0 + 2} height={y1 - y0 + 1} fill="#8a7a5a" />
      {blocks.map(([x, y, w, h, c], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={c} />
      ))}
      {tiles}
      {/* Jarro vermelho */}
      <path d={`M${x0 + 3} ${y1 - 1}L${x0 + 2} ${y1 - 6}L${x0 + 4} ${y1 - 9}L${x0 + 7} ${y1 - 9}L${x0 + 9} ${y1 - 6}L${x0 + 8} ${y1 - 1}Z`} fill="#b5523b" />
      <rect x={x0 + 4} y={y1 - 11} width={3} height={2} fill="#8a3a2a" />
      {/* Moça com o cesto de frutas na cabeça */}
      <path d={`M${x0 + 12} ${y0 + 10}L${x0 + 20} ${y0 + 10}L${x0 + 23} ${y1}L${x0 + 9} ${y1}Z`} fill="#c9a052" />
      {[3, 6, 9].map((d) => (
        <rect key={d} x={x0 + 10} y={y0 + 10 + d * 1.5} width={12 + d * 0.3} height={0.6} fill="#a57f38" />
      ))}
      <rect x={x0 + 11} y={y0 + 2} width={1.4} height={8} fill="#c9a27a" />
      <rect x={x0 + 19.6} y={y0 + 2} width={1.4} height={8} fill="#c9a27a" />
      <ellipse cx={x0 + 16} cy={y0 + 7} rx={2.6} ry={3} fill="#c9a27a" />
      <rect x={x0 + 13.6} y={y0 + 3.6} width={4.8} height={1.6} fill="#3a2a1e" />
      <rect x={x0 + 15} y={y0 + 7} width={0.8} height={0.8} fill="#3a2a1e" />
      <g transform={`rotate(${wob.toFixed(2)} ${x0 + 16} ${y0 + 3})`}>
        <rect x={x0 + 10} y={y0 + 1} width={12} height={3} fill="#8a5a2b" />
        <rect x={x0 + 10} y={y0 + 2} width={12} height={0.6} fill="#6b4423" />
        {FRUIT.map((c, i) => (
          <circle key={c} cx={x0 + 12 + i * 2.7} cy={y0 + 0.6} r={1.3} fill={c} />
        ))}
      </g>
      {/* Galo (quando ele sai voando, fica só o contorno) */}
      {birdHome ? (
        <g transform={`translate(${BIRD_HOME[0] - 3.5} ${BIRD_HOME[1] - 4})`}>
          <Pixels runs={roosterRuns} />
        </g>
      ) : (
        <ellipse cx={BIRD_HOME[0]} cy={BIRD_HOME[1]} rx={3} ry={2.5} fill="none" stroke="#a89277" strokeWidth={0.5} strokeDasharray="1 1" />
      )}
      {/* Burrinho com a carga nas costas; a cabeça balança quando zurra */}
      <g>
        <rect x={172} y={61} width={26} height={6} fill="#a89277" />
        <rect x={172} y={66} width={26} height={1} fill="#8a7660" />
        <rect x={180} y={58} width={10} height={4} fill="#8a5a2b" />
        <rect x={181} y={57} width={8} height={1} fill="#6b4423" />
        {[174, 178, 192, 196].map((x) => (
          <rect key={x} x={x} y={67} width={1.6} height={8} fill="#8a7660" />
        ))}
        <path d="M198 62L201 69L200 69L197 64Z" fill="#6b5a48" />
        <g transform={`rotate(${nod.toFixed(2)} 175 62)`}>
          <path d="M172 62L168 55L172 54L176 61Z" fill="#a89277" />
          <rect x={164} y={53} width={7} height={4} fill="#a89277" />
          <rect x={164} y={56} width={3} height={1.4} fill="#8a7660" />
          <rect x={169} y={49} width={1.2} height={4} fill="#a89277" />
          <rect x={171} y={49.5} width={1.2} height={4} fill="#a89277" />
          <rect x={167} y={54} width={0.9} height={0.9} fill="#3a2a1e" />
        </g>
      </g>
      {/* Plantas: folhagem alta, abacaxi e a flor redonda amarela */}
      <rect x={213} y={52} width={1} height={23} fill="#6a8a4a" />
      {[54, 58, 62, 66, 70].map((y, i) => (
        <g key={y} fill={i % 2 ? '#7a9a5a' : '#8aa86a'}>
          <path d={`M213.5 ${y}L${206 + i} ${y - 3}L${207 + i} ${y + 1}Z`} />
          <path d={`M213.5 ${y}L${221 - i} ${y - 3}L${220 - i} ${y + 1}Z`} />
        </g>
      ))}
      <ellipse cx={204} cy={71} rx={2.6} ry={3.4} fill="#d9a441" />
      <path d="M202 68L204 63L206 68Z" fill="#6a8a4a" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={202.6 + i * 1.2} y={69 + (i % 2)} width={0.6} height={0.6} fill="#a57f38" />
      ))}
      <circle cx={228} cy={56} r={4} fill="#e3b341" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <rect key={i} x={228 + Math.cos(a) * 5 - 0.4} y={56 + Math.sin(a) * 5 - 0.4} width={0.8} height={0.8} fill="#c98a2a" />;
      })}
      <rect x={227.5} y={60} width={1} height={15} fill="#6a8a4a" />
    </g>
  );
}

/** Bromélia: folhas pontudas verde-escuras com a flor vermelha no meio. */
const Bromelia = memo(function Bromelia({ x, s, shaking }: { x: number; s: number; shaking: boolean }) {
  const y = GROUND + 3;
  const leaves = [-70, -45, -20, 0, 20, 45, 70].map((a, i) => {
    const r = (a * Math.PI) / 180;
    const len = (i % 2 ? 6 : 8) * s;
    return { x2: x + Math.sin(r) * len, y2: y - Math.cos(r) * len * 0.8 };
  });
  return (
    <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '3.4s', '--a': '1.5deg' } as CSSProperties}>
      {leaves.map((l, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={l.x2} y2={l.y2} stroke="#1f4a2a" strokeWidth={2 * s} strokeLinecap="round" />
          <line x1={x} y1={y} x2={l.x2} y2={l.y2} stroke="#3f7a3a" strokeWidth={1.1 * s} strokeLinecap="round" />
        </g>
      ))}
      <rect x={x - 1} y={y - 5 * s} width={2} height={3 * s} fill="#d64545" />
      <rect x={x - 0.5} y={y - 6 * s} width={1} height={1} fill="#f2b705" />
    </g>
  );
});

/** Pátio, calçada, rua de pedra, os trilhos com brita e o gramado lá na frente. */
const Street = memo(function Street({ night }: { night: boolean }) {
  const cobbles = useMemo(() => {
    const rand = seeded(83);
    return Array.from({ length: 260 }, () => ({ x: FULL.x + 200 + rand() * (W + 340), y: 93.5 + Math.floor(rand() * 6), c: rand() > 0.5 ? '#b3b0a6' : '#7d7b74' }));
  }, []);
  const gravel = useMemo(() => {
    const rand = seeded(89);
    return Array.from({ length: 220 }, () => ({ x: FULL.x + 200 + rand() * (W + 340), y: 100 + rand() * 8, c: rand() > 0.5 ? '#a49d90' : '#6f6a62' }));
  }, []);
  return (
    <g>
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={FENCE.base - GROUND} fill={night ? '#7d7b72' : '#bdb9ab'} />
      {/* Canteiro de terra embaixo do painel */}
      <rect x={MURAL.x0 - 2} y={GROUND} width={MURAL.x1 - MURAL.x0 + 4} height={4} fill="#6b5a3e" />
      <rect x={FULL.x} y={FENCE.base} width={FULL.w} height={6} fill="#d6d2c4" />
      <rect x={FULL.x} y={92} width={FULL.w} height={1} fill="#a8a294" />
      <rect x={FULL.x} y={93} width={FULL.w} height={7} fill="#94918a" />
      {cobbles.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={2} height={1} fill={c.c} />
      ))}
      <rect x={FULL.x} y={100} width={FULL.w} height={9} fill="#8f8a80" />
      {gravel.map((g, i) => (
        <rect key={i} x={g.x} y={g.y} width={1} height={1} fill={g.c} />
      ))}
      {Array.from({ length: 220 }, (_, i) => (
        <rect key={`d${i}`} x={FULL.x + i * 5} y={RAIL} width={3} height={2} fill="#6b4423" />
      ))}
      <rect x={FULL.x} y={RAIL - 1} width={FULL.w} height={1} fill="#c9ced1" />
      <rect x={FULL.x} y={RAIL} width={FULL.w} height={1} fill="#5f6d76" />
      <rect x={FULL.x} y={109} width={FULL.w} height={GROUND_END - 109} fill={night ? '#2c5a32' : '#5f9c3a'} />
    </g>
  );
});

/** Grade de tela preta na frente do pátio. */
const Fence = memo(function Fence() {
  const x0 = 30;
  const x1 = 300;
  const mesh: ReactNode[] = [];
  for (let x = x0; x < x1; x += 2) mesh.push(<rect key={`v${x}`} x={x} y={FENCE.top} width={0.4} height={FENCE.base - FENCE.top} fill="#2b2f33" opacity={0.45} />);
  for (let y = FENCE.top + 2; y < FENCE.base; y += 2) mesh.push(<rect key={`h${y}`} x={x0} y={y} width={x1 - x0} height={0.4} fill="#2b2f33" opacity={0.45} />);
  return (
    <g pointerEvents="none">
      {mesh}
      <rect x={x0} y={FENCE.top} width={x1 - x0} height={1} fill="#1f2326" />
      <rect x={x0} y={FENCE.base - 1} width={x1 - x0} height={1} fill="#1f2326" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={x0 + i * 30} y={FENCE.top - 1} width={1.4} height={FENCE.base - FENCE.top + 1} fill="#1f2326" />
      ))}
    </g>
  );
});

/** Trem de carga: locomotiva azul com faixa laranja e dois vagões. */
function Train({ x, t }: { x: number; t: number }) {
  const wheelY = RAIL - 1.5;
  const wheels = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy={wheelY} r={2} fill={INK} />
      <circle cx={cx} cy={wheelY} r={0.8} fill="#8d969c" />
      <rect x={cx - 0.4 + Math.cos(t * 12) * 1.1} y={wheelY - 0.4 + Math.sin(t * 12) * 1.1} width={0.8} height={0.8} fill="#c9ced1" />
    </g>
  );
  const car = (cx: number) => (
    <g key={`c${cx}`}>
      <rect x={cx - 1} y={86} width={40} height={14} fill={INK} />
      <rect x={cx} y={87} width={38} height={12} fill="#8a4a2a" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={cx + 2 + i * 4} y={87} width={1} height={12} fill="#6b3a20" />
      ))}
      <rect x={cx} y={87} width={38} height={1} fill="#a8623a" />
      {wheels(cx + 6)}
      {wheels(cx + 11)}
      {wheels(cx + 27)}
      {wheels(cx + 32)}
    </g>
  );
  return (
    <g>
      {/* Locomotiva (vai para a esquerda: a cabine fica na frente) */}
      <rect x={x - 1} y={84} width={38} height={16} fill={INK} />
      <rect x={x} y={85} width={36} height={14} fill="#2f5fb3" />
      <rect x={x} y={92} width={36} height={3} fill="#e8772e" />
      <rect x={x + 2} y={86} width={8} height={5} fill="#bfe9f2" />
      <rect x={x + 12} y={86} width={22} height={2} fill="#244a8a" />
      <rect x={x - 1} y={95} width={3} height={2} fill="#ffe27a" />
      <rect x={x + 26} y={82} width={4} height={3} fill={INK} />
      {wheels(x + 6)}
      {wheels(x + 12)}
      {wheels(x + 24)}
      {wheels(x + 30)}
      <rect x={x + 36} y={96} width={3} height={1} fill={INK} />
      {car(x + 39)}
      <rect x={x + 78} y={96} width={3} height={1} fill={INK} />
      {car(x + 81)}
    </g>
  );
}
const TRAIN_LEN = 122;

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

const AREA = { x0: -20, x1: W + 20, y0: 30, y1: 84 };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), y: Math.round(rnd(88, 91)), tx: rnd(20, W - 20), speed: rnd(8, 12), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(30, 90)), newWalker(rnd(210, 290)), newWalker()],
    curtain: Array.from({ length: BAYS }, () => ({ at: -10, until: -10 })),
    who: Array.from({ length: BAYS }, () => randomLook()),
    bird: { at: 'home' as 'home' | 'fly' | 'tree', t0: 0, back: 0, sx: BIRD_HOME[0], sy: BIRD_HOME[1], tx: BIRD_HOME[0], ty: BIRD_HOME[1] },
    nodUntil: 0,
    basketUntil: 0,
    train: { x: 0, on: false, next: rnd(25, 40) },
    timers: { leaf: rnd(1, 3), mote: 0 },
  };
}

const ramp = (t: number, at: number, until: number, secs: number) => (t > until ? 0 : Math.min(clamp((t - at) / secs, 0, 1), clamp((until - t) / secs, 0, 1)));

/* ---- Componente ---- */

export const NanzitaScene = memo(function NanzitaScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(GROUND - 6, 97, { blocks: 3 }), []);
  const cam = useCamera((vw) => (vw < 200 ? 186 : CX));
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);
  const [shaking, setShaking] = useState<string | null>(null);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

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

    // O galo volta para o painel depois de um tempo na árvore
    const b = L.bird;
    if (b.at === 'fly' && t - b.t0 > 1.6) Object.assign(b, { at: b.tx === BIRD_HOME[0] ? 'home' : 'tree', sx: b.tx, sy: b.ty, back: t + rnd(5, 8) });
    if (b.at === 'tree' && t > b.back) flyBird(...BIRD_HOME);

    // O trem passa sozinho de vez em quando (ou quando tocam nos trilhos)
    const tr = L.train;
    if (tr.on) {
      tr.x -= 70 * dt;
      if (Math.random() < dt * 5) spawn('puff', tr.x + 28, 80, { vx: rnd(4, 9), vy: -rnd(4, 8), life: rnd(1, 1.6), c: '#d9d9d2' });
      if (tr.x < -EDGE - TRAIN_LEN - 20) Object.assign(tr, { on: false, next: t + rnd(35, 55) });
    } else if (t > tr.next) startTrain();

    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      spawn('leaf', pick([20, 40, 290, 310]) + rnd(-10, 10), rnd(20, 45), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a']), floor: rnd(87, 92) });
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

  function startTrain() {
    const tr = life.current.train;
    if (tr.on) return false;
    Object.assign(tr, { on: true, x: W + EDGE + 10 });
    sfx('apito');
    setTimeout(() => sfx('bell'), 500);
    return true;
  }

  function flyBird(tx: number, ty: number) {
    const b = life.current.bird;
    const [sx, sy] = birdPos(clock.current);
    Object.assign(b, { at: 'fly', t0: clock.current, sx, sy, tx, ty });
  }

  function birdPos(t: number): [number, number] {
    const b = life.current.bird;
    if (b.at !== 'fly') return [b.sx, b.sy];
    const k = clamp((t - b.t0) / 1.6, 0, 1);
    return [b.sx + (b.tx - b.sx) * k, b.sy + (b.ty - b.sy) * k - Math.sin(Math.PI * k) * 18];
  }

  const tapWoman = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('pop');
    L.basketUntil = clock.current + 0.8;
    for (let i = 0; i < 5; i++) spawn('drop', MURAL.x0 + 12 + rnd(0, 8), MURAL.y0, { vx: rnd(-10, 10), vy: rnd(-18, -8), life: 1.6, c: pick(FRUIT), floor: GROUND + 2 });
    say('painel', MURAL.x0 + 16, MURAL.y0 - 3, pick(['Um painel de azulejos! 🎨', 'A moça leva frutas no cesto! 🍊', 'Que painel colorido! 🎨']), 3);
    discover('painel');
  };

  const tapPlantArt = () => {
    if (!guard()) return;
    sfx('rustle');
    say('folhas', 214, MURAL.y0 - 3, pick(['Tem plantas no painel também! 🌿', 'Olha o abacaxi! 🍍']), 2.6);
    discover('painel');
  };

  const tapDonkey = () => {
    if (!guard()) return;
    sfx('zurro');
    life.current.nodUntil = clock.current + 1.2;
    say('burro', 182, MURAL.y0 - 3, pick(['Ió! Ió! 🐴', 'O burrinho leva a carga! 🐴']), 2.6);
    discover('burro');
  };

  const tapBird = () => {
    if (!guard()) return;
    const b = life.current.bird;
    if (b.at === 'fly') return;
    sfx('chirp');
    setTimeout(() => sfx('chirp'), 200);
    const [x, y] = birdPos(clock.current);
    say('passaro', x, y - 7, b.at === 'home' ? 'Cocoricó! O galo saiu do painel! 🐓' : 'Cocoricó! Volta pro painel! 🐓', 2.8);
    if (b.at === 'home') flyBird(...TREE_SPOT);
    else flyBird(...BIRD_HOME);
    discover('passaro');
  };

  const tapWindow = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.curtain[i].until) return;
    sfx('rustle');
    L.curtain[i] = { at: t, until: t + 4.5 };
    L.who[i] = randomLook();
    say(`jan${i}`, B.x0 + (i + 0.5) * BAY_W, WIN.top - 3, pick(['Oi, lá embaixo! 👋', 'Que janela grande! 🪟', 'Daqui dá pra ver o trem! 🚂']), 3);
    discover('janelas');
  };

  const tapRails = () => {
    if (!guard()) return;
    if (startTrain()) say('trem', 160, 80, pick(['Piuí! Lá vem o trem! 🚂', 'O trem passa bem na rua! 🚂']), 3);
    discover('trem');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-14, 14), top + rnd(-6, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(87, 92) });
      if (Math.random() < 0.5) {
        setTimeout(() => sfx('chirp'), 120);
        ambient.current.flocks.push({ id: uid(), x, y: top, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapBromelia = (i: number) => {
    if (!guard()) return;
    const id = `b${i}`;
    setShaking(id);
    setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
    sfx('rustle');
    for (let k = 0; k < 4; k++) spawn('petal', BROMELIAS[i] + rnd(-2, 2), GROUND - 2, { vx: rnd(-6, 6), vy: -rnd(6, 12), life: rnd(1.4, 2), c: '#d64545', floor: GROUND + 4 });
    say(id, BROMELIAS[i], GROUND - 9, pick(['Uma bromélia! 🌺', 'Que flor vermelha! 🌺']), 2.4);
    discover('plantas');
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

  const open = L.curtain.map((c) => ramp(t, c.at, c.until, 0.6));
  const nod = t < L.nodUntil ? Math.sin(t * 14) * 12 : 0;
  const [birdX, birdY] = birdPos(t);
  const birdOut = L.bird.at !== 'home';

  const walkers = [...L.walkers].sort((a, b) => a.y - b.y);
  const bubbles = [...live(t), ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: w.y - 18, text: w.say! }))];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <radialGradient id="nz-glow">
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
        <Haze time={time} ground={bd.ground} />
        <g transform={view.layer(DEPTH.near)}>
          <NearHills time={time} bd={bd} />
        </g>

        <Street night={night} />
        {/* Árvores de trás do muro, dos dois lados */}
        <BigTree id="t0" x={-20} ground={GROUND} s={4.6} shaking={shaking === 't0'} onTap={tapTree} />
        <BigTree id="t3" x={346} ground={GROUND} s={4.4} shaking={shaking === 't3'} onTap={tapTree} />

        <Shell />
        <g>
          {Array.from({ length: BAYS }, (_, i) => (
            <rect
              key={i}
              className="cw-tap"
              x={B.x0 + i * BAY_W}
              y={21}
              width={BAY_W}
              height={23}
              fill="transparent"
              onClick={(e) => {
                e.stopPropagation();
                tapWindow(i);
              }}
            />
          ))}
        </g>
        <g pointerEvents="none">
          <Upper open={open} who={L.who} t={t} night={night} />
        </g>
        <Ground night={night} />
        <Mural t={t} nod={nod} birdHome={!birdOut} basket={t < L.basketUntil ? 6 : 0} />
        {/* Áreas de toque do painel */}
        <rect className="cw-tap" x={MURAL.x0 + 8} y={MURAL.y0 - 1} width={17} height={MURAL.y1 - MURAL.y0 + 1} fill="transparent" role="button" aria-label="Moça do painel" onClick={(e) => { e.stopPropagation(); tapWoman(); }} />
        <rect className="cw-tap" x={164} y={MURAL.y0 - 1} width={37} height={MURAL.y1 - MURAL.y0 + 1} fill="transparent" role="button" aria-label="Burrinho do painel" onClick={(e) => { e.stopPropagation(); tapDonkey(); }} />
        <rect className="cw-tap" x={201} y={MURAL.y0 - 1} width={MURAL.x1 - 201} height={MURAL.y1 - MURAL.y0 + 1} fill="transparent" onClick={(e) => { e.stopPropagation(); tapPlantArt(); }} />
        {BROMELIAS.map((x, i) => (
          <g
            key={x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapBromelia(i);
            }}
          >
            <rect x={x - 6} y={GROUND - 6} width={12} height={10} fill="transparent" />
            <Bromelia x={x} s={0.9 + (i % 3) * 0.12} shaking={shaking === `b${i}`} />
          </g>
        ))}

        <Fence />
        {/* Árvores da calçada, na frente da grade */}
        <BigTree id="t1" x={26} ground={90} s={4.2} shaking={shaking === 't1'} onTap={tapTree} />
        <BigTree id="t2" x={300} ground={90} s={3.8} shaking={shaking === 't2'} onTap={tapTree} />

        {walkers.map((w) => (
          <g
            key={w.id}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapWalker(w);
            }}
          >
            <Character x={w.x} y={w.y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
          </g>
        ))}

        {/* Trilhos (toque para o trem vir) e o trem */}
        <rect className="cw-tap" x={FULL.x} y={98} width={FULL.w} height={10} fill="transparent" role="button" aria-label="Trilhos do trem" onClick={(e) => { e.stopPropagation(); tapRails(); }} />
        {L.train.on && (
          <g pointerEvents="none">
            <Train x={L.train.x} t={t} />
          </g>
        )}

        {/* Galo voando (ou na árvore) */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapBird();
          }}
          role="button"
          aria-label="Galo do painel"
        >
          <rect x={birdX - 5} y={birdY - 6} width={10} height={10} fill="transparent" />
          {birdOut && (
            <g transform={`translate(${(birdX - 3.5).toFixed(2)} ${(birdY - 4).toFixed(2)})`}>
              <Pixels runs={roosterRuns} />
              {L.bird.at === 'fly' && <rect x={0} y={Math.sin(t * 30) > 0 ? 0 : 3} width={3} height={1} fill="#c8262b" />}
            </g>
          )}
        </g>

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <>
            <g transform={view.layer(DEPTH.near)}>
              <TownLights bd={bd} />
            </g>
            <g pointerEvents="none">
              {Array.from({ length: BAYS }, (_, i) => (
                <circle key={i} cx={B.x0 + (i + 0.5) * BAY_W} cy={33} r={10} fill="url(#nz-glow)" opacity={0.35} />
              ))}
              {[150, 183, 216].map((x) => (
                <circle key={x} cx={x} cy={60} r={14} fill="url(#nz-glow)" opacity={0.35} />
              ))}
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
        firstTip="Toque no painel, nas janelas e nos trilhos para descobrir! 👆"
        dragText="👈 Arraste para ver o memorial todo 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
