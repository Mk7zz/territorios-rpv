import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { BRIDGE_DARK, BRIDGE_LIGHT, BRIDGE_RED } from '../../components/Landmarks';
import { Pixels, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { seeded, shade, type Run } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import { palmRuns } from './PlaceScene';
import {
  BackTree,
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
  flyAway,
  type Discovery,
  type Particle,
} from './sceneKit';

/*
 * Visita à Ponte Metálica (a "Ponte Velha", 1915) sobre o Rio Pomba, vista da beira do rio:
 * - a treliça vermelha de ferro com as duas torres em cima dos pilares e o banzo de cima "afundando"
 *   entre elas, refletida na água; à noite as luzes da ponte acendem e aparecem de novo no rio;
 * - carros, pessoas e uma criança de bicicleta atravessam; lambaris pulam, a garça voa de um canto
 *   para outro e o pescador da beira do rio às vezes pega um peixe.
 * Tudo responde ao toque e cada coisa nova vira uma descoberta (achar todas vale estrelas).
 */

/** Meio da ponte (as duas torres); em tela estreita, a torre da esquerda e o pescador. */
const FOCUS = (vw: number) => (vw < 200 ? 104 : 160);
/** Chão da ponte (pés de quem atravessa). */
const DECK = 64;
/** Onde a margem de lá encontra a água. */
const BANK = 72;
/** Onde os pilares encostam na água (eixo do reflexo). */
const WL = 84;
const MID = 160;
const TOWERS = [60, 260];
const SPAN = { x0: -50, x1: 370 };
const TOWER_H = 48;
const FISHER = { x: 38, y: 93 };
const BOBBER = { x: 86, y: 104 };
/** Distância entre os nós da treliça. */
const PANEL = 14;

/** Altura do banzo de cima acima do tabuleiro: alto nas torres, mais baixo no meio e nas pontas. */
function rise(x: number) {
  const a = Math.abs(x - MID);
  if (a <= 100) return 24 + 18 * (a / 100) ** 2;
  const k = Math.min(1, (a - 100) / 110);
  return 16 + 26 * (1 - k) ** 2;
}
const chordY = (x: number) => Math.round(DECK - rise(x));

/** Topo das margens da frente (esquerda e direita) em cada coluna; abaixo disso é terra, não água. */
function bankTop(x: number) {
  const lerp = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax);
    }
    return null;
  };
  return lerp([[-EDGE - 20, 88], [10, 90], [50, 95], [70, 100], [82, 108], [88, H + 8]]) ?? lerp([[232, H + 8], [240, 106], [252, 101], [280, 99], [W + EDGE + 20, 96]]) ?? H + 8;
}
const inWater = (x: number, y: number) => y > BANK + 1 && y < bankTop(x) && !TOWERS.some((tx) => Math.abs(x - tx) < 9 && y < WL + 2);

const DISCOVERIES: Discovery[] = [
  { key: 'ponte', emoji: '🌉', label: 'A Ponte Velha', tip: 'Toque na ponte de ferro! 🌉' },
  { key: 'luzes', emoji: '💡', label: 'As luzes da ponte', tip: 'Toque nas luzinhas da ponte! 💡' },
  { key: 'carro', emoji: '🚗', label: 'Os carros', tip: 'Toque num carro atravessando a ponte! 🚗' },
  { key: 'gente', emoji: '👋', label: 'Quem atravessa a pé', tip: 'Dê um oi pra quem atravessa a ponte! 👋' },
  { key: 'peixe', emoji: '🐟', label: 'Os lambaris do rio', tip: 'Toque na água do rio! 🐟' },
  { key: 'garca', emoji: '🦢', label: 'A garça branca', tip: 'Ache a garça branca na beira do rio! 🦢' },
  { key: 'pescador', emoji: '🎣', label: 'O pescador', tip: 'Tem um pescador na beira do rio. Toque nele! 🎣' },
  { key: 'arvore', emoji: '🌴', label: 'As árvores da beira do rio', tip: 'Toque nas palmeiras e nas árvores! 🌴' },
];

const FACTS = ['Ponte Velha, desde 1915! 🌉', 'Feita de ferro e rebites! 🔩', 'Tem mais de 100 anos! 🎂', 'Ela atravessa o Rio Pomba! 🏞️', 'Plém! Ferro forte! 💪'];
const LINES_DAY = ['Oi! 👋', 'Que rio bonito! 🏞️', 'Bom dia! ☀️', 'Olha a garça! 🦢', 'Vou pro outro lado! 🚶', 'Que ponte linda! 🌉'];
const LINES_NIGHT = ['Boa noite! 🌙', 'A ponte acesa é linda! 💡', 'Olha o reflexo no rio! ✨', 'Vou pra casa! 🏠'];
const WATER_C: Record<DayTime, [string, string]> = { day: ['#86b8a2', '#3c6e5d'], dusk: ['#cf9f8c', '#45606a'], night: ['#204856', '#07252d'] };

/* ---- Sprites ---- */

