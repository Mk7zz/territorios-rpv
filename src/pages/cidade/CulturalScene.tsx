import { memo, useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { byGender } from '../../lib/personagem';
import type { AvatarConfig } from '../../lib/types';
import {
  clamp,
  FULL,
  INK,
  makeSpawner,
  ParticleLayer,
  pick,
  PixelText,
  rnd,
  SceneBox,
  SceneHud,
  sprite,
  stepParticles,
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
 * Visita ao Centro Cultural Humberto Mauro, vista de dentro (como se a criança estivesse lá):
 * o corredor da galeria em perspectiva, com quadros nas paredes brancas, spots no teto e piso de
 * madeira clara. Perto, à esquerda, o elevador vermelho (a caixa vermelha do saguão) e, à direita,
 * o balcão da recepção. No meio, o banco preto, o cartaz do espetáculo e um projetor de cinema
 * antigo em exposição (Humberto Mauro fez filmes aqui em Cataguases). Lá no fundo, a parede
 * vermelha com o nome do lugar e a porta larga do teatro: cadeiras vermelhas, palco de cortina
 * e a tela onde o projetor passa um filme em preto e branco.
 *
 * Tudo é desenhado em 3D simples: X para os lados, Y para baixo (0 = altura do olho) e Z para o
 * fundo; `px`/`py` levam um ponto para a tela.
 */

const VP = { x: 160, y: 56 };
const F = 64;
const px = (X: number, Z: number) => VP.x + (F * X) / Z;
const py = (Y: number, Z: number) => VP.y + (F * Y) / Z;
/** Meia largura da sala, teto e chão (em relação ao olho). */
const RW = 4;
const CEIL = -1.5;
const FLOOR = 1.25;
/** Parede do fundo (com a porta do teatro) e o fundo do teatro. */
const BACK = 4;
const DOOR = { x: 3.3, top: -0.75 };
const STAGE = { front: 6.0, back: 6.6, top: 0.6, half: 3 };
const CURTAIN = { half: 2.8, top: -1.1 };
const SCREEN = { half: 2.2, top: -1.05, bottom: 0.35 };
const SEAT_ROWS = [5.6, 5.0, 4.4];
const SEAT_X = Array.from({ length: 13 }, (_, i) => -3.5 + i * 0.56);
const LIFT = { x0: -RW, x1: -2.9, z0: 3.0, z1: 3.7, top: -1.2, door0: 3.15, door1: 3.55 };
const DESK = { x0: 2.3, x1: 3.7, z0: 2.3, z1: 2.8, top: 0.3 };
const PROJ = { x: 1.8, z: 3.4 };
const BANNER = { x0: 1.55, x1: 2.1, z: 2.45 };
const PAINTINGS = [
  { X: -RW, z0: 1.7, z1: 2.05 },
  { X: -RW, z0: 2.3, z1: 2.65 },
  { X: RW, z0: 1.7, z1: 2.05 },
  { X: RW, z0: 3.0, z1: 3.35 },
  { X: RW, z0: 3.5, z1: 3.8 },
];
const ART_Y = { top: -0.55, bottom: 0.25 };
const SPOTS = [2.2, 2.7, 3.2, 3.7];

const PERSON = 1.2;
/** Altura do boneco na escala 1 (pixels do desenho). */
const CHAR_H = 15.4;

const WALL = '#f6f4ee';
const WALL_SH = '#e6e2d6';
const RED = '#c8262b';
const RED_DK = '#a51d22';
const SEAT = '#c8262b';
const DARK = '#262c38';

const DISCOVERIES: Discovery[] = [
  { key: 'placa', emoji: '🟥', label: 'O nome na parede vermelha', tip: 'Toque no nome escrito na parede vermelha! 🟥' },
  { key: 'elevador', emoji: '🛗', label: 'O elevador vermelho', tip: 'Toque no elevador vermelho! 🛗' },
  { key: 'quadros', emoji: '🖼️', label: 'Os quadros da galeria', tip: 'Toque nos quadros das paredes! 🖼️' },
  { key: 'cinema', emoji: '🎬', label: 'O projetor de cinema', tip: 'Toque no projetor antigo! 🎬' },
  { key: 'danca', emoji: '💃', label: 'A dança no palco', tip: 'Toque na cortina do palco, lá no fundo! 💃' },
  { key: 'cadeiras', emoji: '💺', label: 'As cadeiras do teatro', tip: 'Toque nas cadeiras vermelhas do teatro! 💺' },
  { key: 'cartaz', emoji: '📜', label: 'O cartaz do espetáculo', tip: 'Toque no cartaz em pé! 📜' },
  { key: 'gente', emoji: '👋', label: 'Quem visita o Centro Cultural', tip: 'Dê um oi pra quem está passeando! 👋' },
];

const LINES = ['Olha esse quadro! 🖼️', 'Que exposição linda! 🎨', 'Vamos ver o filme? 🎬', 'Que lugar bonito! ✨', 'Oi! 👋', 'Hoje tem espetáculo! 💃'];
const HAIR = ['#2a1a12', '#5a3a1c', '#d9a441', '#1b1b1b', '#7a2e1a', '#c9c4bc'];

/* ---- Desenho em perspectiva ---- */

type Pt = [number, number];
const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;
/** Retângulo numa parede do lado (X fixo), de z0 a z1 e de y0 a y1. */
const sideQuad = (X: number, z0: number, z1: number, y0: number, y1: number) => poly([[px(X, z0), py(y0, z0)], [px(X, z1), py(y0, z1)], [px(X, z1), py(y1, z1)], [px(X, z0), py(y1, z0)]]);
/** Retângulo de chão/teto/tampo (Y fixo). */
const flatQuad = (Y: number, x0: number, x1: number, z0: number, z1: number) => poly([[px(x0, z0), py(Y, z0)], [px(x1, z0), py(Y, z0)], [px(x1, z1), py(Y, z1)], [px(x0, z1), py(Y, z1)]]);
/** Retângulo de frente (Z fixo). */
function Front({ x0, x1, y0, y1, z, fill, opacity }: { x0: number; x1: number; y0: number; y1: number; z: number; fill: string; opacity?: number }) {
  return <rect x={px(x0, z)} y={py(y0, z)} width={px(x1, z) - px(x0, z)} height={py(y1, z) - py(y0, z)} fill={fill} opacity={opacity} />;
}

/* ---- Sprites ---- */

/** Moço de chapéu do filme antigo (preto e branco). */
const filmManRuns = [
  sprite(['.kkk.', 'kkkkk', '.kwk.', '..k..', '.kkk.', 'k.k.k', '..k..', '.k.k.', 'k...k'], { k: '#1b1b1b', w: '#9a9a92' }, '#1b1b1b'),
  sprite(['.kkk.', 'kkkkk', '.kwk.', '..k..', '.kkk.', 'k.k.k', '..k..', '..k..', '.k.k.'], { k: '#1b1b1b', w: '#9a9a92' }, '#1b1b1b'),
];

/** Logotipo: quadrado branco com a porta entreaberta. */
function Logo({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#ffffff">
      <rect x={x} y={y} width={8} height={1} />
      <rect x={x} y={y} width={1} height={10} />
      <rect x={x + 7} y={y} width={1} height={10} />
      <path d={`M${x + 1} ${y + 1}L${x + 5} ${y + 2}L${x + 5} ${y + 10}L${x + 1} ${y + 10}Z`} />
    </g>
  );
}

/** Obras da galeria (12×13 com moldura): cada toque troca a obra. */
function Art({ k }: { k: number }) {
  const ix = 1;
  const iy = 1;
  switch (k % 6) {
    case 0:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#f6f4ee" />
          <path d={`M${ix + 2} ${iy + 9}L${ix + 6} ${iy + 3}L${ix + 4} ${iy + 3}L${ix + 8} ${iy + 1}L${ix + 8} ${iy + 5}L${ix + 7} ${iy + 4}L${ix + 3} ${iy + 10}Z`} fill="#e0402e" />
        </g>
      );
    case 1:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#ead9b5" />
          <rect x={ix + 2} y={iy + 3} width={2} height={2} fill="#d64545" />
          <rect x={ix + 6} y={iy + 3} width={2} height={2} fill="#d64545" />
          <rect x={ix + 2} y={iy + 5} width={6} height={2} fill="#d64545" />
          <rect x={ix + 3} y={iy + 7} width={4} height={1} fill="#d64545" />
          <rect x={ix + 4} y={iy + 8} width={2} height={1} fill="#d64545" />
        </g>
      );
    case 2:
      return (
        <g>
          {['#2f5fb3', '#f2b705', '#12a3a0', '#d64545', '#8cc63f'].map((c, i) => (
            <rect key={c} x={ix + i * 2} y={iy} width={2} height={11} fill={c} />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#9fd3ee" />
          <rect x={ix + 6} y={iy + 2} width={2} height={2} fill="#f2c200" />
          <path d={`M${ix} ${iy + 8}L${ix + 3} ${iy + 5}L${ix + 6} ${iy + 8}L${ix + 8} ${iy + 6}L${ix + 10} ${iy + 8}L${ix + 10} ${iy + 11}L${ix} ${iy + 11}Z`} fill="#4caf5a" />
          <rect x={ix} y={iy + 9} width={10} height={2} fill="#2f8f4a" />
        </g>
      );
    case 4:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#33424d" />
          <rect x={ix + 2} y={iy + 1} width={6} height={2} fill="#1b1b1b" />
          <rect x={ix + 3} y={iy + 3} width={4} height={4} fill="#e0ac69" />
          <rect x={ix + 4} y={iy + 4} width={1} height={1} fill="#1b1b1b" />
          <rect x={ix + 6} y={iy + 4} width={1} height={1} fill="#1b1b1b" />
          <rect x={ix + 2} y={iy + 7} width={6} height={4} fill="#e8e2d0" />
        </g>
      );
    default:
      // Azulejo azul e branco
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#f6f4ee" />
          {[0, 5].map((dx) =>
            [0, 5].map((dy) => (
              <g key={`${dx}${dy}`} fill="#2f5fb3">
                <rect x={ix + dx + 2} y={iy + dy + 1} width={1} height={3} />
                <rect x={ix + dx + 1} y={iy + dy + 2} width={3} height={1} />
              </g>
            )),
          )}
        </g>
      );
  }
}

/** Quadro pendurado numa parede do lado: moldura em perspectiva e a obra "deitada" nela. */
function Painting({ i, k }: { i: number; k: number }) {
  const p = PAINTINGS[i];
  const { top, bottom } = ART_Y;
  const p0: Pt = [px(p.X, p.z0), py(top, p.z0)];
  const p1: Pt = [px(p.X, p.z1), py(top, p.z1)];
  const p3: Pt = [px(p.X, p.z0), py(bottom, p.z0)];
  const m = `matrix(${(p1[0] - p0[0]) / 12} ${(p1[1] - p0[1]) / 12} 0 ${(p3[1] - p0[1]) / 13} ${p0[0]} ${p0[1]})`;
  const pad = 0.04;
  return (
    <g>
      <defs>
        <clipPath id={`cc-art${i}`}>
          <path d={sideQuad(p.X, p.z0 + pad, p.z1 - pad, top + pad, bottom - pad)} />
        </clipPath>
      </defs>
      {/* Luz do spot na parede */}
      <path d={sideQuad(p.X, p.z0 - 0.1, p.z1 + 0.1, CEIL, bottom + 0.3)} fill="#fff6c8" opacity={0.22} />
      <path d={sideQuad(p.X, p.z0 - 0.03, p.z1 + 0.03, top - 0.05, bottom + 0.05)} fill="#2a2a2a" />
      <path d={sideQuad(p.X, p.z0, p.z1, top, bottom)} fill="#ffffff" />
      <g clipPath={`url(#cc-art${i})`}>
        <g transform={m}>
          <Art k={k} />
        </g>
      </g>
      {/* Plaquinha */}
      <path d={sideQuad(p.X, p.z0 + 0.12, p.z0 + 0.2, bottom + 0.15, bottom + 0.22)} fill="#c4c0b4" />
    </g>
  );
}

/* ---- Sala ---- */

/** Corredor da galeria: paredes, teto com spots e o piso de madeira. */
const Gallery = memo(function Gallery() {
  const near = 0.3;
  const planks: ReactNode[] = [];
  for (let X = -RW + 0.5; X < RW; X += 0.5) planks.push(<line key={`p${X}`} x1={px(X, near)} y1={py(FLOOR, near)} x2={px(X, BACK)} y2={py(FLOOR, BACK)} stroke="#c9a676" strokeWidth={0.5} />);
  for (const z of [1.6, 1.9, 2.3, 2.8, 3.4]) planks.push(<rect key={`z${z}`} x={px(-RW, z)} y={py(FLOOR, z)} width={px(RW, z) - px(-RW, z)} height={0.5} fill="#c9a676" />);
  return (
    <g>
      {/* Teto */}
      <path d={flatQuad(CEIL, -RW, RW, near, BACK)} fill="#efece4" />
      {/* Paredes dos lados, com o rodapé */}
      <path d={sideQuad(-RW, near, BACK, CEIL, FLOOR)} fill={WALL} />
      <path d={sideQuad(RW, near, BACK, CEIL, FLOOR)} fill={WALL_SH} />
      <path d={sideQuad(-RW, near, BACK, FLOOR - 0.12, FLOOR)} fill="#cfc9b8" />
      <path d={sideQuad(RW, near, BACK, FLOOR - 0.12, FLOOR)} fill="#c4bead" />
      {/* Piso de madeira clara com o reflexo da parede vermelha */}
      <path d={flatQuad(FLOOR, -RW, RW, near, BACK)} fill="#d9b98a" />
      {planks}
      <path d={flatQuad(FLOOR, -2.6, 2.6, 2.4, BACK)} fill={RED} opacity={0.1} />
      {/* Ar-condicionado no teto */}
      <path d={flatQuad(CEIL, -0.5, 0.5, 2.0, 2.4)} fill="#dcd8ce" />
      {[2.1, 2.2, 2.3].map((z) => (
        <rect key={z} x={px(-0.45, z)} y={py(CEIL, z)} width={px(0.45, z) - px(-0.45, z)} height={0.6} fill="#b9b5aa" />
      ))}
      {/* Spots do teto */}
      {SPOTS.flatMap((z) =>
        [-2, 2].map((X) => <ellipse key={`${X}${z}`} cx={px(X, z)} cy={py(CEIL, z) + 0.5} rx={(F * 0.12) / z} ry={(F * 0.04) / z} fill="#fff6c8" />),
      )}
    </g>
  );
});

/** Teatro lá no fundo: paredes escuras, cadeiras vermelhas, palco, cortina e tela. */
function Theater({ seats, clapping, t, curtain, film, dancer }: { seats: (string | null)[]; clapping: boolean; t: number; curtain: number; film: number; dancer: ReactNode }) {
  const end = STAGE.back + 0.4;
  return (
    <g>
      <path d={flatQuad(CEIL, -RW, RW, BACK, end)} fill="#1d222c" />
      <path d={sideQuad(-RW, BACK, end, CEIL, FLOOR)} fill={DARK} />
      <path d={sideQuad(RW, BACK, end, CEIL, FLOOR)} fill="#20252f" />
      <Front x0={-RW} x1={RW} y0={CEIL} y1={FLOOR} z={end} fill="#15121a" />
      <path d={flatQuad(FLOOR, -RW, RW, BACK, end)} fill="#3a3238" />
      {/* Luzinhas das paredes e a placa de saída */}
      {[4.6, 5.3, 6.0].map((z) => (
        <g key={z}>
          <path d={sideQuad(-RW, z, z + 0.15, -0.4, -0.25)} fill="#ffe9a8" />
          <path d={sideQuad(RW, z, z + 0.15, -0.4, -0.25)} fill="#ffe9a8" />
        </g>
      ))}
      <path d={sideQuad(RW, 5.6, 5.9, -0.45, -0.3)} fill="#2e9a4a" />
      {/* Palco com a cortina (a dançarina fica entre o fundo e a cortina) */}
      <Front x0={-CURTAIN.half - 0.2} x1={CURTAIN.half + 0.2} y0={CURTAIN.top - 0.3} y1={STAGE.top} z={STAGE.back} fill="#3b2d40" />
      <path d={flatQuad(STAGE.top, -STAGE.half, STAGE.half, STAGE.front, STAGE.back)} fill="#a8742e" />
      <Front x0={-STAGE.half} x1={STAGE.half} y0={STAGE.top} y1={FLOOR} z={STAGE.front} fill="#5c3a1c" />
      {dancer}
      <Curtain open={curtain} />
      <Screen k={film} t={t} />
      {/* Fileiras de cadeiras (vistas por trás), da mais longe para a mais perto */}
      {SEAT_ROWS.map((z, r) =>
        SEAT_X.map((X, i) => {
          const hair = seats[r * SEAT_X.length + i];
          const s = F / z;
          const bob = hair && clapping && Math.sin(t * 20 + i + r) > 0 ? -0.6 : 0;
          return (
            <g key={`${r}-${i}`}>
              {hair && <ellipse cx={px(X + 0.22, z)} cy={py(FLOOR - 0.85, z) + bob} rx={0.15 * s} ry={0.17 * s} fill={hair} />}
              <rect x={px(X, z) - 0.4} y={py(FLOOR - 0.6, z) - 0.4} width={0.45 * s + 0.8} height={0.6 * s + 0.4} fill="#1b1418" />
              <rect x={px(X, z)} y={py(FLOOR - 0.6, z)} width={0.45 * s} height={0.6 * s} fill={SEAT} />
              <rect x={px(X, z)} y={py(FLOOR - 0.6, z)} width={0.45 * s} height={0.6} fill="#e85a52" />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** Cortina vermelha: `open` de 0 (fechada) a 1 (aberta). */
function Curtain({ open }: { open: number }) {
  const z = STAGE.back - 0.05;
  const w = CURTAIN.half - (CURTAIN.half - 0.5) * open;
  const folds = (x0: number) =>
    Array.from({ length: Math.max(1, Math.floor(w / 0.35)) }, (_, i) => <Front key={i} x0={x0 + 0.15 + i * 0.35} x1={x0 + 0.22 + i * 0.35} y0={CURTAIN.top} y1={STAGE.top} z={z} fill="#7e1219" />);
  return (
    <g>
      <Front x0={-CURTAIN.half} x1={-CURTAIN.half + w} y0={CURTAIN.top} y1={STAGE.top} z={z} fill="#b3202a" />
      {folds(-CURTAIN.half)}
      <Front x0={CURTAIN.half - w} x1={CURTAIN.half} y0={CURTAIN.top} y1={STAGE.top} z={z} fill="#b3202a" />
      {folds(CURTAIN.half - w)}
      <Front x0={-CURTAIN.half - 0.2} x1={CURTAIN.half + 0.2} y0={CURTAIN.top - 0.35} y1={CURTAIN.top + 0.05} z={z} fill="#b3202a" />
      <Front x0={-CURTAIN.half - 0.2} x1={CURTAIN.half + 0.2} y0={CURTAIN.top + 0.05} y1={CURTAIN.top + 0.12} z={z} fill="#e3b341" />
    </g>
  );
}

/** Tela de cinema que desce: quando desce toda, passa um filme antigo em preto e branco. */
function Screen({ k, t }: { k: number; t: number }) {
  if (k <= 0) return null;
  const z = STAGE.back - 0.1;
  const x0 = px(-SCREEN.half, z);
  const x1 = px(SCREEN.half, z);
  const y0 = py(SCREEN.top, z);
  const h = (py(SCREEN.bottom, z) - y0) * k;
  const w = x1 - x0;
  const flick = 0.85 + Math.sin(t * 47) * 0.08 + Math.sin(t * 13) * 0.05;
  return (
    <g>
      <rect x={x0 - 0.5} y={y0} width={w + 1} height={h + 0.5} fill={INK} />
      <rect x={x0} y={y0} width={w} height={h} fill="#f1efe6" />
      {k >= 1 && (
        <g>
          <rect x={x0 + 0.5} y={y0 + 0.5} width={w - 1} height={h - 1} fill="#cfcfc6" opacity={flick} />
          <rect x={x0 + 0.5} y={y0 + h - 4} width={w - 1} height={3.5} fill="#7d7d76" />
          <rect x={x0 + w - 8} y={y0 + 2} width={2} height={2} fill="#f6f6f0" />
          <g transform={`translate(${(x0 + 2 + ((t * 5) % (w - 6))).toFixed(1)} ${(y0 + h - 12).toFixed(1)})`}>
            <Pixels runs={filmManRuns[Math.floor(t * 4) % 2]} />
          </g>
          {Math.sin(t * 7.3) > 0.4 && <rect x={x0 + 3 + ((t * 61) % (w - 6))} y={y0 + 0.5} width={0.5} height={h - 1} fill="#555" opacity={0.6} />}
        </g>
      )}
    </g>
  );
}

/** Parede vermelha do fundo com o nome do lugar e a porta larga do teatro. */
function BackWall({ glow, t }: { glow: boolean; t: number }) {
  const lit = glow && Math.sin(t * 18) > 0;
  const text = lit ? '#ffe27a' : '#ffffff';
  const [x0, x1] = [px(-RW, BACK), px(RW, BACK)];
  const [y0, y1] = [py(CEIL, BACK), py(FLOOR, BACK)];
  const [dx0, dx1, dy0] = [px(-DOOR.x, BACK), px(DOOR.x, BACK), py(DOOR.top, BACK)];
  return (
    <g>
      <path d={`M${x0} ${y0}H${x1}V${y1}H${dx1}V${dy0}H${dx0}V${y1}H${x0}Z`} fill={RED} />
      <rect x={x0} y={y0} width={x1 - x0} height={1} fill="#e85a52" />
      {/* Batente escuro da porta */}
      <path d={`M${dx0 - 1} ${y1}V${dy0 - 1}H${dx1 + 1}V${y1}H${dx1}V${dy0}H${dx0}V${y1}Z`} fill={RED_DK} />
      <Logo x={125} y={y0 + 1} />
      <PixelText text="CENTRO CULTURAL" x={137} y={y0 + 1} fill={text} />
      <PixelText text="HUMBERTO MAURO" x={137} y={y0 + 7} fill={text} />
    </g>
  );
}

/** Elevador vermelho (a caixa do saguão): frente com as letrinhas douradas, porta de grade do lado. */
function Lift({ open, arriving }: { open: number; arriving: boolean }) {
  const L = LIFT;
  const slide = ((L.door1 - L.door0) / 2) * open;
  const mid = (L.door0 + L.door1) / 2;
  const bars: ReactNode[] = [];
  for (const [a, b] of [
    [L.door0, mid - slide],
    [mid + slide, L.door1],
  ]) {
    if (b - a < 0.01) continue;
    bars.push(<path key={`d${a}`} d={sideQuad(L.x1, a, b, -0.2, FLOOR)} fill="#8d969c" />);
    for (let z = a + 0.05; z < b; z += 0.08) bars.push(<path key={`v${a}${z}`} d={sideQuad(L.x1, z, z + 0.015, -0.2, FLOOR)} fill="#4a5258" />);
    for (let y = -0.1; y < FLOOR; y += 0.2) bars.push(<path key={`h${a}${y}`} d={sideQuad(L.x1, a, b, y, y + 0.03)} fill="#4a5258" />);
  }
  return (
    <g>
      {/* Lado (virado para o corredor), com a porta */}
      <path d={sideQuad(L.x1, L.z0, L.z1, L.top, FLOOR)} fill={RED_DK} />
      <path d={sideQuad(L.x1, L.door0 - 0.03, L.door1 + 0.03, -0.25, FLOOR)} fill={INK} />
      <path d={sideQuad(L.x1, L.door0, L.door1, -0.2, FLOOR)} fill="#f1dfa8" />
      {bars}
      <path d={sideQuad(L.x1, mid - 0.05, mid + 0.05, -0.45, -0.35)} fill={arriving ? '#ffe27a' : '#6a1a1a'} />
      {/* Frente */}
      <Front x0={L.x0} x1={L.x1} y0={L.top} y1={FLOOR} z={L.z0} fill={RED} />
      <Front x0={L.x0} x1={L.x1} y0={L.top} y1={L.top + 0.05} z={L.z0} fill="#e85a52" />
      <Front x0={-3.8} x1={-3.45} y0={-0.85} y1={-0.75} z={L.z0} fill="#fff1c0" />
      <circle cx={px(-3.6, L.z0)} cy={py(-0.7, L.z0)} r={5} fill="#ffe9a8" opacity={0.25} />
      <Front x0={-3.35} x1={-3.0} y0={-0.5} y1={-0.45} z={L.z0} fill="#d9a441" />
      <Front x0={-3.35} x1={-3.1} y0={-0.4} y1={-0.35} z={L.z0} fill="#d9a441" />
    </g>
  );
}

/** Balcão da recepção: tampo branco e frente de madeira escura vazada. */
function Desk() {
  const D = DESK;
  const slats: ReactNode[] = [];
  for (let X = D.x0 + 0.1; X < D.x1 - 0.05; X += 0.2) slats.push(<Front key={X} x0={X} x1={X + 0.08} y0={D.top + 0.2} y1={FLOOR - 0.1} z={D.z0} fill="#2e1c14" />);
  return (
    <g>
      <path d={sideQuad(D.x0, D.z0, D.z1, D.top, FLOOR)} fill="#3a2419" />
      <Front x0={D.x0} x1={D.x1} y0={D.top} y1={FLOOR} z={D.z0} fill="#4a2e22" />
      {slats}
      <path d={flatQuad(D.top, D.x0 - 0.05, D.x1 + 0.05, D.z0 - 0.05, D.z1)} fill="#f4f1e6" />
      <Front x0={D.x0 - 0.05} x1={D.x1 + 0.05} y0={D.top} y1={D.top + 0.08} z={D.z0 - 0.05} fill="#d8d4c8" />
    </g>
  );
}

/** Banco preto no meio da galeria. */
function Bench() {
  const z0 = 3.6;
  const z1 = 3.9;
  return (
    <g>
      {[-2.5, -1.4].map((X) => (
        <Front key={X} x0={X} x1={X + 0.08} y0={0.85} y1={FLOOR} z={z0 + 0.05} fill={INK} />
      ))}
      <path d={flatQuad(0.75, -2.6, -1.3, z0, z1)} fill="#3d4a52" />
      <Front x0={-2.6} x1={-1.3} y0={0.75} y1={0.88} z={z0} fill={INK} />
    </g>
  );
}

/** Projetor de cinema antigo em exposição, num pedestal; tocado, as bobinas giram. */
function Projector({ on, t }: { on: boolean; t: number }) {
  const { x: X, z } = PROJ;
  const s = F / z;
  const spin = on ? t * 6 : 0;
  const reel = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r + 0.5} fill={INK} />
      <circle cx={cx} cy={cy} r={r} fill="#5f6d76" />
      {[0, 1, 2].map((k) => {
        const a = spin + (k * Math.PI * 2) / 3;
        return <circle key={k} cx={cx + Math.cos(a) * r * 0.55} cy={cy + Math.sin(a) * r * 0.55} r={r * 0.22} fill="#2b2f33" />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.18} fill="#c9ced1" />
    </g>
  );
  return (
    <g>
      {/* Pedestal branco */}
      <path d={flatQuad(0.45, X - 0.4, X + 0.4, z, z + 0.4)} fill="#ffffff" />
      <Front x0={X - 0.4} x1={X + 0.4} y0={0.45} y1={FLOOR} z={z} fill="#ece8de" />
      <path d={sideQuad(X - 0.4, z, z + 0.4, 0.45, FLOOR)} fill="#d8d4c8" />
      {/* Corpo, lente e as duas bobinas */}
      <Front x0={X - 0.3} x1={X + 0.3} y0={0.12} y1={0.45} z={z + 0.1} fill="#2b2f33" />
      <Front x0={X - 0.3} x1={X + 0.3} y0={0.12} y1={0.17} z={z + 0.1} fill="#4a5258" />
      <circle cx={px(X, z + 0.1)} cy={py(0.3, z + 0.1)} r={0.07 * s} fill={on ? '#fff6c8' : '#8d969c'} />
      {reel(px(X - 0.17, z + 0.15), py(-0.08, z + 0.15), 0.2 * s)}
      {reel(px(X + 0.2, z + 0.15), py(-0.12, z + 0.15), 0.22 * s)}
    </g>
  );
}

/** Cartaz em pé (banner): um lado é a dança, o outro é o cinema. */
function Banner({ side }: { side: number }) {
  const { x0, x1, z } = BANNER;
  const X0 = px(x0, z);
  const w = px(x1, z) - X0;
  const y0 = py(-0.6, z);
  const h = py(1.1, z) - y0;
  return (
    <g>
      <rect x={X0 - 1} y={py(1.1, z)} width={w + 2} height={py(FLOOR, z) - py(1.1, z)} fill="#8d969c" />
      <rect x={X0 - 0.5} y={y0 - 0.5} width={w + 1} height={h + 1} fill={INK} />
      {side === 0 ? (
        <g>
          <rect x={X0} y={y0} width={w} height={h} fill="#2e7d4a" />
          <rect x={X0} y={y0} width={w} height={h * 0.35} fill="#c8262b" />
          {[0.2, 0.5, 0.8].map((k) => (
            <rect key={k} x={X0 + w * k - 1} y={y0 + h * 0.12} width={2} height={2} fill="#e85a52" />
          ))}
          <rect x={X0 + 1.5} y={y0 + h * 0.45} width={w - 3} height={1.5} fill="#f2c200" />
          <rect x={X0 + 1.5} y={y0 + h * 0.6} width={w - 3} height={1} fill="#ffffff" />
          <rect x={X0 + 1.5} y={y0 + h * 0.7} width={w - 5} height={1} fill="#ffffff" />
          <rect x={X0 + w - 5} y={y0 + h * 0.82} width={3.5} height={3.5} fill="#e8772e" />
        </g>
      ) : (
        <g>
          <rect x={X0} y={y0} width={w} height={h} fill="#1d2430" />
          {/* Claquete de cinema */}
          {[0, 2, 4, 6, 8].map((d) => (
            <rect key={d} x={X0 + 1.5 + d} y={y0 + h * 0.15} width={1} height={2} fill="#ffffff" />
          ))}
          <rect x={X0 + 1.5} y={y0 + h * 0.15 + 2} width={w - 3} height={6} fill="#f4f1de" />
          <rect x={X0 + 2.5} y={y0 + h * 0.15 + 3} width={w - 5} height={4} fill="#3a3f42" />
          <rect x={X0 + 1.5} y={y0 + h * 0.6} width={w - 3} height={1.5} fill="#f2c200" />
          <rect x={X0 + 1.5} y={y0 + h * 0.72} width={w - 4} height={1} fill="#ffffff" />
        </g>
      )}
    </g>
  );
}

/* ---- Coisas vivas ---- */

interface Visitor {
  id: number;
  X: number;
  Z: number;
  tx: number;
  tz: number;
  speed: number;
  walk: number;
  wait: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
}

/** Para onde os visitantes andam: pelos lados, para não tampar o palco e a tela lá no fundo. */
function spot(): [number, number] {
  return [rnd(-3.3, -2.3), rnd(2.4, 3.0)];
}

function newVisitor(X?: number, Z?: number): Visitor {
  const [sx, sz] = spot();
  const [tx, tz] = spot();
  return { id: uid(), X: X ?? sx, Z: Z ?? sz, tx, tz, speed: rnd(0.25, 0.4), walk: 0, wait: rnd(0, 3), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    visitors: [newVisitor(-2.5, 2.9), newVisitor(-3.1, 2.5)],
    clerk: { config: randomLook(), say: null as string | null, sayUntil: 0 },
    seats: SEAT_ROWS.flatMap(() => SEAT_X.map(() => (Math.random() < 0.3 ? pick(HAIR) : null))),
    art: [0, 1, 2, 3, 4, 5],
    banner: 0,
    lift: { at: -10, until: -10, guest: true },
    film: { at: -10, until: -10 },
    dance: { at: -10, until: -10, who: randomLook(), clapped: true },
    clapUntil: 0,
    signUntil: 0,
    timers: { mote: 0, note: 0, clap: 0 },
  };
}

/** De 0 a 1: abre/desce em `secs` segundos, fica e volta no fim. */
const ramp = (t: number, at: number, until: number, secs: number) => (t > until ? 0 : Math.min(clamp((t - at) / secs, 0, 1), clamp((until - t) / secs, 0, 1)));

/** Boneco em pé no chão da sala, no tamanho certo para a distância. */
function Person({ X, Z, config, frame }: { X: number; Z: number; config: AvatarConfig; frame: 0 | 1 | 2 }) {
  const k = (PERSON * F) / Z / CHAR_H;
  return (
    <g transform={`translate(${px(X, Z).toFixed(2)} ${py(FLOOR, Z).toFixed(2)}) scale(${k.toFixed(3)})`}>
      <Character x={0} y={0} config={config} frame={frame} />
    </g>
  );
}

/* ---- Componente ---- */

export const CulturalScene = memo(function CulturalScene({ place, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const cam = useCamera(VP.x);
  const life = useRef(initLife());
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);

    for (const v of L.visitors) {
      if (v.wait > 0) {
        v.wait -= dt;
        v.walk = 0;
        continue;
      }
      const dx = v.tx - v.X;
      const dz = v.tz - v.Z;
      const d = Math.hypot(dx, dz);
      if (d < 0.03) {
        v.wait = rnd(1.5, 5);
        if (Math.random() < 0.3 && t > v.sayUntil) {
          v.say = pick(LINES);
          v.sayUntil = t + 2.6;
        }
        [v.tx, v.tz] = spot();
      } else {
        const step = Math.min(d, v.speed * dt);
        v.X += (dx / d) * step;
        v.Z += (dz / d) * step;
        v.walk += dt;
      }
    }

    // Quem chega de elevador sai andando para a galeria
    if (!L.lift.guest && t > L.lift.at + 0.8) {
      L.lift.guest = true;
      if (L.visitors.length >= 4) L.visitors.shift();
      const v = newVisitor(LIFT.x1 + 0.3, (LIFT.door0 + LIFT.door1) / 2);
      v.wait = 0;
      [v.tx, v.tz] = spot();
      L.visitors.push(v);
    }

    // Dança: notinhas saindo do palco; no fim, a plateia aplaude
    if (t < L.dance.until) {
      L.timers.note -= dt;
      if (L.timers.note <= 0) {
        L.timers.note = rnd(0.3, 0.6);
        spawn('note', px(rnd(-2, 2), STAGE.back), py(-0.3, STAGE.back), { vx: rnd(-2, 2), vy: -rnd(4, 7), life: 1.6, c: pick(['#ffe27a', '#ffffff', '#ec6a8c']) });
      }
    } else if (!L.dance.clapped) {
      L.dance.clapped = true;
      clap(t, 2.8);
    }
    if (t < L.clapUntil) {
      L.timers.clap -= dt;
      if (L.timers.clap <= 0) {
        L.timers.clap = 0.12;
        const i = L.seats.findIndex((s) => s && Math.random() < 0.25);
        if (i >= 0) {
          const z = SEAT_ROWS[Math.floor(i / SEAT_X.length)];
          spawn('spark', px(SEAT_X[i % SEAT_X.length] + 0.22, z), py(0.35, z), { life: 0.4, vy: -5, vx: rnd(-2, 2), c: '#fff6c8' });
        }
      }
    }

    // Poeirinha brilhando na luz dos spots
    L.timers.mote -= dt;
    if (L.timers.mote <= 0) {
      L.timers.mote = rnd(0.25, 0.6);
      const z = pick(SPOTS);
      spawn('mote', px(pick([-2, 2]) + rnd(-0.6, 0.6), z), py(rnd(-1.3, 0.5), z), { vx: rnd(-1, 1), vy: rnd(0.3, 1.2), life: rnd(3, 5), c: '#fff6c8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);
  const guard = cam.guard;

  function clap(t: number, secs: number) {
    life.current.clapUntil = t + secs;
    sfx('palmas');
    setTimeout(() => sfx('palmas'), 400);
  }

  const tapSign = () => {
    if (!guard()) return;
    sfx('zap');
    life.current.signUntil = clock.current + 1.2;
    for (let i = 0; i < 10; i++) spawn('spark', rnd(125, 195), rnd(28, 40), { life: rnd(0.5, 0.9), vx: rnd(-5, 5), vy: rnd(-6, 2), c: pick(['#ffffff', '#ffe27a']) });
    say('placa', VP.x, 26, pick(['Centro Cultural Humberto Mauro! 🎭', 'Aqui tem arte, teatro e cinema! 🎬']), 3);
    discover('placa');
  };

  const tapLift = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.lift.until) return;
    sfx('plim');
    L.lift = { at: t, until: t + 3.5, guest: false };
    say('elevador', px(-3.2, LIFT.z0), py(-1.3, LIFT.z0), pick(['Plim! Chegou o elevador! 🛗', 'Plim! Quem vem lá? 🛗']), 2.6);
    discover('elevador');
  };

  const tapArt = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    const p = PAINTINGS[i];
    const zm = (p.z0 + p.z1) / 2;
    const [x, y] = [px(p.X, zm), py(-0.15, zm)];
    sfx('pop');
    L.art[i] = (L.art[i] + 1) % 6;
    for (let k = 0; k < 6; k++) spawn('spark', x + rnd(-6, 6), y + rnd(-6, 6), { life: rnd(0.4, 0.8), vx: rnd(-5, 5), vy: rnd(-6, 2), c: '#ffe27a' });
    say(`q${i}`, clamp(x, -60, W + 60), py(-0.8, zm), pick(['Que quadro bonito! 🖼️', 'Isso é arte! 🎨', 'Uma exposição! 🖼️']), 2.4);
    discover('quadros');
  };

  const tapFilm = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.film.until) return;
    // Se estiver tendo dança, a cortina fecha antes de a tela descer
    const busy = t < L.dance.until;
    if (busy) L.dance.until = t + 1;
    sfx('whir');
    setTimeout(() => sfx('tictac'), 700);
    L.film = { at: t + (busy ? 1 : 0), until: t + 10 };
    say('cinema', px(PROJ.x, PROJ.z), py(-0.3, PROJ.z), pick(['Humberto Mauro fazia filmes aqui! 🎬', 'Luz, câmera, ação! 🎬']), 3.2);
    discover('cinema');
  };

  const tapStage = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.film.until || t < L.dance.until) return;
    sfx('musica');
    L.dance = { at: t, until: t + 7, who: randomLook(), clapped: false };
    say('danca', VP.x, py(CURTAIN.top - 0.4, STAGE.back), pick(['Vai começar o espetáculo! 💃', 'Hoje tem dança! 💃']), 2.8);
    discover('danca');
  };

  const tapSeats = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('pop');
    L.seats = L.seats.map((s) => s ?? (Math.random() < 0.45 ? pick(HAIR) : null));
    clap(clock.current, 2);
    say('cadeiras', VP.x, py(0.1, 4.4), pick(['Cadeiras vermelhas! 💺', 'Cabe muita gente aqui! 💺', 'Clap, clap, clap! 👏']), 2.6);
    discover('cadeiras');
  };

  const tapBanner = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('creak');
    L.banner = 1 - L.banner;
    say('cartaz', px((BANNER.x0 + BANNER.x1) / 2, BANNER.z), py(-0.9, BANNER.z), L.banner ? 'Hoje tem cinema! 🎬' : 'Hoje tem espetáculo de dança! 💃', 2.6);
    discover('cartaz');
  };

  const tapVisitor = (v: Visitor) => {
    if (!guard()) return;
    sfx('pop');
    v.say = pick(LINES);
    v.sayUntil = clock.current + 2.8;
    v.wait = Math.max(v.wait, 2.4);
    discover('gente');
  };

  const tapClerk = () => {
    if (!guard()) return;
    sfx('pop');
    const c = life.current.clerk;
    c.say = pick([`${byGender('Bem-vindo', 'Bem-vinda')} ao Centro Cultural! 😊`, 'A entrada é de graça! 🎟️', 'Hoje tem filme e dança! 🎭']);
    c.sayUntil = clock.current + 2.8;
    discover('gente');
  };

  const t = clock.current;
  const L = life.current;
  const view = cam.view(t);

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (pt && pt.y > py(FLOOR, BACK)) spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  const liftOpen = ramp(t, L.lift.at, L.lift.until, 0.5);
  const filmK = ramp(t, L.film.at, L.film.until, 0.8);
  const curtainK = ramp(t, L.dance.at, L.dance.until, 1);
  const filmOn = t < L.film.until;
  const danceX = Math.sin((t - L.dance.at) * 1.6) * 1.3;
  const spin = Math.cos((t - L.dance.at) * 7) >= 0 ? 1 : -1;
  const dz = STAGE.back - 0.25;
  const dancer =
    curtainK > 0 ? (
      <g>
        <ellipse cx={px(danceX, dz)} cy={py(STAGE.top, dz)} rx={8} ry={1.5} fill="#fff6c8" opacity={0.4} />
        <g transform={`translate(${px(danceX, dz).toFixed(2)} 0) scale(${spin} 1) translate(${(-px(danceX, dz)).toFixed(2)} 0)`}>
          <g transform={`translate(${px(danceX, dz).toFixed(2)} ${py(STAGE.top, dz).toFixed(2)}) scale(${((PERSON * F) / dz / CHAR_H).toFixed(3)})`}>
            <Character x={0} y={0} config={L.dance.who} frame={Math.sin(t * 8) > 0 ? 1 : 2} />
          </g>
        </g>
      </g>
    ) : null;

  // Coisas do corredor, desenhadas da mais longe para a mais perto
  const things: { z: number; key: string; node: ReactNode }[] = [
    {
      z: BANNER.z,
      key: 'banner',
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapBanner();
          }}
          role="button"
          aria-label="Cartaz do espetáculo"
        >
          <Banner side={L.banner} />
        </g>
      ),
    },
    { z: 3.6, key: 'bench', node: <Bench /> },
    {
      z: PROJ.z,
      key: 'proj',
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapFilm();
          }}
          role="button"
          aria-label="Projetor de cinema"
        >
          <Projector on={filmOn} t={t} />
        </g>
      ),
    },
    {
      z: DESK.z1 + 0.3,
      key: 'clerk',
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapClerk();
          }}
        >
          <Person X={3.0} Z={DESK.z1 + 0.3} config={L.clerk.config} frame={0} />
        </g>
      ),
    },
    { z: DESK.z0, key: 'desk', node: <Desk /> },
    {
      z: LIFT.z0,
      key: 'lift',
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapLift();
          }}
          role="button"
          aria-label="Elevador"
        >
          <Lift open={liftOpen} arriving={t < L.lift.until} />
        </g>
      ),
    },
    ...L.visitors.map((v) => ({
      z: v.Z,
      key: `v${v.id}`,
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapVisitor(v);
          }}
        >
          <Person X={v.X} Z={v.Z} config={v.config} frame={v.walk > 0 ? (((Math.floor(v.walk / 0.2) % 2) + 1) as 1 | 2) : 0} />
        </g>
      ),
    })),
  ].sort((a, b) => b.z - a.z);

  const headY = (Z: number) => py(FLOOR - PERSON, Z) - 3;
  const bubbles = [
    ...live(t),
    ...L.visitors.filter((v) => v.say && v.sayUntil > t).map((v) => ({ key: `v${v.id}`, x: px(v.X, v.Z), y: headY(v.Z), text: v.say! })),
    ...(L.clerk.say && L.clerk.sayUntil > t ? [{ key: 'clerk', x: px(3.0, DESK.z1 + 0.3), y: headY(DESK.z1 + 0.3), text: L.clerk.say }] : []),
  ];

  // Facho de luz do projetor até a tela
  const sz = STAGE.back - 0.1;
  const lens: Pt = [px(PROJ.x, PROJ.z + 0.1), py(0.3, PROJ.z + 0.1)];
  const scr: Pt[] = [
    [px(-SCREEN.half, sz), py(SCREEN.top, sz)],
    [px(SCREEN.half, sz), py(SCREEN.top, sz)],
    [px(SCREEN.half, sz), py(SCREEN.bottom, sz)],
    [px(-SCREEN.half, sz), py(SCREEN.bottom, sz)],
  ];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <rect x={FULL.x} y={-300} width={FULL.w} height={700} fill="#efece4" />

        {/* Teatro lá no fundo (aparece pela porta larga) */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapStage();
          }}
          role="button"
          aria-label="Palco"
        >
          <Theater seats={L.seats} clapping={t < L.clapUntil} t={t} curtain={curtainK} film={filmK} dancer={dancer} />
        </g>
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapSeats();
          }}
          role="button"
          aria-label="Cadeiras do teatro"
        >
          <rect x={px(-RW, 4.5)} y={py(STAGE.top + 0.05, 5.6)} width={px(RW, 4.4) - px(-RW, 4.4)} height={py(FLOOR, BACK) - py(STAGE.top + 0.05, 5.6)} fill="transparent" />
        </g>

        <Gallery />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapSign();
          }}
          role="button"
          aria-label="Nome do Centro Cultural"
        >
          <BackWall glow={t < L.signUntil} t={t} />
        </g>
        {PAINTINGS.map((_, i) => (
          <g
            key={i}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapArt(i);
            }}
          >
            <Painting i={i} k={L.art[i]} />
          </g>
        ))}

        {filmK >= 1 && (
          <g opacity={0.12 + Math.sin(t * 31) * 0.03} pointerEvents="none">
            {scr.map((p, i) => (
              <path key={i} d={poly([lens, p, scr[(i + 1) % 4]])} fill="#fff6c8" />
            ))}
          </g>
        )}

        {things.map((th) => (
          <g key={th.key}>{th.node}</g>
        ))}

        <ParticleLayer list={particles.current} />
      </svg>

      <SceneHud
        t={t}
        view={view}
        bubbles={bubbles}
        list={DISCOVERIES}
        found={found}
        fresh={fresh}
        toast={toast.current}
        night={false}
        firstTip="Toque nos quadros, no elevador e no teatro lá no fundo! 👆"
        dragText="👈 Arraste para olhar em volta 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
