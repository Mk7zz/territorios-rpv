import { memo, useEffect, useMemo, useState } from 'react';
import { fromAscii, outline, seeded, toRuns, type Run } from '../lib/pixel';

/** Marca do Rio Pomba Valley: serras conectadas em rede sobre o rio. */
export function RpvMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 64 51" aria-hidden className="rpv-mark">
      <path d="M2 40 L22 10 L40 40 Z" fill="#8cc63f" />
      <path d="M22 40 L42 16 L62 40 Z" fill="#3aa655" />
      <path d="M0 40 L13 24 L28 40 Z" fill="#1f7a4d" />
      <g stroke="#fff" strokeWidth="1.6" strokeOpacity="0.9" fill="none">
        <path d="M22 10 L42 16 M22 10 L13 24 M13 24 L32 30 M42 16 L32 30 M32 30 L50 33" />
      </g>
      <g fill="#fff">
        <circle cx="22" cy="10" r="2.6" />
        <circle cx="42" cy="16" r="2.6" />
        <circle cx="13" cy="24" r="2.4" />
        <circle cx="32" cy="30" r="2.4" />
        <circle cx="50" cy="33" r="2.2" />
      </g>
      <path d="M1 47 C 18 38, 34 52, 63 42" stroke="#12a3a0" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Pixels({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </>
  );
}

const BIRD_PAL = { w: '#ffffff', S: '#c9d6d1', s: '#9fb0aa', k: '#1b2b33', y: '#f2b705', r: '#12a3a0', R: '#0b6f6c' };
const BIRD_DOWN = [
  '................',
  '...........ww...',
  '..........wwww..',
  '..........wkwwyy',
  '..........wwwwy.',
  '...........ww...',
  '..........rrr...',
  'SS....SSSSrRrr..',
  'SSS.SSSSSSwwww..',
  '.SSSSSSSwwwwww..',
  '..SSwwwwwwwwww..',
  '...wwwwwwwwwww..',
  '....wwwwwwwww...',
  '......y...y.....',
];
const BIRD_UP = [
  '................',
  '...........ww...',
  '..........wwww..',
  '..........wkwwyy',
  '....SS....wwwwy.',
  '...SSsS....ww...',
  '..SSSsSS..rrr...',
  '...SSSSSSSrRrr..',
  'SSS..SSSSSwwww..',
  '.SSS...wwwwwww..',
  '..SSwwwwwwwwww..',
  '...wwwwwwwwwww..',
  '....wwwwwwwww...',
  '......y...y.....',
];
export const birdDown = toRuns(outline(fromAscii(BIRD_DOWN, BIRD_PAL), '#1b2b33'));
export const birdUp = toRuns(outline(fromAscii(BIRD_UP, BIRD_PAL), '#1b2b33'));

/** A guia do mundo: uma pomba de lenço verde-água (o rio que dá nome ao Valley). */
export function GuideSprite({ size = 64, flying = false, className = '' }: { size?: number; flying?: boolean; className?: string }) {
  return (
    <svg className={`guide ${flying ? 'flying' : ''} ${className}`} width={size} height={(size * 16) / 18} viewBox="-1 -1 18 16" shapeRendering="crispEdges" aria-hidden>
      <g className="wing-down">
        <Pixels runs={birdDown} />
      </g>
      <g className="wing-up">
        <Pixels runs={birdUp} />
      </g>
    </svg>
  );
}

const TREE = ['...g...', '..gfg..', '.gflfg.', '.gfffg.', 'gflfffg', 'gffflfg', '.ggfgg.', '...b...', '...b...'];
export const treeRuns = toRuns(outline(fromAscii(TREE, { g: '#1f7a4d', f: '#3aa655', l: '#8cc63f', b: '#6b4423' }), '#0f3d2a'));
export const TREE_W = 9;
export const TREE_H = 11;

/** Silhueta em "escadinha" (pixel) a partir de uma altura por coluna. */
function stepped(heights: number[], bottom: number) {
  let d = `M0 ${bottom}`;
  heights.forEach((h, x) => (d += ` V${h} H${x + 1}`));
  return `${d} V${bottom} Z`;
}

function ridge(width: number, base: number, peaks: [number, number][]) {
  return Array.from({ length: width }, (_, x) => {
    let h = base;
    for (const [px, ph] of peaks) h = Math.min(h, ph + Math.abs(x - px) * 0.9);
    return Math.round(h);
  });
}

export type DayTime = 'day' | 'dusk' | 'night';

const FORCED: Record<string, DayTime> = { dia: 'day', tarde: 'dusk', noite: 'night' };

export function dayTime(date = new Date()): DayTime {
  // ?hora=dia|tarde|noite fixa o horário do cenário (útil em apresentações).
  if (typeof location !== 'undefined') {
    try {
      const param = new URLSearchParams(location.search).get('hora');
      if (param !== null) sessionStorage.setItem('hora', param);
      const forced = FORCED[param ?? sessionStorage.getItem('hora') ?? ''];
      if (forced) return forced;
    } catch {
      /* sem sessionStorage: segue o relógio */
    }
  }
  const h = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }));
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

const SKY: Record<DayTime, [string, string]> = {
  day: ['#7fd0e6', '#dff5f1'],
  dusk: ['#f0a35e', '#fde6b6'],
  night: ['#0d1b2e', '#23384a'],
};