const HERON_PAL = { w: '#fbfbf6', g: '#cfd6d8', k: INK, y: '#f2b705', l: '#3a3f42' };
const heronStand = sprite(['...ww...', '..wwkyyy', '...ww...', '....w...', '...w....', '..ww....', '.wwwww..', 'wwwwwww.', '.wgwwwww', '..ggwwww', '....ll..', '....l...', '....l...', '....l...'], HERON_PAL);
const heronFish = sprite(['........', '........', '........', '........', '........', '..ww....', '.wwwwww.', 'wwwwwwww', '.wgwwwwk', '..ggww.yy', '....ll..', '....l...', '....l...', '....l...'], HERON_PAL);
const heronUp = sprite(['....ww......', '...wwww.....', '..wwwwww....', '.....wwwwkyy', 'll.wwwwww...'], HERON_PAL);
const heronDown = sprite(['.....wwwwkyy', 'll.wwwwww...', '..wwwwww....', '...wwww.....', '....ww......'], HERON_PAL);

const fisherRuns = sprite(
  ['..hhhhh.....', '.hhhhhhh....', 'HHHHHHHHHH..', '..sssss.....', '..sssEs.....', '..ssss......', '.ccccc......', '.cccccss....', '.ccccc......', '.ppppppppp..', '.ppppppppp..', '.ww.....pp..', '.ww.....pp..', '.ww.....bbb.'],
  { h: '#e8c86a', H: '#d4a94a', s: '#e0a878', E: INK, c: '#d64545', p: '#5b4a3a', w: '#8a5a2b', b: '#3a2a1e' },
);

/* ---- Ponte ---- */

/** Desenhos da treliça (gerados uma vez): banzo de cima, montantes e diagonais em zigue-zague. */
function trussShapes(dx: number, dy: number, diagonals = true) {
  let chord = '';
  let shine = '';
  for (let x = SPAN.x0; x < SPAN.x1; x++) {
    const y = chordY(x) + dy;
    chord += `M${x + dx} ${y}h1v3h-1z`;
    shine += `M${x + dx} ${y}h1v1h-1z`;
  }
  let bars = '';
  for (let i = 0, x = SPAN.x0; x < SPAN.x1; x += PANEL, i++) {
    const nx = x + PANEL;
    const top = chordY(x) + dy + 2;
    const ntop = chordY(nx) + dy + 2;
    const bot = DECK + dy - 1;
    bars += `M${x + dx + 0.5} ${top}V${bot}`;
    // Diagonais em zigue-zague: formam os "V" da treliça.
    if (diagonals) bars += i % 2 ? `M${x + dx + 0.5} ${top}L${nx + dx + 0.5} ${bot}` : `M${x + dx + 0.5} ${bot}L${nx + dx + 0.5} ${ntop}`;
  }
  // Área de toque: tudo entre o banzo de cima e o tabuleiro.
  let hit = `M${SPAN.x0} ${DECK + 4}`;
  for (let x = SPAN.x0; x <= SPAN.x1; x += 5) hit += ` L${x} ${chordY(x) - 2}`;
  hit += ` L${SPAN.x1} ${DECK + 4} Z`;
  return { chord, shine, bars, hit };
}
const NEAR = trussShapes(0, 0);
const FAR = trussShapes(4, -3, false);

/** Luzinhas da ponte: em cima do banzo, num nó sim e outro não, e no alto das torres. */
const LAMPS = [
  ...Array.from({ length: 15 }, (_, i) => SPAN.x0 + PANEL * (2 * i + 1)).map((x) => ({ x, y: chordY(x) - 1 })),
  ...TOWERS.map((x) => ({ x, y: DECK - TOWER_H - 2 })),
].sort((a, b) => a.x - b.x);

/** Lado de trás da ponte: treliça escura, viga e o asfalto do tabuleiro. Também recebe o toque na ponte. */
const BackTruss = memo(function BackTruss({ onTap }: { onTap: (e: MouseEvent) => void }) {
  return (
    <g>
      <path d={FAR.hit} fill="transparent" className="cw-tap" onClick={onTap} />
      <g pointerEvents="none">
        <g opacity={0.75}>
          <path d={FAR.bars} stroke={shade(BRIDGE_DARK, -0.15)} strokeWidth={1} fill="none" />
          <path d={FAR.chord} fill={BRIDGE_DARK} />
        </g>
        {TOWERS.map((tx) => (
          <g key={tx} fill={shade(BRIDGE_DARK, -0.1)}>
            <rect x={tx - 1} y={DECK - TOWER_H - 3} width={2} height={TOWER_H} />
            <rect x={tx + 6} y={DECK - TOWER_H - 3} width={2} height={TOWER_H} />
          </g>
        ))}
        <rect x={SPAN.x0} y={DECK - 5} width={SPAN.x1 - SPAN.x0} height={2} fill={BRIDGE_DARK} />
        <rect x={SPAN.x0} y={DECK - 3} width={SPAN.x1 - SPAN.x0} height={3} fill="#8f8a80" />
        <rect x={SPAN.x0} y={DECK - 2} width={SPAN.x1 - SPAN.x0} height={1} fill="#a39d90" />
      </g>
    </g>
  );
});

