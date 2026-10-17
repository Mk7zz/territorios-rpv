import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { byGender } from '../../lib/personagem';
import { seeded } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import { palmRuns } from './PlaceScene';
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
 * Visita à Chácara Dona Catarina: a casa laranja com o frontão no meio, enfeitado com a renda
 * branca de madeira (lambrequim), as três portas em arco com sacadinha de ferro e as alas dos
 * lados com telhado de barro. Na frente, o jardim com agaves, palmeiras e árvores, o caminho de
 * pedra portuguesa e, bem perto de quem olha, a pontezinha de madeira sobre os laguinhos.
 * O sapo pula de folha em folha, o bem-te-vi canta no telhado e as portas abrem para dar um oi.
 */

const CX = 150;
/** Meia largura do caminho de pedra lá embaixo (ele abre em perspectiva desde a porta). */
const PATH_END = 7 + ((90 + 112 - 80) * 41) / 36;
const GROUND = 80;
const WALL = '#f08a24';
const WALL_SH = '#d27418';
const WHITE = '#fbf7ec';
const WHITE_SH = '#ddd6c4';
const ROOF = '#b5523b';
const ROOF_DK = '#94402c';
const IRON = '#3a3f42';
const WING = { x0: 96, x1: 204 };
const BAY = { x0: 132, x1: 168 };
const GABLE = { base: 37, apex: 18, half: 22 };
const DOORS = [141, 150, 159];
const WIN = [102, 118, 174, 190];
const AGAVES = [{ x: 122, s: 1.3 }, { x: 178, s: 1.3 }, { x: 108, s: 0.9 }, { x: 194, s: 0.9 }];
const PALMS = [234, 256];
const PADS = [
  { x: 40, y: 104 },
  { x: 66, y: 108 },
  { x: 84, y: 101 },
  { x: 218, y: 103 },
  { x: 246, y: 108 },
  { x: 268, y: 101 },
];
const POND_L = { cx: 56, cy: 106, rx: 48, ry: 9 };
const POND_R = { cx: 246, cy: 106, rx: 50, ry: 9 };

const DISCOVERIES: Discovery[] = [
  { key: 'renda', emoji: '🤍', label: 'A renda do telhado', tip: 'Toque na renda branca do telhado! 🤍' },
  { key: 'janela', emoji: '🚪', label: 'As portas em arco', tip: 'Toque nas portas da casa! 🚪' },
  { key: 'agave', emoji: '🌵', label: 'As agaves', tip: 'Toque nas plantas pontudas do jardim! 🌵' },
  { key: 'arvore', emoji: '🌴', label: 'As palmeiras e árvores', tip: 'Toque nas palmeiras! 🌴' },
  { key: 'sapo', emoji: '🐸', label: 'O sapinho do lago', tip: 'Tem um sapinho no laguinho. Ache ele! 🐸' },
  { key: 'ponte', emoji: '🪵', label: 'A pontezinha de madeira', tip: 'Toque na pontezinha de madeira! 🪵' },
  { key: 'passaro', emoji: '🐦', label: 'O bem-te-vi', tip: 'Tem um passarinho no telhado. Toque nele! 🐦' },
  { key: 'gente', emoji: '👋', label: 'Quem passeia no jardim', tip: 'Dê um oi pra quem passeia no jardim! 👋' },
];

const LINES_DAY = ['Oi! 👋', 'Que jardim bonito! 🌳', 'Olha a casa laranja! 🧡', 'Que dia gostoso! ☀️', 'Vou ver o laguinho! 🐸'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Olha os vagalumes! ✨', 'A casa acesa é linda! 🏡'];

/* ---- Sprites ---- */

const frogRuns = sprite(['.g.g.', 'gGGGg', 'GGGGG', 'g.G.g'], { g: '#3a8a35', G: '#6fbf4a' });
const kiskadee = sprite(['.kk..', 'kwwky', '.kkk.', '.yyyb', '..yb.'], { k: '#3a2a1e', w: '#ffffff', y: '#f2c200', b: '#8a5a2b' });

/* ---- Casa ---- */

/** Telhado de barro de quatro águas das alas (fileiras cada vez mais curtas até a cumeeira). */
function hipRoof(): ReactNode[] {
  const out: ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const x0 = WING.x0 - 4 + Math.round(i * 1.4);
    const x1 = WING.x1 + 4 - Math.round(i * 1.4);
    out.push(<rect key={`o${i}`} x={x0 - 1} y={51 - i} width={x1 - x0 + 2} height={1} fill={INK} />);
    out.push(<rect key={i} x={x0} y={51 - i} width={x1 - x0} height={1} fill={i % 3 === 0 ? ROOF_DK : ROOF} />);
  }
  out.push(<rect key="top" x={WING.x0 + 13} y={39} width={WING.x1 - WING.x0 - 26} height={1} fill={INK} />);
  return out;
}