/** Hora do dia no fuso da plataforma, atualizada a cada minuto. */
export function useDayTime() {
  const [t, setT] = useState(dayTime);
  useEffect(() => {
    const id = setInterval(() => setT(dayTime()), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/**
 * Cenário do Vale em pixel-art: céu conforme a hora, serras com a rede de nós da marca,
 * o rio e árvores. "full" ocupa a tela (início e cadastro); "strip" é só a faixa de serras e rio.
 */
export const PixelValley = memo(function PixelValley({ variant = 'full', time, className = '' }: { variant?: 'full' | 'strip'; time?: DayTime; className?: string }) {
  const W = 320;
  const H = variant === 'full' ? 180 : 70;
  const t = time ?? 'day';
  const scene = useMemo(() => {
    const off = variant === 'full' ? 0 : -110;
    const far = ridge(W, 120 + off, [[30, 62 + off], [118, 50 + off], [205, 66 + off], [290, 46 + off]]);
    const mid = ridge(W, 140 + off, [[70, 86 + off], [168, 74 + off], [250, 90 + off]]);
    const near = Array.from({ length: W }, (_, x) => Math.round(150 + off + Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5));
    const river = Array.from({ length: W }, (_, x) => Math.round(163 + off + Math.sin(x / 34) * 5));
    const nodes = [[70, 86], [168, 74], [250, 90], [118, 104], [212, 108]].map(([x, y]) => [x, y + off]);
    const rand = seeded(7);
    const trees = Array.from({ length: 16 }, (_, i) => {
      const x = Math.round((i / 16) * W + rand() * 14);
      return { x, y: near[Math.min(W - 1, x + 4)] - TREE_H + 3 + Math.round(rand() * 3) };
    });
    const stars = Array.from({ length: 40 }, () => [Math.round(rand() * W), Math.round(rand() * 70)]);
    return { far, mid, near, river, nodes, trees, stars };
  }, [variant]);
  const [sky1, sky2] = SKY[t];
  const night = t === 'night';
  const id = `sky-${variant}-${t}`;

  return (
    <svg className={`pixel-valley ${variant} ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      {variant === 'full' && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={sky1} />
              <stop offset="1" stopColor={sky2} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id})`} />
          {night &&
            scene.stars.map(([x, y], i) => <rect key={i} className={i % 3 ? undefined : 'twinkle'} x={x} y={y} width={1} height={1} fill="#e2f6f5" />)}
          {night ? (
            <g>
              <rect x={252} y={20} width={12} height={12} fill="#f4f1de" />
              <rect x={250} y={22} width={16} height={8} fill="#f4f1de" />
              <rect x={256} y={22} width={4} height={4} fill="#dcd8c0" />
            </g>
          ) : (
            <g className="sun">
              <rect x={248} y={18} width={16} height={16} fill={t === 'dusk' ? '#f6c06a' : '#ffe27a'} />
              <rect x={246} y={20} width={20} height={12} fill={t === 'dusk' ? '#f6c06a' : '#ffe27a'} />
              <rect x={250} y={16} width={12} height={20} fill={t === 'dusk' ? '#f6c06a' : '#ffe27a'} />
            </g>
          )}
          <g className="clouds" fill={night ? '#3a5068' : '#ffffff'} opacity={night ? 0.5 : 0.9}>
            <g className="cloud c1">
              <rect x={20} y={30} width={30} height={6} />
              <rect x={26} y={25} width={14} height={5} />
            </g>
            <g className="cloud c2">
              <rect x={120} y={18} width={36} height={6} />
              <rect x={130} y={13} width={16} height={5} />
            </g>
            <g className="cloud c3">
              <rect x={190} y={44} width={26} height={5} />
              <rect x={196} y={40} width={12} height={4} />
            </g>
          </g>
        </>
      )}
      <path d={stepped(scene.far, H)} fill={night ? '#2c5a46' : '#a9d67a'} />
      <path d={stepped(scene.mid, H)} fill={night ? '#1d4a35' : '#3aa655'} />
      <g stroke={night ? '#9fe3dd' : '#ffffff'} strokeOpacity="0.7" strokeWidth="1">
        {scene.nodes.slice(1).map(([x, y], i) => (
          <line key={i} x1={scene.nodes[i][0]} y1={scene.nodes[i][1]} x2={x} y2={y} />
        ))}
      </g>
      {scene.nodes.map(([x, y], i) => (
        <rect key={i} className="node" x={x - 1} y={y - 1} width={3} height={3} fill={night ? '#f2b705' : '#ffffff'} />
      ))}
      <path d={stepped(scene.near, H)} fill={night ? '#143a29' : '#1f7a4d'} />
      {scene.trees.map((tr, i) => (
        <g key={i} transform={`translate(${tr.x} ${tr.y})`}>
          <Pixels runs={treeRuns} />
        </g>
      ))}
      <path d={stepped(scene.river, H)} fill={night ? '#0b6f6c' : '#12a3a0'} />
      <path d={stepped(scene.river.map((y) => y + 6), H)} fill={night ? '#102a22' : '#2c7f42'} />
      <g className="river-shine" fill={night ? '#3cc7c2' : '#7fd8d4'}>
        {[18, 64, 110, 152, 196, 240, 286].map((x, i) => (
          <rect key={x} x={x} y={scene.river[x] + 2 + (i % 2)} width={6} height={1} />
        ))}
      </g>
    </svg>
  );
});