/** Torre em cima do pilar: dois montantes com travas em X e o pórtico com a lanterna no alto. */
function Tower({ x }: { x: number }) {
  const top = DECK - TOWER_H;
  const xs: ReactNode[] = [];
  for (let y = top + 4; y < DECK - 6; y += 8) {
    xs.push(<path key={`x${y}`} d={`M${x - 2.5} ${y}L${x + 3.5} ${y + 8}M${x + 3.5} ${y}L${x - 2.5} ${y + 8}`} stroke={BRIDGE_RED} strokeWidth={1} />);
    xs.push(<rect key={`h${y}`} x={x - 3} y={y} width={7} height={1} fill={BRIDGE_DARK} />);
  }
  return (
    <g>
      <rect x={x - 6} y={top - 1} width={4} height={TOWER_H + 1} fill={INK} />
      <rect x={x + 3} y={top - 1} width={4} height={TOWER_H + 1} fill={INK} />
      <rect x={x - 5} y={top} width={2} height={TOWER_H} fill={BRIDGE_RED} />
      <rect x={x + 4} y={top} width={2} height={TOWER_H} fill={BRIDGE_RED} />
      <rect x={x - 5} y={top} width={1} height={TOWER_H} fill={BRIDGE_LIGHT} />
      <rect x={x + 4} y={top} width={1} height={TOWER_H} fill={BRIDGE_LIGHT} />
      {xs}
      {/* Pórtico */}
      <rect x={x - 8} y={top - 4} width={17} height={4} fill={INK} />
      <rect x={x - 7} y={top - 3} width={15} height={2} fill={BRIDGE_RED} />
      <rect x={x - 7} y={top - 3} width={15} height={1} fill={BRIDGE_LIGHT} />
      <rect x={x - 1} y={top - 6} width={3} height={2} fill={INK} />
    </g>
  );
}

/** Lado da frente da ponte: treliça vermelha, torres e a viga com os rebites. Não pega o toque (passa para quem está atrás). */
const FrontTruss = memo(function FrontTruss() {
  return (
    <g pointerEvents="none">
      <path d={NEAR.bars} transform="translate(1 1)" stroke={BRIDGE_DARK} strokeWidth={1} fill="none" />
      <path d={NEAR.bars} stroke={BRIDGE_RED} strokeWidth={1} fill="none" />
      <path d={NEAR.chord} transform="translate(0 1)" fill={INK} />
      <path d={NEAR.chord} fill={BRIDGE_RED} />
      <path d={NEAR.shine} fill={BRIDGE_LIGHT} />
      {/* Guarda-corpo da calçada */}
      <rect x={SPAN.x0} y={DECK - 7} width={SPAN.x1 - SPAN.x0} height={1} fill={BRIDGE_LIGHT} />
      {Array.from({ length: Math.ceil((SPAN.x1 - SPAN.x0) / 4) }, (_, i) => (
        <rect key={i} x={SPAN.x0 + i * 4} y={DECK - 6} width={1} height={6} fill={BRIDGE_RED} opacity={0.6} />
      ))}
      {TOWERS.map((x) => (
        <Tower key={x} x={x} />
      ))}
      {/* Viga do tabuleiro com rebites */}
      <rect x={SPAN.x0} y={DECK - 1} width={SPAN.x1 - SPAN.x0} height={6} fill={INK} />
      <rect x={SPAN.x0} y={DECK} width={SPAN.x1 - SPAN.x0} height={4} fill={BRIDGE_RED} />
      <rect x={SPAN.x0} y={DECK} width={SPAN.x1 - SPAN.x0} height={1} fill={BRIDGE_LIGHT} />
      <rect x={SPAN.x0} y={DECK + 3} width={SPAN.x1 - SPAN.x0} height={1} fill={BRIDGE_DARK} />
      {Array.from({ length: Math.ceil((SPAN.x1 - SPAN.x0) / 4) }, (_, i) => (
        <rect key={`r${i}`} x={SPAN.x0 + 1 + i * 4} y={DECK + 2} width={1} height={1} fill="#f0a493" />
      ))}
    </g>
  );
});

/** Pilares: dois cilindros em cima da sapata de concreto, e as cabeceiras de pedra nas pontas. */
const Piers = memo(function Piers() {
  return (
    <g>
      {TOWERS.map((tx) => (
        <g key={tx}>
          {[tx - 5, tx + 2].map((px) => (
            <g key={px}>
              <rect x={px - 1} y={DECK + 4} width={6} height={WL - DECK - 4} fill={INK} />
              <rect x={px} y={DECK + 4} width={4} height={WL - DECK - 5} fill="#c4584a" />
              <rect x={px} y={DECK + 4} width={1} height={WL - DECK - 5} fill="#e07f6c" />
              <rect x={px + 3} y={DECK + 4} width={1} height={WL - DECK - 5} fill="#93382e" />
              <rect x={px - 1} y={DECK + 7} width={6} height={1} fill="#93382e" />
            </g>
          ))}
          <rect x={tx - 9} y={WL - 3} width={19} height={5} fill={INK} />
          <rect x={tx - 8} y={WL - 2} width={17} height={3} fill="#b5ad9c" />
          <rect x={tx - 8} y={WL - 2} width={17} height={1} fill="#d6cfba" />
        </g>
      ))}
      {[SPAN.x0 - 40, SPAN.x1].map((x) => (
        <g key={x}>
          <rect x={x} y={DECK - 3} width={40} height={WL - DECK + 6} fill="#9a8f7a" />
          {Array.from({ length: 5 }, (_, r) => (
            <rect key={r} x={x} y={DECK + r * 5} width={40} height={1} fill="#7d735f" />
          ))}
          <rect x={x} y={DECK - 4} width={40} height={2} fill="#6fae3c" />
        </g>
      ))}
    </g>
  );
});