/** Renda de madeira na beira do frontão: pontinhas brancas com furinhos, nos dois lados. */
function lace(): ReactNode[] {
  const out: ReactNode[] = [];
  const { base, apex, half } = GABLE;
  for (let k = 0; k <= half; k += 2) {
    const y = Math.round(base - ((apex - base) * -1 * k) / half);
    for (const side of [-1, 1]) {
      const x = CX + side * (half - k);
      out.push(<rect key={`${side}a${k}`} x={x - 1} y={y + 1} width={2} height={2} fill={WHITE} />);
      out.push(<rect key={`${side}b${k}`} x={x - 0.5} y={y + 3} width={1} height={1} fill={WHITE} />);
      if (k % 4 === 0) out.push(<rect key={`${side}c${k}`} x={x - 0.5} y={y + 1.5} width={1} height={1} fill={WALL_SH} />);
    }
  }
  // Renda menor na beira dos beirais das alas
  for (let x = WING.x0 - 3; x < WING.x1 + 3; x += 3) {
    if (x > BAY.x0 - 3 && x < BAY.x1 + 2) continue;
    out.push(<rect key={`e${x}`} x={x} y={52} width={2} height={1} fill={WHITE} />);
    out.push(<rect key={`f${x}`} x={x + 0.5} y={53} width={1} height={1} fill={WHITE} />);
  }
  return out;
}

const House = memo(function House({ night, onLace }: { night: boolean; onLace: () => void }) {
  const glass = night ? '#ffd76a' : '#3d5560';
  const { base, apex, half } = GABLE;
  const gable = `M${CX - half - 1} ${base}L${CX} ${apex - 1}L${CX + half + 1} ${base}Z`;
  return (
    <g>
      <rect x={WING.x0 - 4} y={GROUND} width={WING.x1 - WING.x0 + 8} height={2} fill="#000" opacity={0.14} />
      {hipRoof()}
      {/* Alas */}
      <rect x={WING.x0 - 1} y={51} width={WING.x1 - WING.x0 + 2} height={GROUND - 50} fill={INK} />
      <rect x={WING.x0} y={52} width={WING.x1 - WING.x0} height={GROUND - 52} fill={WALL} />
      <rect x={WING.x0} y={52} width={WING.x1 - WING.x0} height={2} fill="#000" opacity={0.1} />
      <rect x={WING.x0} y={GROUND - 4} width={WING.x1 - WING.x0} height={4} fill="#8d969c" />
      <rect x={WING.x0} y={52} width={2} height={GROUND - 56} fill={WHITE} />
      <rect x={WING.x1 - 2} y={52} width={2} height={GROUND - 56} fill={WHITE} />
      {WIN.map((x) => (
        <g key={x}>
          <path d={`M${x - 6} 75V61A6 6 0 0 1 ${x + 6} 61V75Z`} fill={INK} />
          <path d={`M${x - 5} 75V61A5 5 0 0 1 ${x + 5} 61V75Z`} fill={WHITE} />
          <path d={`M${x - 4} 74V61A4 4 0 0 1 ${x + 4} 61V74Z`} fill={glass} />
          <rect x={x - 0.5} y={57} width={1} height={17} fill={WHITE} />
          <rect x={x - 4} y={64} width={8} height={1} fill={WHITE} />
          <rect x={x - 4} y={69} width={8} height={1} fill={WHITE} />
        </g>
      ))}
      {/* Corpo do meio, que avança um pouco */}
      <rect x={BAY.x0 - 3} y={38} width={BAY.x1 - BAY.x0 + 6} height={GROUND - 38} fill="#000" opacity={0.12} />
      <rect x={BAY.x0 - 1} y={37} width={BAY.x1 - BAY.x0 + 2} height={GROUND - 37} fill={INK} />
      <rect x={BAY.x0} y={38} width={BAY.x1 - BAY.x0} height={GROUND - 38} fill={WALL} />
      <rect x={BAY.x0} y={GROUND - 4} width={BAY.x1 - BAY.x0} height={4} fill="#8d969c" />
      {[BAY.x0, BAY.x1 - 4].map((x) => (
        <g key={x}>
          <rect x={x} y={40} width={4} height={GROUND - 44} fill={WHITE} />
          <rect x={x + 3} y={40} width={1} height={GROUND - 44} fill={WHITE_SH} />
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={x + 1} y={43 + k * 5} width={2} height={2} fill={WHITE_SH} />
          ))}
        </g>
      ))}
      <rect x={BAY.x0 - 2} y={36} width={BAY.x1 - BAY.x0 + 4} height={3} fill={INK} />
      <rect x={BAY.x0 - 1} y={37} width={BAY.x1 - BAY.x0 + 2} height={2} fill={WHITE} />
      {/* Frontão com o olho redondo, a beirada de telha e a renda */}
      <g
        className="cw-tap"
        onClick={(e) => {
          e.stopPropagation();
          onLace();
        }}
        role="button"
        aria-label="Renda do telhado"
      >
        <path d={gable} fill={INK} transform="translate(0 -1.5)" />
        <path d={gable} fill={ROOF} transform="translate(0 -0.5)" />
        <path d={`M${CX - half + 2} ${base}L${CX} ${apex + 2}L${CX + half - 2} ${base}Z`} fill={WALL} />
        <path d={`M${CX - half + 6} ${base - 1}L${CX} ${apex + 6}L${CX + half - 6} ${base - 1}`} stroke={WHITE} strokeWidth={1} fill="none" />
        <circle cx={CX} cy={30} r={3} fill={INK} />
        <circle cx={CX} cy={30} r={2.4} fill={WHITE} />
        <circle cx={CX} cy={30} r={1.3} fill={night ? '#ffd76a' : '#3d5560'} />
        {lace()}
        <rect x={CX - 0.5} y={apex - 5} width={1} height={4} fill={WHITE} />
        <rect x={CX - 1.5} y={apex - 3} width={3} height={1} fill={WHITE} />
      </g>
    </g>
  );
});

/** Porta em arco com moldura branca enfeitada e sacadinha de ferro; aberta, mostra quem está dentro. */
function Door({ x, open, who, t, night }: { x: number; open: boolean; who: AvatarConfig; t: number; night: boolean }) {
  return (
    <g>
      {/* Moldura em arco com as volutas de cima */}
      <path d={`M${x - 5} 77V51A5 5 0 0 1 ${x + 5} 51V77Z`} fill={INK} />
      <path d={`M${x - 4} 77V51A4 4 0 0 1 ${x + 4} 51V77Z`} fill={WHITE} />
      <rect x={x - 5} y={44} width={1} height={2} fill={WHITE} />
      <rect x={x + 4} y={44} width={1} height={2} fill={WHITE} />
      <rect x={x - 1} y={43} width={2} height={2} fill={WHITE} />
      <path d={`M${x - 3} 76V51A3 3 0 0 1 ${x + 3} 51V76Z`} fill={open ? (night ? '#a8742e' : '#3a2a20') : night ? '#ffd76a' : '#3d5560'} />
      {open ? (
        <g>
          <svg x={x - 3} y={50} width={6} height={26} viewBox={`${x - 3} 50 6 26`} overflow="hidden">
            <Character x={x} y={78} config={who} frame={Math.sin(t * 10) > 0 ? 1 : 2} />
          </svg>
          <rect x={x - 5} y={52} width={1} height={24} fill="#e9e2d0" />
          <rect x={x + 4} y={52} width={1} height={24} fill="#e9e2d0" />
        </g>
      ) : (
        <g>
          <rect x={x - 0.5} y={52} width={1} height={24} fill={WHITE} />
          <rect x={x - 3} y={61} width={6} height={1} fill={WHITE} />
          <rect x={x - 3} y={66} width={6} height={10} fill={WHITE_SH} />
        </g>
      )}
      {/* Sacadinha de ferro */}
      <rect x={x - 5} y={69} width={10} height={1} fill={IRON} />
      {[-4, -2, 0, 2, 4].map((d) => (
        <rect key={d} x={x + d - 0.5} y={70} width={1} height={6} fill={IRON} />
      ))}
      <rect x={x - 3} y={72} width={6} height={1} fill={IRON} opacity={0.8} />
      <rect x={x - 5} y={76} width={10} height={1} fill={IRON} />
    </g>
  );
}