/** Margem de lá: grama e árvores na beira d'água (na frente das serras, atrás da ponte). */
function FarBank({ time }: { time: DayTime }) {
  const night = time === 'night';
  return (
    <g>
      <rect x={FULL.x} y={BANK - 8} width={FULL.w} height={9} fill={night ? '#1f4a33' : time === 'dusk' ? '#5f7a4a' : '#4f9a3a'} />
      <rect x={FULL.x} y={BANK - 1} width={FULL.w} height={2} fill={night ? '#173826' : '#3d7a2c'} />
    </g>
  );
}

/** Margens da frente (onde fica o pescador e onde a garça pousa), com grama e pedrinhas. */
const NearBanks = memo(function NearBanks({ night }: { night: boolean }) {
  const cols = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let x = -EDGE - 20; x <= W + EDGE + 20; x++) {
      const y = bankTop(x);
      if (y < H + 6) out.push({ x, y: Math.round(y) });
    }
    return out;
  }, []);
  const rand = useMemo(() => seeded(5), []);
  const pebbles = useMemo(() => cols.filter((_, i) => i % 7 === 0).map((c) => ({ x: c.x, y: c.y + 4 + Math.floor(rand() * 8), c: rand() > 0.5 ? '#b9ad8c' : '#8d826a' })), [cols, rand]);
  return (
    <g>
      {cols.map((c) => (
        <g key={c.x}>
          <rect x={c.x} y={c.y} width={1} height={GROUND_END - c.y} fill={night ? '#4a3f30' : '#8a6f4a'} />
          <rect x={c.x} y={c.y} width={1} height={2} fill={night ? '#2c5a32' : '#5fae3c'} />
          <rect x={c.x} y={c.y + 2} width={1} height={1} fill={night ? '#22482a' : '#3f8a2c'} />
        </g>
      ))}
      {pebbles.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={2} height={1} fill={p.c} />
      ))}
      {/* Pedra no meio do rio, onde a garça às vezes pousa */}
      <rect x={190} y={103} width={13} height={4} fill={INK} />
      <rect x={191} y={102} width={11} height={4} fill="#8d969c" />
      <rect x={192} y={102} width={6} height={1} fill="#b5bec3" />
    </g>
  );
});

/* ---- Coisas vivas ---- */

interface Car {
  id: number;
  x: number;
  dir: 1 | -1;
  speed: number;
  runs: Run[];
}

interface Walker {
  id: number;
  x: number;
  tx: number;
  speed: number;
  walk: number;
  wait: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
  bike?: boolean;
}

interface Heron {
  x: number;
  y: number;
  face: 1 | -1;
  mode: 'stand' | 'fish' | 'fly';
  next: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t0: number;
  dur: number;
}

interface Lambari {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  hidden: number;
}

const HERON_SPOTS = [
  { x: 270, y: 99 },
  { x: TOWERS[0] + 6, y: WL - 3 },
  { x: TOWERS[1] - 5, y: WL - 3 },
  { x: 196, y: 102 },
];
const FISH_AREA = { x0: 92, x1: 230, y0: 88, y1: 108 };
const AREA = { x0: -20, x1: W + 20, y0: BANK - 4, y1: 104 };