/** Agave: roseta de folhas pontudas verde-azuladas com a beirada amarela. */
const Agave = memo(function Agave({ x, s, shaking }: { x: number; s: number; shaking: boolean }) {
  const y = GROUND + 6;
  const leaves = [-75, -55, -35, -15, 5, 25, 45, 65, 82].map((a, i) => {
    const r = (a * Math.PI) / 180;
    const len = (i % 2 ? 10 : 13) * s;
    return { x2: x + Math.sin(r) * len, y2: y - Math.cos(r) * len * 0.8 };
  });
  return (
    <g className={`cw-tree ${shaking ? 'shake' : ''}`} style={{ animationDuration: shaking ? undefined : '3.6s', '--a': '1.5deg' } as CSSProperties}>
      <ellipse cx={x} cy={y} rx={10 * s} ry={1.6} fill="#000" opacity={0.15} />
      {leaves.map((l, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={l.x2} y2={l.y2} stroke="#2f5a4a" strokeWidth={2.6 * s} strokeLinecap="round" />
          <line x1={x} y1={y} x2={l.x2} y2={l.y2} stroke="#7aa58a" strokeWidth={1.6 * s} strokeLinecap="round" />
          <line x1={x} y1={y} x2={l.x2} y2={l.y2} stroke="#d6d27a" strokeWidth={0.4} />
        </g>
      ))}
    </g>
  );
});

/** Jardim: gramado, caminho de pedra portuguesa até a porta e os canteiros. */
const Garden = memo(function Garden({ night }: { night: boolean }) {
  const stones = useMemo(() => {
    const rand = seeded(23);
    const out: { x: number; y: number; c: string }[] = [];
    for (let i = 0; i < 520; i++) {
      const y = GROUND + rand() * (GROUND_END - GROUND);
      const half = 5 + ((y - GROUND) * 41) / 36;
      out.push({ x: CX - half + rand() * half * 2, y, c: rand() > 0.5 ? '#b9b29c' : '#f1ece0' });
    }
    return out;
  }, []);
  const grass = useMemo(() => {
    const rand = seeded(29);
    return Array.from({ length: 160 }, () => ({ x: FULL.x + 200 + rand() * (W + 300), y: GROUND + 1 + rand() * 30, c: rand() > 0.5 ? '#5f9c3a' : '#8cc63f' }));
  }, []);
  const lawn = night ? '#2c5a32' : '#7dbb45';
  return (
    <g>
      <rect x={FULL.x} y={GROUND} width={FULL.w} height={GROUND_END - GROUND} fill={lawn} />
      {grass.map((g, i) => (
        <rect key={i} x={g.x} y={g.y} width={2} height={1} fill={night ? '#22482a' : g.c} />
      ))}
      <path d={`M${CX - 7} ${GROUND}L${CX + 7} ${GROUND}L${CX + PATH_END} ${GROUND_END}L${CX - PATH_END} ${GROUND_END}Z`} fill="#b9b29c" />
      <path d={`M${CX - 6} ${GROUND}L${CX + 6} ${GROUND}L${CX + PATH_END - 2} ${GROUND_END}L${CX - PATH_END + 2} ${GROUND_END}Z`} fill={night ? '#9d9888' : '#e3ddcc'} />
      {stones.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={1.4} height={1} fill={s.c} />
      ))}
      {/* Canteiro de terra em volta das agaves */}
      <ellipse cx={CX} cy={GROUND + 6} rx={70} ry={4} fill="#8a6f4a" opacity={0.35} />
    </g>
  );
});

/** Laguinhos dos dois lados da pontezinha, com folhas boiando. */
const Ponds = memo(function Ponds({ time }: { time: DayTime }) {
  const water = time === 'night' ? '#163f46' : time === 'dusk' ? '#6a7f86' : '#4f9a8f';
  return (
    <g>
      {[POND_L, POND_R].map((p, i) => (
        <g key={i}>
          <ellipse cx={p.cx} cy={p.cy} rx={p.rx + 2} ry={p.ry + 2} fill="#9d977f" />
          <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={water} />
          <ellipse cx={p.cx} cy={p.cy - 2} rx={p.rx - 6} ry={p.ry - 5} fill="#ffffff" opacity={0.12} />
        </g>
      ))}
      {PADS.map((p) => (
        <g key={p.x}>
          <ellipse cx={p.x} cy={p.y} rx={4} ry={1.6} fill="#2f7d32" />
          <ellipse cx={p.x - 0.5} cy={p.y - 0.3} rx={3} ry={1} fill="#4caf50" />
        </g>
      ))}
    </g>
  );
});