function newWalker(x?: number): Walker {
  return { id: uid(), x: x ?? pick([-60, W + 60]), tx: rnd(20, W - 20), speed: rnd(9, 14), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function newCar(): Car {
  const dir = pick([1, -1] as const);
  return { id: uid(), x: dir > 0 ? -EDGE - 30 : W + EDGE + 30, dir, speed: rnd(28, 40), runs: pick(carRuns) };
}

function initLife() {
  return {
    walkers: [newWalker(rnd(40, 120)), newWalker(rnd(200, 280)), newWalker(), { ...newWalker(-60), bike: true, tx: W + 60, speed: 28, wait: rnd(3, 6) }],
    cars: [] as Car[],
    carTimer: rnd(0.5, 2),
    heron: { ...HERON_SPOTS[0], face: -1, mode: 'stand', next: rnd(2, 5), sx: 0, sy: 0, tx: 0, ty: 0, t0: 0, dur: 1 } as Heron,
    fish: Array.from({ length: 6 }, (): Lambari => {
      const x = rnd(FISH_AREA.x0, FISH_AREA.x1);
      const y = rnd(FISH_AREA.y0, FISH_AREA.y1);
      return { x, y, tx: x, ty: y, speed: rnd(6, 12), hidden: 0 };
    }),
    particles: [] as Particle[],
    timers: { spark: 0, leaf: rnd(1, 3), mote: 0, jump: rnd(4, 9), twinkle: 0 },
    shake: 0,
    chase: -10,
    pull: -10,
  };
}

/* ---- Componente ---- */

export const PonteScene = memo(function PonteScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(BANK - 4, 21, { blocks: 8 }), []);
  const trees = useMemo(() => {
    const rand = seeded(13);
    return [-150, -122, -96, -70, -34, -8, 18, 44, 70, 98, 124, 150, 176, 204, 230, 258, 284, 312, 338, 366, 394, 420].map((x) => ({ x: x + Math.round(rand() * 8), dur: 3.4 + rand() * 3, delay: -rand() * 6 }));
  }, []);
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

    // Carros atravessando a ponte (um de cada vez em cada mão)
    L.carTimer -= dt;
    if (L.carTimer <= 0 && L.cars.length < 3) {
      L.carTimer = rnd(3, 8);
      const c = newCar();
      if (!L.cars.some((o) => o.dir === c.dir && Math.abs(o.x - c.x) < 60)) L.cars.push(c);
    }
    for (const c of L.cars) {
      const ahead = L.cars.find((o) => o !== c && o.dir === c.dir && (o.x - c.x) * c.dir > 0 && (o.x - c.x) * c.dir < 30);
      c.x += c.dir * (ahead ? Math.min(c.speed, ahead.speed) : c.speed) * dt;
    }
    L.cars = L.cars.filter((c) => c.x > -EDGE - 40 && c.x < W + EDGE + 40);

    // Pessoas atravessando a pé (às vezes param para olhar o rio)
    for (const w of L.walkers) {
      if (w.wait > 0) {
        w.wait -= dt;
        w.walk = 0;
        continue;
      }
      const dx = w.tx - w.x;
      if (Math.abs(dx) < 0.8) {
        if (w.bike) {
          Object.assign(w, { wait: rnd(5, 12), tx: w.x < 0 ? W + 60 : -60, config: randomLook() });
          continue;
        }
        if (w.x < -50 || w.x > W + 50) {
          Object.assign(w, newWalker());
          continue;
        }
        w.wait = rnd(1.2, 4);
        if (Math.random() < 0.35 && t > w.sayUntil) {
          w.say = pick(night ? LINES_NIGHT : LINES_DAY);
          w.sayUntil = t + 2.6;
        }
        w.tx = Math.random() < 0.3 ? pick([-60, W + 60]) : rnd(10, W - 10);
      } else {
        w.x += Math.sign(dx) * Math.min(Math.abs(dx), w.speed * dt);
        w.walk += dt;
      }
    }

    // Garça: fica parada, às vezes abaixa para pescar e, de vez em quando, voa para outro canto
    const g = L.heron;
    if (g.mode === 'fly') {
      if (t - g.t0 >= g.dur) Object.assign(g, { x: g.tx, y: g.ty, mode: 'stand', next: t + rnd(4, 9) });
    } else if (t > g.next) {
      const r = Math.random();
      if (r < 0.2) flyHeron();
      else if (r < 0.6) Object.assign(g, { mode: g.mode === 'fish' ? 'stand' : 'fish', next: t + rnd(1, 2.5) });
      else Object.assign(g, { face: g.face === 1 ? -1 : 1, next: t + rnd(1.5, 4) });
    }

    // Lambaris nadando (e pulando de vez em quando)
    for (const k of L.fish) {
      if (t < k.hidden) continue;
      const dx = k.tx - k.x;
      const dy = k.ty - k.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) Object.assign(k, { tx: rnd(FISH_AREA.x0, FISH_AREA.x1), ty: rnd(FISH_AREA.y0, FISH_AREA.y1), speed: rnd(6, 12) });
      else {
        k.x += (dx / d) * k.speed * dt;
        k.y += (dy / d) * k.speed * dt * 0.5;
      }
    }
    L.timers.jump -= dt;
    if (L.timers.jump <= 0) {
      L.timers.jump = rnd(5, 11);
      jump(pick(L.fish), t);
    }

    // Partículas: brilhos na água, folhas, poeirinha na luz e o brilho das luzes da ponte à noite
    L.timers.spark -= dt;
    if (L.timers.spark <= 0) {
      L.timers.spark = rnd(0.08, 0.22);
      const x = rnd(-EDGE, W + EDGE);
      const y = rnd(BANK + 2, H - 2);
      if (inWater(x, y)) spawn('spark', x, y, { life: rnd(0.4, 1.1), vx: rnd(0.5, 2), c: night ? '#8fd6e0' : '#e9fbff' });
    }
    L.timers.leaf -= dt;
    if (L.timers.leaf <= 0) {
      L.timers.leaf = rnd(1.4, 3.6);
      const tr = pick(trees);
      spawn('leaf', tr.x + cam.view(t).shift(DEPTH.mid) + rnd(-6, 6), BANK - rnd(14, 22), { vx: rnd(-3, 3), vy: rnd(4, 7), life: rnd(2.6, 4), c: pick(['#3aa655', '#8cc63f', '#c9d84a', '#d9a441']), floor: BANK + rnd(0, 6) });
    }
    L.timers.mote -= dt;
    if (!night && L.timers.mote <= 0) {
      L.timers.mote = rnd(0.25, 0.6);
      spawn('mote', rnd(-EDGE, W + EDGE), rnd(DECK - 40, H - 4), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
    }
    L.timers.twinkle -= dt;
    if (night && L.timers.twinkle <= 0) {
      L.timers.twinkle = rnd(0.15, 0.4);
      const l = pick(LAMPS);
      spawn('twinkle', l.x, l.y, { life: rnd(0.6, 1.2), c: '#fff1b8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);

  /** Garça levanta voo para outro canto do rio. */
  function flyHeron() {
    const g = life.current.heron;
    if (g.mode === 'fly') return;
    const to = pick(HERON_SPOTS.filter((s) => Math.abs(s.x - g.x) > 8));
    Object.assign(g, { mode: 'fly', sx: g.x, sy: g.y, tx: to.x, ty: to.y, t0: clock.current, dur: clamp(Math.abs(to.x - g.x) / 45, 1.6, 3.6), face: to.x > g.x ? 1 : -1 });
  }

  /** Um lambari pula para fora d'água (perto de `near`, se der). */
  function jump(k: Lambari, t: number, near?: { x: number; y: number }) {
    const lx = clamp(k.x + (near && near.x < k.x ? -1 : 1) * rnd(8, 16), FISH_AREA.x0, FISH_AREA.x1);
    spawn('fish', k.x, k.y, { vx: (lx - k.x) / 0.97, vy: -34, life: 3, c: '#cfd8dc', floor: k.y });
    Object.assign(k, { hidden: t + 1.15, x: lx, tx: lx, ty: k.y });
  }

  const guard = cam.guard;

  const tapBridge = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!guard()) return;
      const pt = cam.toWorld(e);
      const L = life.current;
      sfx('clang');
      L.shake = clock.current + 0.45;
      const x = pt?.x ?? MID;
      const y = pt?.y ?? DECK - 20;
      for (let i = 0; i < 6; i++) spawn('spark', x + rnd(-3, 3), y + rnd(-3, 3), { life: rnd(0.4, 0.8), vx: rnd(-10, 10), vy: rnd(-12, 2), c: pick(['#ffe27a', '#ffffff', BRIDGE_LIGHT]) });
      say('ponte', x, Math.min(y, DECK - 22), pick(FACTS), 3);
      discover('ponte');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );

  const tapLamp = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    sfx('zap');
    L.chase = clock.current;
    // A luz corre pela ponte, a partir da lâmpada tocada.
    LAMPS.forEach((l, k) => setTimeout(() => spawn('twinkle', l.x, l.y, { life: 0.9, c: '#fff1b8' }), Math.abs(k - i) * 60));
    say('luz', LAMPS[i].x, LAMPS[i].y - 4, night ? 'Que luzes lindas! ✨' : 'Plim! De noite elas acendem! 💡', 2.6);
    discover('luzes');
  };

  const tapCar = (c: Car) => {
    if (!guard()) return;
    sfx('honk');
    say(`car${c.id}`, c.x, DECK - 12, pick(['Bi-bi! 🚗', 'Fom-fom! 🚙', 'Passando na ponte! 🚗']), 1.8);
    discover('carro');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    if (w.bike) {
      w.say = pick(['Trim, trim! 🚲', 'Olha eu de bicicleta! 🚲', 'Uhuuu! 🚲']);
      w.sayUntil = clock.current + 2.2;
    } else {
      w.say = pick(night ? LINES_NIGHT : LINES_DAY);
      w.sayUntil = clock.current + 2.8;
      w.wait = Math.max(w.wait, 2.4);
    }
    discover('gente');
  };

  const tapHeron = () => {
    if (!guard()) return;
    sfx('chirp');
    const g = life.current.heron;
    say('garca', g.x, g.y - 16, pick(['Lá vai a garça! 🦢', 'Que bicho elegante! 🦢', 'Ela pesca peixinhos! 🐟']), 2.4);
    flyHeron();
    discover('garca');
  };

  const tapFisher = () => {
    if (!guard()) return;
    const L = life.current;
    if (clock.current - L.pull < 1.6) return;
    L.pull = clock.current;
    sfx('splash');
    spawn('fish', BOBBER.x, BOBBER.y, { vx: -12, vy: -46, life: 3, c: '#cfd8dc', floor: BOBBER.y + 2 });
    say('pescador', FISHER.x + 6, FISHER.y - 18, pick(['Peguei um lambari! 🐟', 'Ih, escapou! 😄', 'Pesca boa, sô! 🎣', 'Volta pro rio, peixinho! 🐟']), 2.8);
    discover('pescador');
  };

  const tapTree = useCallback(
    (id: string, x: number, top: number) => {
      if (!guard()) return;
      setShaking(id);
      setTimeout(() => setShaking((cur) => (cur === id ? null : cur)), 650);
      sfx('rustle');
      const n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++)
        spawn('leaf', x + rnd(-8, 8), top + rnd(-4, 6), { vx: rnd(-5, 5), vy: rnd(6, 11), life: rnd(1.8, 3), c: pick(['#3aa655', '#8cc63f', '#1f7a4d', '#c9d84a']), floor: top + rnd(16, 30) });
      if (Math.random() < 0.4) {
        setTimeout(() => sfx('chirp'), 120);
        flyAway(ambient.current, x, top);
      }
      discover('arvore');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [discover],
  );
  const tapBackTree = useCallback((id: string, x: number, top: number) => tapTree(id, x + cam.view(clock.current).shift(DEPTH.mid), top), [tapTree, cam, clock]);

  const t = clock.current;
  const L = life.current;
  const A = ambient.current;
  const view = cam.view(t);

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (!pt || !inWater(pt.x, pt.y)) return;
    sfx('splash');
    spawn('ripple', pt.x, pt.y, { life: 1.1, c: '#d6f6fa' });
    setTimeout(() => spawn('ripple', pt.x, pt.y, { life: 0.9, c: '#d6f6fa' }), 180);
    for (let i = 0; i < 5; i++) spawn('drop', pt.x, pt.y, { vx: rnd(-9, 9), vy: rnd(-24, -12), life: 1.4, c: '#bfeaf2', floor: pt.y });
    const visible = L.fish.filter((k) => t >= k.hidden);
    if (visible.length) {
      const k = visible.reduce((a, b) => (Math.hypot(b.x - pt.x, b.y - pt.y) < Math.hypot(a.x - pt.x, a.y - pt.y) ? b : a));
      jump(k, t, pt);
      say('peixe', k.x, k.y - 12, pick(['Olha o lambari! 🐟', 'Splash! 💦', 'Que pulo! 🐟']), 2);
      discover('peixe');
    }
  };

  /* ---- Desenho ---- */
  const [wTop, wDeep] = WATER_C[time];
  const shakeY = L.shake > t ? Math.round(Math.sin(t * 70)) * 0.6 : 0;
  const lampOn = (i: number) => night || t - L.chase < 1.6 + Math.abs(i - 10) * 0.06;

  const g = L.heron;
  let hx = g.x;
  let hy = g.y;
  if (g.mode === 'fly') {
    const k = clamp((t - g.t0) / g.dur, 0, 1);
    hx = g.sx + (g.tx - g.sx) * k;
    hy = g.sy + (g.ty - g.sy) * k - Math.sin(Math.PI * k) * 26;
  }
  const heronRuns = g.mode === 'fly' ? (Math.sin(t * 9) > 0 ? heronUp : heronDown) : g.mode === 'fish' ? heronFish : heronStand;
  const heronW = g.mode === 'fly' ? 14 : 10;
  const heronH = g.mode === 'fly' ? 7 : 16;

  const pull = t - L.pull < 1.2;
  const bob = pull ? -3 : Math.round(Math.sin(t * 2.4) * 0.6);
  const tip = { x: FISHER.x + 30, y: FISHER.y - 26 + (pull ? -4 : 0) };

  const walkerNode = (w: Walker): ReactNode => {
    if (w.bike) {
      const spin = Math.floor(w.walk * 10) % 2;
      const pedal = w.walk > 0 ? ((spin + 1) as 1 | 2) : 0;
      const y = DECK - 1;
      return (
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapWalker(w);
          }}
        >
          {[w.x - 5, w.x + 5].map((wx) => (
            <g key={wx} fill={INK}>
              <rect x={wx - 2} y={y - 5} width={4} height={1} />
              <rect x={wx - 3} y={y - 4} width={1} height={3} />
              <rect x={wx + 2} y={y - 4} width={1} height={3} />
              <rect x={wx - 2} y={y - 1} width={4} height={1} />
              {spin ? <rect x={wx - 0.5} y={y - 4} width={1} height={3} fill="#8a8f88" /> : <rect x={wx - 2} y={y - 3} width={4} height={1} fill="#8a8f88" />}
            </g>
          ))}
          <rect x={w.x - 5} y={y - 4} width={10} height={1} fill="#2f5fb3" />
          <rect x={w.x - 1} y={y - 7} width={1} height={4} fill="#2f5fb3" />
          <rect x={w.x + 4} y={y - 8} width={1} height={4} fill={INK} />
          <rect x={w.x + 3} y={y - 8} width={3} height={1} fill={INK} />
          <Character x={w.x} y={y - 4} config={w.config} frame={pedal} />
        </g>
      );
    }
    return (
      <g
        className="cw-tap"
        onClick={(e) => {
          e.stopPropagation();
          tapWalker(w);
        }}
      >
        <Character x={w.x} y={DECK - 0.5} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
      </g>
    );
  };

  const carNode = (c: Car) => (
    <g
      key={c.id}
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        tapCar(c);
      }}
    >
      <g transform={`translate(${c.x.toFixed(2)} ${(c.dir > 0 ? DECK - 10 : DECK - 11.5).toFixed(2)}) scale(${c.dir} 1) translate(-10 0)`}>
        <rect x={0} y={0} width={20} height={10} fill="transparent" />
        <Pixels runs={c.runs} />
      </g>
    </g>
  );

  const reflection = (
    <g transform={`translate(0 ${2 * WL}) scale(1 -1)`} opacity={0.32}>
      <Piers />
      <FrontTruss />
    </g>
  );

  const bubbles = [
    ...live(t),
    ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: DECK - (w.bike ? 21 : 18), text: w.say! })),
  ];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <clipPath id="pn-water">
            <rect x={FULL.x} y={BANK} width={FULL.w} height={GROUND_END - BANK} />
          </clipPath>
          <linearGradient id="pn-water-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={wTop} />
            <stop offset="1" stopColor={wDeep} />
          </linearGradient>
          <radialGradient id="pn-glow">
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
        <g transform={view.layer(DEPTH.mid)}>
          <FarBank time={time} />
          {trees.map((tr) => (
            <BackTree key={tr.x} id={`t${tr.x}`} x={tr.x} ground={BANK - 2} dur={tr.dur} delay={tr.delay} shaking={shaking === `t${tr.x}`} onTap={tapBackTree} />
          ))}
        </g>

        {/* Rio Pomba: água, reflexo da ponte, lambaris e brilhos */}
        <rect x={FULL.x} y={BANK} width={FULL.w} height={GROUND_END - BANK} fill="url(#pn-water-c)" />
        <rect x={FULL.x} y={BANK} width={FULL.w} height={1} fill="#000" opacity={0.15} />
        <g clipPath="url(#pn-water)" pointerEvents="none">
          {reflection}
          {L.fish
            .filter((k) => t >= k.hidden)
            .map((k, i) => (
              <g key={i} opacity={0.55}>
                <rect x={k.x - 2} y={k.y} width={4} height={1} fill="#dfe8ea" />
                <rect x={k.x + (k.tx > k.x ? -3 : 2)} y={k.y + (Math.sin(t * 9 + i) > 0 ? 0 : 1)} width={1} height={1} fill="#b9c6ca" />
              </g>
            ))}
          {night &&
            LAMPS.map((l, i) => (
              <g key={i} className="pn-streak" style={{ animationDelay: `${-i * 0.37}s` }}>
                {[0, 3, 6, 9, 12].map((d) => (
                  <rect key={d} x={l.x - 1 + ((d / 3) % 2)} y={2 * WL - l.y + d} width={2 - (d > 6 ? 1 : 0)} height={1} fill="#ffe08a" opacity={0.7 - d * 0.04} />
                ))}
              </g>
            ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={((t * (2 + i * 0.7) + i * 61) % (W + 60)) - 30} y={BANK + 4 + i * 6} width={8 + (i % 3) * 3} height={1} fill="#e2f4ef" opacity={0.35} />
          ))}
        </g>

        <Piers />
        <BackTruss onTap={tapBridge} />
        {L.cars.filter((c) => c.dir < 0).map(carNode)}
        {L.cars.filter((c) => c.dir > 0).map(carNode)}
        {L.walkers.map((w) => (
          <g key={w.id}>{walkerNode(w)}</g>
        ))}
        <g transform={`translate(0 ${shakeY})`}>
          <FrontTruss />
        </g>
        {LAMPS.map((l, i) => (
          <g
            key={i}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapLamp(i);
            }}
          >
            <rect x={l.x - 4} y={l.y - 4} width={9} height={8} fill="transparent" />
            <rect x={l.x - 1} y={l.y} width={3} height={1} fill={INK} />
            <rect x={l.x} y={l.y - 1} width={1} height={1} fill={lampOn(i) ? '#fff1b8' : '#d8d2bc'} />
          </g>
        ))}

        {/* Beira do rio: pescador, palmeiras e a garça */}
        <NearBanks night={night} />
        {[
          { x: 14, flip: false },
          { x: 282, flip: true },
        ].map((p) => (
          <g
            key={p.x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapTree(`p${p.x}`, p.x, bankTop(p.x) - 34);
            }}
          >
            <g className={`cw-tree ${shaking === `p${p.x}` ? 'shake' : ''}`} style={{ animationDuration: shaking === `p${p.x}` ? undefined : '4.4s', '--a': '1.2deg' } as CSSProperties}>
              <g transform={`translate(${p.x} ${Math.round(bankTop(p.x)) - 34}) scale(${p.flip ? -2 : 2} 2) translate(-9 0)`}>
                <Pixels runs={palmRuns} />
              </g>
            </g>
          </g>
        ))}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapFisher();
          }}
          role="button"
          aria-label="Pescador"
        >
          <rect x={FISHER.x - 2} y={FISHER.y - 18} width={BOBBER.x - FISHER.x + 6} height={22} fill="transparent" />
          <path d={`M${FISHER.x + 8} ${FISHER.y - 8} L${tip.x} ${tip.y}`} stroke="#6b4423" strokeWidth={1} shapeRendering="auto" />
          <path d={`M${tip.x} ${tip.y} Q${tip.x + 6} ${(tip.y + BOBBER.y) / 2} ${BOBBER.x} ${BOBBER.y + bob}`} stroke="#e9eef2" strokeWidth={0.4} fill="none" opacity={0.8} shapeRendering="auto" />
          <rect x={BOBBER.x - 1} y={BOBBER.y - 1 + bob} width={2} height={1} fill="#d64545" />
          <rect x={BOBBER.x - 1} y={BOBBER.y + bob} width={2} height={1} fill="#ffffff" />
          <g transform={`translate(${FISHER.x - 1} ${FISHER.y - 15})`}>
            <Pixels runs={fisherRuns} />
          </g>
          <rect x={FISHER.x + 15} y={FISHER.y - 5} width={6} height={6} fill={INK} />
          <rect x={FISHER.x + 16} y={FISHER.y - 4} width={4} height={5} fill="#8d969c" />
          <rect x={FISHER.x + 16} y={FISHER.y - 4} width={4} height={1} fill="#b5bec3" />
        </g>
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapHeron();
          }}
          role="button"
          aria-label="Garça"
        >
          {g.mode !== 'fly' && <ellipse cx={hx} cy={hy + 0.5} rx={4} ry={0.8} fill="#000" opacity={0.18} />}
          <g transform={`translate(${hx.toFixed(2)} ${(hy - heronH).toFixed(2)}) scale(${g.face} 1) translate(${-heronW / 2} 0)`}>
            <rect x={-2} y={-2} width={heronW + 4} height={heronH + 2} fill="transparent" />
            <Pixels runs={heronRuns} />
          </g>
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
              {LAMPS.map((l, i) => (
                <circle key={i} className="cw-glow" cx={l.x + 0.5} cy={l.y - 0.5} r={7} fill="url(#pn-glow)" style={{ animationDuration: `${2 + (i % 5) * 0.6}s` }} />
              ))}
              <rect x={SPAN.x0} y={DECK - 3} width={SPAN.x1 - SPAN.x0} height={3} fill="#ffe9a8" opacity={0.14} />
            </g>
          </>
        )}
        {!night && t - L.chase < 2.4 && (
          <g pointerEvents="none">
            {LAMPS.map((l, i) => (lampOn(i) ? <circle key={i} cx={l.x + 0.5} cy={l.y - 0.5} r={5} fill="url(#pn-glow)" opacity={0.8} /> : null))}
          </g>
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
        firstTip="Toque na ponte, no rio e em quem passa para descobrir! 👆"
        dragText="👈 Arraste para ver a ponte toda 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