/** Corrimãos de madeira da pontezinha, bem perto de quem olha. */
function Railing({ x0, x1 }: { x0: number; x1: number }) {
  const wood = '#9a7450';
  const light = '#c49a6a';
  return (
    <g>
      {[x0, x1].map((x) => (
        <g key={x}>
          <rect x={x - 2.5} y={93} width={5} height={GROUND_END - 93} fill={INK} />
          <rect x={x - 1.5} y={94} width={3} height={GROUND_END - 94} fill={wood} />
          <rect x={x - 1.5} y={94} width={1} height={GROUND_END - 94} fill={light} />
        </g>
      ))}
      <rect x={x0 - 4} y={92} width={x1 - x0 + 8} height={4} fill={INK} />
      <rect x={x0 - 3} y={93} width={x1 - x0 + 6} height={2} fill={wood} />
      <rect x={x0 - 3} y={93} width={x1 - x0 + 6} height={1} fill={light} />
      <rect x={x0} y={102} width={x1 - x0} height={2} fill={INK} />
      <rect x={x0} y={102} width={x1 - x0} height={1} fill={wood} />
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

const AREA = { x0: -20, x1: W + 20, y0: 40, y1: 100 };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), y: Math.round(rnd(GROUND + 4, GROUND + 9)), tx: rnd(20, W - 20), speed: rnd(8, 12), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(30, 90)), newWalker(rnd(210, 290)), newWalker()],
    frog: { pad: 1, from: 1, t0: -10 },
    bird: { at: 'roof' as 'roof' | 'palm' | 'fly', t0: 0, back: 0, sx: CX, sy: GABLE.apex - 5, tx: CX, ty: GABLE.apex - 5 },
    doorUntil: [0, 0, 0],
    doorWho: [randomLook(), randomLook(), randomLook()],
    timers: { leaf: rnd(1, 3), mote: 0, croak: rnd(5, 10) },
  };
}

/* ---- Componente ---- */

export const ChacaraScene = memo(function ChacaraScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(GROUND + 1, 53, { blocks: 6 }), []);
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

    // O bem-te-vi volta para o telhado depois de um tempo na palmeira
    const b = L.bird;
    if (b.at === 'fly' && t - b.t0 > 1.4) Object.assign(b, { at: b.ty < 30 ? 'roof' : 'palm', sx: b.tx, sy: b.ty, back: t + rnd(5, 9) });
    if (b.at === 'palm' && t > b.back) flyBird(CX, GABLE.apex - 5);

    // O sapo coaxa de vez em quando
    L.timers.croak -= dt;
    if (L.timers.croak <= 0) {
      L.timers.croak = rnd(8, 16);
      const p = PADS[L.frog.pad];
      for (let i = 0; i < 2; i++) spawn('ripple', p.x + rnd(-2, 2), p.y + 1, { life: 1, c: '#d6f6fa' });
    }

    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      spawn('leaf', pick([30, 60, 240, 260]) + rnd(-10, 10), rnd(30, 50), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a']), floor: rnd(GROUND + 2, 98) });
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

  function flyBird(tx: number, ty: number) {
    const b = life.current.bird;
    const [sx, sy] = birdPos(clock.current);
    Object.assign(b, { at: 'fly', t0: clock.current, sx, sy, tx, ty });
  }

  function birdPos(t: number): [number, number] {
    const b = life.current.bird;
    if (b.at !== 'fly') return [b.sx, b.sy];
    const k = clamp((t - b.t0) / 1.4, 0, 1);
    return [b.sx + (b.tx - b.sx) * k, b.sy + (b.ty - b.sy) * k - Math.sin(Math.PI * k) * 14];
  }

  const tapLace = useCallback(() => {
    if (!guard()) return;
    sfx('pop');
    for (let i = 0; i < 10; i++) spawn('spark', CX + rnd(-20, 20), rnd(20, 38), { life: rnd(0.5, 0.9), vx: rnd(-6, 6), vy: rnd(-8, 2), c: '#ffffff' });
    say('renda', CX, GABLE.apex - 4, pick(['Uma renda de madeira! 🤍', 'Que enfeite caprichado! 🤍', 'Parece bordado, né? 🧵']), 3);
    discover('renda');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discover]);

  const tapDoor = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    sfx('creak');
    L.doorUntil[i] = clock.current + 4.5;
    L.doorWho[i] = randomLook();
    say(`porta${i}`, DOORS[i], 46, pick([`Oi! Seja ${byGender('bem-vindo', 'bem-vinda')}! 👋`, 'Que bom que você veio! 😊', 'Entra pra conhecer! 🏡']), 3);
    discover('janela');
  };

  const tapAgave = (i: number) => {
    if (!guard()) return;
    const id = `a${i}`;
    setShaking(id);
    setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
    sfx('rustle');
    say(id, AGAVES[i].x, GROUND - 8, pick(['Cuidado, é pontuda! 🌵', 'Essa planta é a agave! 🌵']), 2.4);
    discover('agave');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      for (let i = 0; i < 8; i++)
        spawn('leaf', x + rnd(-14, 14), top + rnd(-6, 10), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: rnd(GROUND + 2, 98) });
      if (Math.random() < 0.5) {
        setTimeout(() => sfx('chirp'), 120);
        ambient.current.flocks.push({ id: uid(), x, y: top, vx: pick([-1, 1]) * rnd(28, 40), vy: -rnd(14, 22), birds: [{ dx: 0, dy: 0, ph: rnd(0, 6) }] });
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapFrog = () => {
    if (!guard()) return;
    const f = life.current.frog;
    if (clock.current - f.t0 < 0.8) return;
    sfx('ribbit');
    const p = PADS[f.pad];
    say('sapo', p.x, p.y - 8, pick(['Croac! 🐸', 'Croac, croac! 🐸', 'Que pulo! 🐸']), 2);
    const same = f.pad < 3 ? [0, 1, 2] : [3, 4, 5];
    Object.assign(f, { from: f.pad, pad: pick(same.filter((k) => k !== f.pad)), t0: clock.current });
    setTimeout(() => {
      const q = PADS[life.current.frog.pad];
      spawn('ripple', q.x, q.y + 1, { life: 1, c: '#d6f6fa' });
      for (let i = 0; i < 3; i++) spawn('drop', q.x, q.y, { vx: rnd(-8, 8), vy: rnd(-16, -8), life: 1.2, c: '#bfeaf2', floor: q.y + 1 });
    }, 600);
    discover('sapo');
  };

  const tapRail = (side: number) => {
    if (!guard()) return;
    sfx('creak');
    say(`ponte${side}`, side ? 186 : 114, 88, pick(['Nheec! Ponte de madeira! 🪵', 'Por baixo passa o laguinho! 💧']), 2.4);
    discover('ponte');
  };

  const tapBird = () => {
    if (!guard()) return;
    sfx('chirp');
    setTimeout(() => sfx('chirp'), 220);
    const [x, y] = birdPos(clock.current);
    say('passaro', x, y - 6, 'Bem-te-vi! Bem-te-vi! 🐦', 2.6);
    if (life.current.bird.at === 'roof') flyBird(PALMS[0] + 2, 40);
    else flyBird(CX, GABLE.apex - 5);
    discover('passaro');
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
    if (!pt) return;
    const inPond = [POND_L, POND_R].some((p) => ((pt.x - p.cx) / p.rx) ** 2 + ((pt.y - p.cy) / p.ry) ** 2 < 1);
    if (inPond) {
      sfx('splash');
      spawn('ripple', pt.x, pt.y, { life: 1.1, c: '#d6f6fa' });
      for (let i = 0; i < 4; i++) spawn('drop', pt.x, pt.y, { vx: rnd(-8, 8), vy: rnd(-18, -8), life: 1.3, c: '#bfeaf2', floor: pt.y });
    } else if (pt.y > GROUND) spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  // Sapo: em cima da folha ou no meio do pulo
  const f = L.frog;
  const fk = clamp((t - f.t0) / 0.6, 0, 1);
  const fa = PADS[f.from];
  const fb = PADS[f.pad];
  const frogX = fa.x + (fb.x - fa.x) * fk;
  const frogY = fa.y + (fb.y - fa.y) * fk - Math.sin(Math.PI * fk) * 10;
  const [birdX, birdY] = birdPos(t);
  const flying = L.bird.at === 'fly';

  const entities: { key: string; y: number; node: ReactNode }[] = [
    ...AGAVES.map((a, i) => ({
      key: `a${i}`,
      y: GROUND + 6,
      node: (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapAgave(i);
          }}
        >
          <rect x={a.x - 12 * a.s} y={GROUND - 6 * a.s} width={24 * a.s} height={14 * a.s} fill="transparent" />
          <Agave x={a.x} s={a.s} shaking={shaking === `a${i}`} />
        </g>
      ),
    })),
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
          <radialGradient id="ch-glow">
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
        <Garden night={night} />

        {/* Árvores e palmeiras atrás e dos lados da casa */}
        <BigTree id="t1" x={34} ground={GROUND + 2} s={3.6} shaking={shaking === 't1'} onTap={tapTree} />
        <BigTree id="t2" x={70} ground={GROUND} s={2.8} shaking={shaking === 't2'} onTap={tapTree} />
        <BigTree id="t3" x={300} ground={GROUND + 2} s={3.4} shaking={shaking === 't3'} onTap={tapTree} />
        <House night={night} onLace={tapLace} />
        {DOORS.map((x, i) => (
          <g
            key={x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapDoor(i);
            }}
          >
            <Door x={x} open={t < L.doorUntil[i]} who={L.doorWho[i]} t={t} night={night} />
          </g>
        ))}
        {PALMS.map((x, i) => (
          <g
            key={x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapTree(`p${x}`, x, 40);
            }}
          >
            <g className={`cw-tree ${shaking === `p${x}` ? 'shake' : ''}`} style={{ animationDuration: shaking === `p${x}` ? undefined : `${4 + i * 0.7}s`, '--a': '1deg' } as CSSProperties}>
              {/* Tronco comprido e fino, com a copa da palmeira lá em cima */}
              <rect x={x - 1.5} y={36 + i * 4} width={3} height={GROUND + 2 - 36 - i * 4} fill="#6b4423" />
              <rect x={x - 1.5} y={36 + i * 4} width={1} height={GROUND + 2 - 36 - i * 4} fill="#8a6a4a" />
              <g transform={`translate(${x} ${22 + i * 4}) scale(2) translate(-9 0)`}>
                <Pixels runs={palmRuns} />
              </g>
            </g>
          </g>
        ))}
        {/* Banco do jardim */}
        <g>
          <rect x={210} y={GROUND + 3} width={16} height={2} fill="#5c3a1c" />
          <rect x={210} y={GROUND} width={16} height={1} fill="#2e7d4a" />
          <rect x={210} y={GROUND + 2} width={16} height={1} fill="#3a8a55" />
          <rect x={211} y={GROUND + 4} width={1} height={4} fill={INK} />
          <rect x={224} y={GROUND + 4} width={1} height={4} fill={INK} />
        </g>

        {entities.map((e) => (
          <g key={e.key}>{e.node}</g>
        ))}

        {/* Bem-te-vi */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapBird();
          }}
          role="button"
          aria-label="Bem-te-vi"
        >
          <rect x={birdX - 5} y={birdY - 6} width={10} height={9} fill="transparent" />
          <g transform={`translate(${(birdX - 3).toFixed(2)} ${(birdY - 6).toFixed(2)})`}>
            <Pixels runs={kiskadee} />
            {flying && <rect x={1} y={Math.sin(t * 30) > 0 ? -1 : 3} width={4} height={1} fill="#3a2a1e" />}
          </g>
        </g>

        {/* Pontezinha e laguinhos, bem na frente */}
        <Ponds time={time} />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapFrog();
          }}
          role="button"
          aria-label="Sapinho"
        >
          <rect x={frogX - 6} y={frogY - 7} width={12} height={9} fill="transparent" />
          <g transform={`translate(${(frogX - 3.5).toFixed(2)} ${(frogY - 5).toFixed(2)})`}>
            <Pixels runs={frogRuns} />
          </g>
        </g>
        {[
          [100, 128],
          [172, 200],
        ].map(([a, b], i) => (
          <g
            key={a}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapRail(i);
            }}
          >
            <Railing x0={a} x1={b} />
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
            <g pointerEvents="none">
              {[...DOORS, ...WIN].map((x) => (
                <circle key={x} cx={x} cy={62} r={8} fill="url(#ch-glow)" opacity={0.55} />
              ))}
              <circle cx={CX} cy={30} r={6} fill="url(#ch-glow)" opacity={0.6} />
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
        firstTip="Toque na casa, no jardim e no laguinho para descobrir! 👆"
        dragText="👈 Arraste para ver a chácara toda 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
