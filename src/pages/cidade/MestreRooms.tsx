import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import { tagRuns } from '../../components/MestreHouses';
import { Pixels, type DayTime } from '../../components/Scene';
import { fromAscii, outline, seeded, shade, toRuns } from '../../lib/pixel';
import type { Place } from '../../lib/world';

/*
 * O lado de dentro da casa de cada Mestre do Saber, em pixel arte (240×90 pixels lógicos).
 * - Cozinha mineira do Seu Zico: fogão a lenha com panela e coador de pano, filtro de barro,
 *   mesa com toalha xadrez e pão de queijo, gato dormindo.
 * - Estúdio do Sektor: muro de tijolo com grafite "HIP HOP", toca-discos girando, caixas de som
 *   pulsando no ritmo, luzes de palco, discos na parede e o tapete de breaking.
 * - Ateliê da Dona Rosa: papel de parede florido, quadro em ponto cruz, bastidores pendurados,
 *   máquina de costura, carretéis coloridos, cesta de novelos e gatinho brincando.
 * Em todos: luz do sol entrando pela janela e sombra onde a parede encontra o chão e o teto.
 * O Mestre aparece por cima, à esquerda; `fx` é o centro do enquadramento no celular em pé.
 */

export const VW = 240;
export const VH = 90;
const FLOOR = 64;
const INK = '#1b2b33';

type R = [x: number, y: number, w: number, h: number, fill: string];
const rects = (list: R[], key = 'r') => list.map(([x, y, w, h, f], i) => <rect key={`${key}${i}`} x={x} y={y} width={w} height={h} fill={f} />);
/** Retângulo com contorno escuro (estilo adesivo dos sprites). */
const box = (x: number, y: number, w: number, h: number, fill: string, key?: string) => (
  <g key={key}>
    <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
    <rect x={x} y={y} width={w} height={h} fill={fill} />
  </g>
);
/** Círculo em pixels (linhas horizontais). */
function disc(cx: number, cy: number, r: number, fill: string, key = 'd') {
  const out: ReactNode[] = [];
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.round(Math.sqrt(r * r - dy * dy));
    out.push(<rect key={`${key}${dy}`} x={cx - hw} y={cy + dy} width={hw * 2 + 1} height={1} fill={fill} />);
  }
  return out;
}

const SKY: Record<DayTime, [string, string]> = { day: ['#6cc4ea', '#dff5f1'], dusk: ['#d9739a', '#ffcf8a'], night: ['#0b1730', '#24405a'] };

/** Vista da janela: céu da hora certa, serra e uma arvorezinha (e, na roça, a cerca e uma galinha no terreiro). */
function View({ x, y, w, h, time, id, farm }: { x: number; y: number; w: number; h: number; time: DayTime; id: string; farm?: boolean }) {
  const night = time === 'night';
  return (
    <g>
      <defs>
        <linearGradient id={`v-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKY[time][0]} />
          <stop offset="1" stopColor={SKY[time][1]} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#v-${id})`} />
      {night ? rects([[x + 4, y + 3, 1, 1, '#ffffff'], [x + w - 7, y + 5, 1, 1, '#ffffff'], [x + w - 10, y + 3, 3, 3, '#f4f1de']], 's') : rects([[x + 3, y + 4, 8, 2, '#ffffff'], [x + 5, y + 3, 4, 1, '#ffffff']], 'c')}
      <path d={`M${x} ${y + h} V${y + h - 6} L${x + w * 0.35} ${y + h - 11} L${x + w * 0.7} ${y + h - 7} L${x + w} ${y + h - 10} V${y + h} Z`} fill={night ? '#1a4431' : '#3aa655'} />
      {rects([[x + w - 9, y + h - 12, 5, 5, night ? '#16402c' : '#1f7a4d'], [x + w - 7, y + h - 7, 1, 4, '#6b4423']], 't')}
      {farm && (
        <g>
          {rects([[x, y + h - 4, w, 4, night ? '#20503a' : '#6fae3c'], [x, y + h - 4, w, 1, night ? '#2a5e44' : '#8ccb52'], [x, y + h - 6, w, 1, '#8a5a2b']], 'fa')}
          {Array.from({ length: Math.ceil(w / 4) }, (_, i) => (
            <rect key={`fp${i}`} x={x + 1 + i * 4} y={y + h - 7} width={1} height={4} fill="#6b4423" />
          ))}
          {rects([[x + 5, y + h - 3, 3, 2, night ? '#5c4a3a' : '#c9762b'], [x + 7, y + h - 4, 1, 1, night ? '#5c4a3a' : '#c9762b'], [x + 8, y + h - 4, 1, 1, '#f2b705'], [x + 6, y + h - 4, 1, 1, '#d64545']], 'gl')}
        </g>
      )}
    </g>
  );
}

/** Faixa de luz do sol entrando pela janela e caindo no chão (só de dia). */
function Sunbeam({ x, y, w, time, drift = 26 }: { x: number; y: number; w: number; time: DayTime; drift?: number }) {
  if (time === 'night') return null;
  return <path d={`M${x} ${y} H${x + w} L${x + w + drift} ${VH} H${x + drift} Z`} fill={time === 'dusk' ? '#ffcf8a' : '#fff6d0'} opacity={0.16} />;
}

/** Reboco caído mostrando os tijolinhos de adobe da parede. */
function BrickPatch({ x, y, k }: { x: number; y: number; k: string }) {
  return (
    <g>
      {rects([[x + 1, y, 9, 1, '#d9cdb8'], [x, y + 1, 12, 5, '#d9cdb8'], [x + 2, y + 6, 7, 1, '#d9cdb8']], `${k}o`)}
      {rects([[x + 1, y + 1, 4, 2, '#c4553a'], [x + 6, y + 1, 4, 2, '#b5523b'], [x + 2, y + 4, 4, 2, '#b5523b'], [x + 7, y + 4, 3, 2, '#c4553a']], `${k}b`)}
    </g>
  );
}

/** Sombra suave onde a parede encontra o chão e embaixo do teto. */
function Ambient() {
  return (
    <g fill="#000000">
      <rect y={FLOOR} width={VW} height={2} opacity={0.18} />
      <rect y={6} width={VW} height={2} opacity={0.12} />
    </g>
  );
}

/** Vapor subindo (panela, bule, café). */
function Steam({ x, y, n = 3 }: { x: number; y: number; n?: number }) {
  return (
    <g className="mz-steam" fill="#ffffff">
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + (i % 2)} y={y} width={2 - (i % 2)} height={2} style={{ animationDelay: `${-i * 0.9}s` }} />
      ))}
    </g>
  );
}

/* ---- Cozinha do Seu Zico ---- */

const Kitchen = memo(function Kitchen({ time }: { time: DayTime }) {
  const night = time === 'night';
  const specks = useMemo(() => {
    const rand = seeded(5);
    return Array.from({ length: 60 }, () => [Math.round(rand() * VW), 8 + Math.round(rand() * 38)] as [number, number]);
  }, []);
  const checker: R[] = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) checker.push([72 + i * 2, 60 + j * 2, 2, 2, '#d64545']);
  return (
    <g>
      {/* Parede caiada, barrado rosa e teto de madeira */}
      <rect width={VW} height={FLOOR} fill="#efe6d6" />
      {specks.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={2} height={1} fill="#e2d7c2" />
      ))}
      <rect y={48} width={VW} height={16} fill="#f4a3c4" />
      <rect y={48} width={VW} height={1} fill="#c97a9a" />
      <rect y={47} width={VW} height={1} fill="#fbf7ee" />
      <rect width={VW} height={6} fill="#6b4423" />
      {Array.from({ length: 7 }, (_, i) => box(6 + i * 38, 5, 6, 3, '#8a5a2b', `b${i}`))}
      <BrickPatch x={60} y={44} k="bp1" />
      <BrickPatch x={112} y={36} k="bp2" />
      {/* Chão de cimento queimado vermelho */}
      <rect y={FLOOR} width={VW} height={VH - FLOOR} fill="#b5523b" />
      {rects([[0, FLOOR, VW, 1, '#8f3e2c'], [0, 72, VW, 1, '#a24a35'], [0, 82, VW, 1, '#a24a35']], 'f')}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={i * 16 + (i % 2) * 4} y={FLOOR + 1} width={1} height={VH - FLOOR} fill="#a24a35" />
      ))}
      {rects([[30, 76, 14, 1, '#cf6a52'], [180, 86, 18, 1, '#cf6a52'], [120, 68, 10, 1, '#cf6a52']], 'sh')}
      {/* Prateleira: canecas esmaltadas, potes de doce e o rádio de pilha */}
      {box(12, 28, 46, 2, '#8a5a2b', 'shelf')}
      {rects([[14, 30, 1, 3, '#6b4423'], [55, 30, 1, 3, '#6b4423']], 'sb')}
      {[14, 21].map((x, i) => (
        <g key={x}>
          {box(x, 21, 5, 6, '#f4f8ff')}
          <rect x={x} y={21} width={5} height={1} fill={i ? '#d64545' : '#2f5fb3'} />
          <rect x={x + 5} y={23} width={1} height={2} fill={INK} />
        </g>
      ))}
      {[
        ['#c0392b', 29],
        ['#8a5a2b', 35],
        ['#e8772e', 41],
      ].map(([c, x]) => (
        <g key={x}>
          {box(x as number, 20, 4, 7, c as string)}
          <rect x={x as number} y={19} width={4} height={1} fill="#efe6d6" />
          <rect x={(x as number) + 1} y={22} width={1} height={3} fill="#ffffff" opacity={0.5} />
        </g>
      ))}
      {box(47, 21, 9, 6, '#3c6e4f', 'radio')}
      {rects([[48, 22, 3, 3, '#cfd8dc'], [52, 22, 3, 1, '#f2b705'], [52, 24, 1, 1, '#d64545'], [54, 18, 1, 3, '#5c6970']], 'rd')}
      {/* Janela com folhas azuis abertas e cortininha */}
      {box(70, 14, 30, 26, '#fbf7ee', 'win')}
      <View x={72} y={16} w={26} h={22} time={time} id="k" farm />
      {rects([[84, 16, 2, 22, '#fbf7ee'], [72, 26, 26, 1, '#fbf7ee'], [72, 16, 26, 2, '#ffffff'], [72, 18, 3, 3, '#ffffff'], [95, 18, 3, 3, '#ffffff']], 'wf')}
      {box(62, 14, 6, 26, '#2f7f8a', 'shl')}
      {box(102, 14, 6, 26, '#2f7f8a', 'shr')}
      {rects([[64, 16, 1, 22, '#3f9aa7'], [104, 16, 1, 22, '#3f9aa7'], [62, 26, 6, 1, '#235f68'], [102, 26, 6, 1, '#235f68']], 'sl')}
      {box(68, 40, 34, 2, '#8a5a2b', 'sill')}
      {rects([[78, 36, 5, 4, '#c4553a'], [77, 33, 7, 3, '#3aa655'], [79, 32, 1, 1, '#d64545'], [82, 33, 1, 1, '#d64545']], 'pim')}
      {/* Réstia de alho e panelas penduradas */}
      <rect x={116} y={6} width={1} height={8} fill="#8a5a2b" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>{disc(116 + (i % 2 ? 1 : -1), 15 + i * 3, 1, '#f4f1e6', `al${i}`)}</g>
      ))}
      {box(121, 16, 8, 8, '#3c4a52', 'pan1')}
      {rects([[124, 12, 2, 4, '#3c4a52'], [122, 17, 2, 2, '#5c6970']], 'p1')}
      {/* Escumadeira e concha penduradas no prego */}
      {rects([[131, 20, 1, 1, INK], [134, 20, 1, 1, INK], [131, 21, 1, 9, '#9aa5ad'], [130, 30, 3, 3, '#9aa5ad'], [131, 31, 1, 1, '#cfd8dc'], [134, 21, 1, 8, '#9aa5ad'], [133, 29, 3, 2, '#9aa5ad']], 'ut')}
      {/* Linguiça defumando no fumeiro */}
      {rects([[182, 21, 16, 1, '#6b4423'], [182, 20, 1, 2, '#4a2c17'], [197, 20, 1, 2, '#4a2c17']], 'fm')}
      {[184, 188, 192, 195].map((lx, i) => (
        <g key={lx}>{rects([[lx, 22, 1, 1, '#f4f1e6'], [lx - (i % 2), 23, 2, 5 + (i % 2), '#a8432a'], [lx - (i % 2), 23, 1, 4, '#c4553a'], [lx - (i % 2), 28 + (i % 2), 2, 1, '#7a2f1f']], `lg${i}`)}</g>
      ))}
      {/* Calendário (folhinha) */}
      {box(200, 12, 11, 14, '#ffffff', 'cal')}
      {rects([[200, 12, 11, 3, '#d64545'], [202, 17, 7, 1, '#9aa5ad'], [202, 19, 7, 1, '#9aa5ad'], [202, 21, 5, 1, '#9aa5ad'], [205, 10, 1, 2, INK]], 'cl')}
      {/* Coifa e chaminé por cima do fogão */}
      <path d="M146 6 H172 L180 30 H138 Z" fill="#9a9f98" />
      <path d="M146 6 H172 L174 12 H144 Z" fill="#7d827b" />
      <rect x={138} y={29} width={42} height={2} fill="#6b6f68" />
      {/* Fogão a lenha */}
      {box(130, 38, 58, 4, '#2a2a2a', 'chapa')}
      {box(132, 42, 54, 22, '#ece4d4', 'fog')}
      {rects([[132, 59, 54, 5, '#c4553a'], [132, 59, 54, 1, '#9a3e28'], [134, 44, 50, 1, '#f9f5ec']], 'fb')}
      {[140, 152].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={38} width={7} height={1} fill="#4a4a4a" />
        </g>
      ))}
      {box(137, 46, 12, 9, '#2a2a2a', 'boca')}
      <g className="mz-fire">
        {rects([[138, 50, 10, 5, '#e8772e'], [139, 48, 3, 3, '#f2b705'], [143, 49, 2, 2, '#ffe27a'], [145, 48, 2, 3, '#f2b705']], 'fi')}
      </g>
      {rects([[137, 46, 12, 1, '#4a4a4a'], [146, 50, 1, 2, '#c58b4a']], 'bk')}
      {box(154, 48, 10, 6, '#2a2a2a', 'cinza')}
      {rects([[158, 50, 2, 1, '#9aa5ad'], [170, 46, 12, 1, '#d9cdb8'], [170, 50, 12, 1, '#d9cdb8']], 'cz')}
      {/* Panela de ferro, bule azul e coador de pano */}
      {box(134, 31, 13, 7, '#2a2a2a', 'panela')}
      {rects([[133, 30, 15, 1, '#4a4a4a'], [139, 28, 3, 2, '#4a4a4a'], [135, 32, 2, 4, '#4a4a4a']], 'pn')}
      <Steam x={139} y={24} />
      {box(156, 32, 8, 6, '#2f5fb3', 'bule')}
      {rects([[164, 33, 3, 1, '#2f5fb3'], [166, 32, 1, 1, '#2f5fb3'], [158, 31, 4, 1, '#2f5fb3'], [157, 33, 2, 2, '#ffffff']], 'bl')}
      <Steam x={166} y={27} n={2} />
      {rects([[171, 25, 1, 13, '#8a5a2b'], [181, 25, 1, 13, '#8a5a2b'], [170, 25, 13, 1, '#8a5a2b'], [174, 26, 5, 4, '#f4f1e6'], [175, 30, 3, 2, '#e9e1d3'], [176, 32, 1, 1, '#e9e1d3']], 'cf')}
      {box(173, 34, 7, 4, '#ffffff', 'cafe')}
      {/* Pano de prato pendurado no fogão */}
      {rects([[168, 43, 9, 1, '#9aa5ad'], [170, 44, 5, 8, '#fdf6e3'], [170, 46, 5, 1, '#d64545'], [170, 50, 5, 1, '#d64545'], [172, 48, 1, 1, '#3aa655']], 'pano')}
      {rects([[174, 35, 5, 1, '#d64545']], 'cf2')}
      {/* Lenha do lado do fogão */}
      {box(190, 52, 16, 12, '#6b4423', 'lenha')}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <g key={`${r}${c}`}>
            <rect x={190 + c * 4} y={52 + r * 4} width={4} height={4} fill={(r + c) % 2 ? '#c58b4a' : '#d9a066'} />
            <rect x={191 + c * 4} y={53 + r * 4} width={2} height={2} fill="#8a5a2b" />
          </g>
        )),
      )}
      {/* Filtro de barro na mesinha */}
      {box(210, 54, 22, 3, '#8a5a2b', 'mesinha')}
      {rects([[212, 57, 2, 7, '#6b4423'], [228, 57, 2, 7, '#6b4423']], 'ml')}
      {box(214, 42, 14, 6, '#c4553a', 'f1')}
      {box(215, 33, 12, 8, '#c4553a', 'f2')}
      {rects([[216, 32, 10, 1, '#9a3e28'], [215, 37, 12, 1, '#9a3e28'], [215, 46, 13, 1, '#9a3e28'], [216, 34, 2, 6, '#d9775c'], [228, 48, 3, 1, '#9aa5ad'], [230, 49, 1, 2, '#9aa5ad']], 'fl')}
      {/* Porta aberta pro quintal */}
      {box(232, 14, 9, 50, '#2f7f8a', 'porta')}
      <rect x={234} y={16} width={7} height={48} fill={night ? '#1a3550' : '#fff3c4'} opacity={0.85} />
      {/* Lampadinha */}
      <rect x={110} y={6} width={1} height={10} fill={INK} />
      {box(108, 16, 5, 3, night ? '#fff2b0' : '#e9e1d3', 'lamp')}
      {night && <circle cx={110.5} cy={20} r={22} fill="#ffe9a8" opacity={0.18} />}
      {/* Mesa com toalha xadrez, pão de queijo e café */}
      {box(70, 60, 52, 6, '#ffffff', 'mesa')}
      {rects(checker, 'ck')}
      {rects([[72, 66, 3, 14, '#8a5a2b'], [117, 66, 3, 14, '#8a5a2b'], [70, 66, 52, 1, '#c9c0a6']], 'pe')}
      {box(80, 57, 16, 3, '#f4f8ff', 'prato')}
      {[82, 86, 90, 84, 88].map((x, i) => (
        <g key={i}>{disc(x + 1, i < 3 ? 56 : 54, 1, i % 2 ? '#f2c45c' : '#e8b14a', `pq${i}`)}</g>
      ))}
      {/* Queijo minas na tábua */}
      {box(108, 58, 12, 2, '#a0703e', 'tabua')}
      {box(110, 54, 8, 4, '#fff6d6', 'queijo')}
      {rects([[110, 54, 8, 1, '#f2e2a8'], [116, 56, 2, 2, '#f2e2a8'], [112, 56, 1, 1, '#e8d590']], 'qj')}
      {box(102, 56, 5, 4, '#ffffff', 'xic')}
      {rects([[107, 57, 1, 2, INK], [101, 60, 7, 1, '#e9e1d3'], [103, 56, 3, 1, '#6b4423']], 'xc')}
      <Steam x={103} y={51} n={2} />
      {/* Galinha espiando pela porta do quintal */}
      <g className="mz-peek">
        {rects([[234, 53, 6, 5, INK], [233, 49, 4, 5, INK]], 'gp')}
        {rects([[235, 54, 5, 3, '#c9762b'], [234, 50, 2, 3, '#c9762b'], [234, 48, 1, 2, '#d64545'], [233, 51, 1, 1, '#f2b705'], [235, 51, 1, 1, INK], [236, 55, 3, 1, '#8a4a17']], 'gc')}
      </g>
      <Sunbeam x={74} y={40} w={22} time={time} />
      <Ambient />
      {/* Gato laranja dormindo perto do fogão */}
      <g>
        {rects([[150, 67, 10, 4, INK], [151, 66, 7, 1, INK]], 'go')}
        {rects([[151, 67, 8, 3, '#e8963a'], [152, 66, 5, 1, '#e8963a'], [158, 68, 2, 2, '#e8963a'], [153, 68, 1, 1, '#c46f1f'], [155, 68, 1, 1, '#c46f1f']], 'gt')}
        <g className="mz-tail">{rects([[148, 69, 3, 1, '#e8963a']], 'gr')}</g>
        <rect x={159} y={68} width={1} height={1} fill={INK} />
      </g>
    </g>
  );
});

/* ---- Estúdio do Sektor ---- */

const HIPHOP = tagRuns('HIP HOP', ['#ffe27a', '#f2b705', '#ec6a8c', '#d64545', '#6b4fa0']);
const LIGHT_C = ['#ec6a8c', '#12a3a0', '#f2b705', '#8cc63f'];

const Studio = memo(function Studio({ time }: { time: DayTime }) {
  const night = time === 'night';
  const bricks = useMemo(() => {
    const out: R[] = [];
    for (let r = 0, y = 8; y < FLOOR; r++, y += 4) {
      out.push([0, y + 3, VW, 1, '#5e2c24']);
      for (let x = r % 2 ? 4 : 0; x < VW; x += 8) out.push([x, y, 1, 3, '#5e2c24']);
      if (r % 2) out.push([(r * 37) % 220, y + 1, 3, 1, '#8f4a3d']);
    }
    return out;
  }, []);
  // Tijolos com tons diferentes, pra parede não ficar chapada.
  const shades = useMemo(() => {
    const rand = seeded(11);
    const out: R[] = [];
    for (let r = 0, y = 8; y < FLOOR; r++, y += 4)
      for (let x = r % 2 ? 4 : 0; x < VW; x += 8) {
        const k = rand();
        if (k < 0.18) out.push([x + 1, y, 7, 3, '#86443a']);
        else if (k < 0.3) out.push([x + 1, y, 7, 3, '#6b322a']);
      }
    return out;
  }, []);
  return (
    <g>
      {/* Parede de tijolo, teto escuro e neon */}
      <rect width={VW} height={FLOOR} fill="#7a3b30" />
      {rects(shades, 'bs')}
      {rects(bricks, 'br')}
      <rect width={VW} height={7} fill="#2a1f3d" />
      <rect className="mz-neon" y={7} width={VW} height={1} fill="#ff6fd8" />
      <rect className="mz-neon" y={8} width={VW} height={1} fill="#6be8ff" opacity={0.6} style={{ animationDelay: '-0.7s' }} />
      {/* Muro grafitado: manchas de spray, letras HIP HOP, coroa e respingos */}
      <g>
        <path d="M58 22 L70 14 L96 18 L120 11 L150 16 L176 13 L184 26 L178 44 L150 48 L120 44 L92 49 L64 44 Z" fill="#2a1f3d" opacity={0.35} />
        {disc(72, 32, 9, '#6b4fa0', 'g1')}
        {disc(170, 28, 10, '#12a3a0', 'g2')}
        {disc(118, 40, 7, '#ec6a8c', 'g3')}
        {rects([[60, 40, 120, 3, '#12a3a0'], [62, 43, 2, 4, '#12a3a0'], [96, 43, 1, 6, '#12a3a0'], [140, 43, 2, 3, '#12a3a0'], [168, 43, 1, 5, '#12a3a0']], 'sp')}
        <g transform="translate(71 18) scale(2.5)">
          <Pixels runs={HIPHOP} />
        </g>
        {rects([[118, 9, 9, 3, '#f2b705'], [118, 7, 1, 2, '#f2b705'], [122, 6, 1, 3, '#f2b705'], [126, 7, 1, 2, '#f2b705'], [181, 18, 2, 2, '#ffffff'], [64, 18, 1, 1, '#ffffff'], [180, 36, 1, 1, '#ffe27a']], 'cr')}
      </g>
      {/* Discos de vinil na parede e pôster */}
      {[18, 34].map((x, i) => (
        <g key={x}>
          {disc(x, 20, 6, INK, `v${i}`)}
          {disc(x, 20, 5, '#2a2a2a', `w${i}`)}
          {disc(x, 20, 2, i ? '#f2b705' : '#d64545', `l${i}`)}
          <rect x={x - 3} y={16} width={2} height={1} fill="#5c5c5c" />
        </g>
      ))}
      {box(14, 32, 26, 20, '#f2b705', 'poster')}
      {rects([[16, 34, 22, 6, '#2a1f3d'], [18, 42, 3, 8, '#2a1f3d'], [23, 44, 12, 2, '#d64545'], [23, 48, 9, 1, '#2a1f3d'], [27, 35, 1, 4, '#ec6a8c'], [29, 36, 3, 2, '#ffffff']], 'po')}
      {/* Prateleira com latas de spray */}
      {box(196, 24, 34, 2, '#3c4a52', 'prat')}
      {['#d64545', '#f2b705', '#12a3a0', '#ec6a8c', '#8cc63f', '#6b4fa0'].map((c, i) => (
        <g key={c}>
          {box(198 + i * 5, 17, 3, 7, c)}
          <rect x={198 + i * 5} y={16} width={3} height={1} fill="#f4f4f4" />
        </g>
      ))}
      {/* Chão de madeira escura e o tapete de breaking */}
      <rect y={FLOOR} width={VW} height={VH - FLOOR} fill="#4a3426" />
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} y={FLOOR + 3 + i * 7} width={VW} height={1} fill="#3a281d" />
      ))}
      <path d={`M74 ${FLOOR + 3} H170 L182 ${VH - 2} H62 Z`} fill="#c9ced2" />
      <path d={`M74 ${FLOOR + 3} H170 L171 ${FLOOR + 5} H73 Z`} fill="#e9eef2" />
      {rects([[68, 76, 108, 1, '#aeb4b8'], [64, 84, 116, 1, '#aeb4b8']], 'tp')}
      <path d={`M74 ${FLOOR + 3} L62 ${VH - 2}`} stroke="#f2b705" strokeWidth={1} />
      <path d={`M170 ${FLOOR + 3} L182 ${VH - 2}`} stroke="#f2b705" strokeWidth={1} />
      {/* Pedestal com microfone */}
      {rects([[128, 38, 1, 28, '#5c6970'], [124, 66, 9, 1, '#5c6970'], [126, 36, 4, 3, '#3c4a52'], [127, 35, 2, 1, '#9aa5ad']], 'mic')}
      {/* Caixas de som (os falantes pulsam no ritmo) */}
      {[150, 228].map((x, i) => (
        <g key={x}>
          {box(x, 28, 14, 36, '#1f1a24')}
          <g className="mz-woofer" style={{ animationDelay: `${-i * 0.25}s` } as CSSProperties}>
            {disc(x + 7, 50, 5, '#3c3646', `wo${i}`)}
            {disc(x + 7, 50, 3, '#5c5470', `wi${i}`)}
            {disc(x + 7, 50, 1, '#9aa5ad', `wc${i}`)}
          </g>
          {disc(x + 7, 36, 2, '#3c3646', `tw${i}`)}
        </g>
      ))}
      {/* Mesa de DJ com dois toca-discos girando e o mixer */}
      {box(168, 44, 56, 4, '#2a2a2a', 'tampo')}
      {box(170, 48, 52, 16, '#3c4a52', 'frente')}
      {rects([[172, 50, 48, 1, '#5c6970'], [190, 54, 12, 6, '#6b4fa0'], [192, 56, 8, 2, '#ffe27a']], 'dj')}
      {[180, 212].map((cx, i) => (
        <g key={cx}>
          {rects([[cx - 9, 40, 18, 4, '#9aa5ad']], `tt${i}`)}
          <g className="mz-spin" style={{ transformOrigin: `${cx}px 41px` }}>
            {rects([[cx - 7, 40, 14, 2, '#1b1b1b'], [cx - 2, 40, 4, 2, i ? '#d64545' : '#12a3a0'], [cx + 3, 40, 2, 1, '#5c5c5c']], `rec${i}`)}
          </g>
          <rect x={cx + 6} y={37} width={1} height={4} fill="#cfd8dc" />
        </g>
      ))}
      {rects([[193, 38, 6, 6, '#2a2a2a'], [194, 39, 1, 1, '#8cc63f'], [196, 39, 1, 1, '#f2b705'], [194, 41, 4, 1, '#ec6a8c']], 'mx')}
      {/* Disco de ouro emoldurado */}
      {box(184, 28, 10, 12, '#2a2a2a', 'ouro')}
      {disc(189, 33, 3, '#f2b705', 'od')}
      {rects([[189, 33, 1, 1, '#2a2a2a'], [187, 31, 1, 1, '#ffe27a'], [185, 38, 8, 1, '#f2b705']], 'oo')}
      {/* Cabos da mesa até as caixas de som */}
      <path d="M222 60 Q226 70 234 66" stroke={INK} strokeWidth={0.8} fill="none" />
      <path d="M170 60 Q164 72 158 66" stroke={INK} strokeWidth={0.8} fill="none" />
      {/* Caixote de discos no chão */}
      {box(198, 68, 22, 10, '#d9a066', 'cx')}
      {rects([[198, 71, 22, 1, '#a0703e'], [198, 74, 22, 1, '#a0703e'], [200, 64, 2, 4, '#1b1b1b'], [203, 63, 2, 5, '#1b1b1b'], [206, 64, 2, 4, '#d64545'], [209, 63, 2, 5, '#1b1b1b'], [212, 64, 2, 4, '#12a3a0'], [215, 63, 2, 5, '#1b1b1b']], 'cxd')}
      {/* Fone em cima da mesa */}
      {rects([[200, 41, 1, 2, INK], [204, 41, 1, 2, INK], [200, 40, 5, 1, INK]], 'fn')}
      {/* Caixinha de som portátil e tênis no chão */}
      {box(66, 66, 18, 10, '#3c4a52', 'boom')}
      {disc(70, 71, 2, '#9aa5ad', 'b1')}
      {disc(80, 71, 2, '#9aa5ad', 'b2')}
      {rects([[73, 67, 4, 2, '#12a3a0'], [70, 64, 10, 1, INK], [70, 64, 1, 2, INK], [79, 64, 1, 2, INK]], 'bb')}
      {rects([[100, 80, 6, 2, '#f4f4f4'], [99, 81, 1, 1, '#f4f4f4'], [101, 79, 3, 1, '#d64545'], [108, 81, 6, 2, '#f4f4f4'], [109, 80, 3, 1, '#d64545']], 'tn')}
      {/* Luzes de palco varrendo o estúdio */}
      {[96, 196].map((x, i) => (
        <g key={x}>
          <g className="mz-beam" style={{ transformOrigin: `${x}px 8px`, animationDelay: `${-i * 1.6}s` }}>
            <path d={`M${x - 1} 9 L${x - 14} ${FLOOR + 10} H${x + 14} L${x + 1} 9 Z`} fill={LIGHT_C[i]} opacity={0.16} />
          </g>
          {rects([[x - 2, 7, 4, 3, '#2a2a2a'], [x - 1, 10, 2, 1, LIGHT_C[i]]], `lp${i}`)}
        </g>
      ))}
      {/* Notinhas musicais saindo das caixas */}
      <g className="mz-notes">
        {[0, 1, 2].map((i) => (
          <g key={i} style={{ animationDelay: `${-i * 0.9}s` }} fill={LIGHT_C[i]}>
            <rect x={156 + i * 4} y={24} width={2} height={2} />
            <rect x={157.5 + i * 4} y={20} width={1} height={4} />
          </g>
        ))}
      </g>
      {/* Poças de luz colorida no chão */}
      <ellipse className="mz-pool" cx={96} cy={FLOOR + 12} rx={16} ry={3} fill={LIGHT_C[0]} opacity={0.18} />
      <ellipse className="mz-pool" cx={196} cy={FLOOR + 12} rx={16} ry={3} fill={LIGHT_C[1]} opacity={0.18} style={{ animationDelay: '-1.6s' }} />
      <Ambient />
      {!night && <rect width={VW} height={VH} fill="#2a1f3d" opacity={0.08} />}
    </g>
  );
});

/* ---- Ateliê da Dona Rosa ---- */

const STITCH = toRuns(
  outline(
    fromAscii(
      [
        'cccccccccccccccccccccc',
        'c....................c',
        'c..rr.......yy.......c',
        'c.rRRr.....yYYy..bb..c',
        'c.rRRr.....yYYy.bBBb.c',
        'c..rr...g...yy..bBBb.c',
        'c...g...gg...g...bb..c',
        'c...gg.ggg..gg...g...c',
        'c....ggg.....g..gg...c',
        'c.....g......gggg....c',
        'c..pp.g..ss....g.....c',
        'c.pPPpg.sSSs...g..rr.c',
        'c.pPPpg.sSSs...g.rRRrc',
        'c..pp.g..ss...gg.rRRrc',
        'c.....g....g.gg...rr.c',
        'c..gggggggggggggggg..c',
        'c....................c',
        'cccccccccccccccccccccc',
      ],
      { c: '#c58b4a', r: '#d64545', R: '#ec6a8c', y: '#f2b705', Y: '#ffe27a', b: '#2f5fb3', B: '#7fb8ff', g: '#3aa655', p: '#6b4fa0', P: '#b48ae0', s: '#e8772e', S: '#ffb07a', '.': '#fdf6e3' },
    ),
    INK,
  ),
);

const Atelier = memo(function Atelier({ time }: { time: DayTime }) {
  const night = time === 'night';
  const paper = useMemo(() => {
    const out: R[] = [];
    for (let r = 0, y = 12; y < 48; r++, y += 8)
      for (let x = (r % 2) * 6 + 2; x < VW; x += 12) out.push([x, y, 1, 1, '#e7a8b8'], [x - 1, y + 1, 1, 1, '#9cc98a'], [x + 1, y + 1, 1, 1, '#9cc98a']);
    return out;
  }, []);
  return (
    <g>
      {/* Papel de parede florido, rodapé de madeira e viga */}
      <rect width={VW} height={FLOOR} fill="#f7e7d4" />
      {rects(paper, 'pp')}
      <rect width={VW} height={6} fill="#8a5a2b" />
      <rect y={6} width={VW} height={1} fill="#6b4423" />
      <rect y={48} width={VW} height={16} fill="#c58b4a" />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={i * 8} y={48} width={1} height={16} fill="#a0703e" />
      ))}
      <rect y={48} width={VW} height={1} fill="#fbf7ee" />
      {/* Chão de tábuas e o tapete de crochê */}
      <rect y={FLOOR} width={VW} height={VH - FLOOR} fill="#a0703e" />
      {Array.from({ length: 4 }, (_, i) => (
        <rect key={i} y={FLOOR + 2 + i * 7} width={VW} height={1} fill="#8a5a2b" />
      ))}
      <ellipse cx={128} cy={79} rx={40} ry={9} fill="#ec6a8c" />
      <ellipse cx={128} cy={79} rx={33} ry={7} fill="#f2b705" />
      <ellipse cx={128} cy={79} rx={25} ry={5} fill="#12a3a0" />
      <ellipse cx={128} cy={79} rx={16} ry={3} fill="#fdf6e3" />
      {/* Janela com cortina de renda e violetas */}
      {box(62, 12, 30, 28, '#fbf7ee', 'win')}
      <View x={64} y={14} w={26} h={24} time={time} id="a" />
      {rects([[76, 14, 2, 24, '#fbf7ee'], [64, 25, 26, 1, '#fbf7ee']], 'wx')}
      {Array.from({ length: 6 }, (_, i) =>
        Array.from({ length: 2 }, (_, j) => <rect key={`${i}${j}`} x={62 + j * 26 + (i % 2)} y={14 + i * 4} width={3} height={3} fill="#ffffff" opacity={0.9} />),
      )}
      {rects([[60, 12, 34, 2, '#ffffff'], [60, 14, 2, 26, '#ffffff'], [92, 14, 2, 26, '#ffffff']], 'cr')}
      {box(60, 40, 34, 2, '#8a5a2b', 'sill')}
      {[66, 80].map((x) => (
        <g key={x}>
          {rects([[x, 36, 6, 4, '#c4553a'], [x - 1, 33, 8, 3, '#3aa655'], [x, 32, 2, 2, '#9b59d0'], [x + 4, 32, 2, 2, '#9b59d0'], [x + 2, 33, 1, 1, '#ffe27a']], `vi${x}`)}
        </g>
      ))}
      {/* Quadro bordado em ponto cruz */}
      <g transform="translate(104 10) scale(1.5)">
        <Pixels runs={STITCH} />
      </g>
      {/* Pano de prato bordado pendurado no prego */}
      {rects([[99, 41, 1, 1, INK], [95, 42, 9, 11, INK], [96, 42, 7, 10, '#fdf6e3'], [96, 51, 7, 1, '#ec6a8c'], [98, 44, 3, 2, '#c9762b'], [100, 43, 1, 1, '#d64545'], [101, 45, 1, 1, '#f2b705'], [98, 47, 1, 1, '#e8a33a'], [100, 47, 1, 1, '#e8a33a']], 'pd')}
      {/* Manequim com um vestido sendo costurado e a fita métrica */}
      {box(140, 30, 10, 4, '#e9d9c2', 'mq1')}
      {box(139, 34, 12, 12, '#ec6a8c', 'mq2')}
      {rects([[139, 34, 12, 1, '#f7a8c8'], [143, 34, 1, 12, '#d64545'], [146, 36, 1, 1, '#ffffff'], [141, 40, 1, 1, '#ffffff'], [148, 42, 1, 1, '#ffffff'], [139, 44, 12, 2, '#fdf6e3'], [142, 30, 1, 6, '#f2b705'], [148, 30, 1, 5, '#f2b705'], [143, 29, 4, 1, '#c9a227']], 'mq3')}
      {rects([[144, 46, 2, 12, '#6b4423'], [140, 58, 10, 2, '#6b4423'], [141, 60, 1, 4, '#6b4423'], [148, 60, 1, 4, '#6b4423']], 'mq4')}
      {/* Bastidores pendurados com bordados */}
      {[
        [154, 20, '#d64545', 'heart'],
        [172, 16, '#f2b705', 'flower'],
        [190, 22, '#12a3a0', 'star'],
      ].map(([cx, cy, c, k]) => (
        <g key={k as string}>
          <rect x={(cx as number)} y={7} width={1} height={(cy as number) - 13} fill="#8a5a2b" />
          {disc(cx as number, cy as number, 6, INK, `h${k}o`)}
          {disc(cx as number, cy as number, 5, '#c58b4a', `h${k}`)}
          {disc(cx as number, cy as number, 4, '#fdf6e3', `h${k}i`)}
          {k === 'heart' && rects([[(cx as number) - 2, (cy as number) - 2, 2, 2, c as string], [(cx as number) + 1, (cy as number) - 2, 2, 2, c as string], [(cx as number) - 2, (cy as number), 5, 1, c as string], [(cx as number) - 1, (cy as number) + 1, 3, 1, c as string], [cx as number, (cy as number) + 2, 1, 1, c as string]], `hc${k}`)}
          {k === 'flower' && rects([[(cx as number) - 1, (cy as number) - 3, 3, 2, c as string], [(cx as number) - 3, (cy as number) - 1, 2, 3, c as string], [(cx as number) + 2, (cy as number) - 1, 2, 3, c as string], [(cx as number) - 1, (cy as number) + 2, 3, 1, c as string], [(cx as number) - 1, (cy as number) - 1, 3, 3, '#d64545']], `hc${k}`)}
          {k === 'star' && rects([[cx as number, (cy as number) - 3, 1, 7, c as string], [(cx as number) - 3, cy as number, 7, 1, c as string], [(cx as number) - 1, (cy as number) - 1, 3, 3, c as string]], `hc${k}`)}
        </g>
      ))}
      {/* Prateleira de carretéis coloridos */}
      {box(204, 32, 32, 2, '#8a5a2b', 'car')}
      {['#d64545', '#e8772e', '#f2b705', '#8cc63f', '#12a3a0', '#2f5fb3', '#6b4fa0', '#ec6a8c'].map((c, i) => (
        <g key={c}>
          {rects([[205 + i * 4, 25, 3, 1, '#c58b4a'], [205 + i * 4, 26, 3, 5, c], [205 + i * 4, 31, 3, 1, '#c58b4a'], [206 + i * 4, 27, 1, 3, shade(c, 0.3)]], `sp${i}`)}
        </g>
      ))}
      {/* Mesa com a máquina de costura antiga */}
      {box(176, 50, 58, 3, '#8a5a2b', 'mesa')}
      {rects([[178, 53, 2, 11, '#6b4423'], [230, 53, 2, 11, '#6b4423'], [180, 60, 50, 1, '#6b4423']], 'ms')}
      {box(184, 46, 30, 4, '#1f1f22', 'base')}
      {box(184, 34, 7, 12, '#1f1f22', 'col')}
      {box(184, 32, 28, 5, '#1f1f22', 'braco')}
      {box(207, 37, 5, 6, '#1f1f22', 'cab')}
      {rects([[186, 33, 20, 1, '#c9a227'], [186, 38, 3, 1, '#c9a227'], [209, 43, 1, 3, '#cfd8dc'], [196, 46, 6, 1, '#c9a227'], [181, 35, 3, 4, '#c9a227']], 'gold')}
      {disc(182, 37, 3, '#4a4a4a', 'vol')}
      {rects([[199, 44, 16, 3, '#fdf6e3'], [202, 45, 2, 1, '#d64545'], [205, 45, 2, 1, '#d64545']], 'pano')}
      {/* Lata de biscoito (que guarda linha e agulha, claro!) */}
      {box(218, 44, 12, 6, '#2f5fb3', 'lata')}
      {rects([[218, 45, 12, 1, '#7fb8ff'], [220, 47, 8, 1, '#f2b705'], [219, 43, 2, 1, '#d64545'], [222, 42, 2, 2, '#f2b705'], [225, 43, 2, 1, '#3aa655'], [227, 42, 2, 2, '#ec6a8c']], 'lt')}
      {box(229, 38, 2, 6, '#2f5fb3', 'tampa')}
      {/* Toalhinha de crochê na beirada da mesa */}
      {Array.from({ length: 14 }, (_, i) => (
        <g key={`cr${i}`}>{rects([[178 + i * 4, 53, 3, 1, '#ffffff'], [179 + i * 4, 54, 1, 1, '#ffffff']], `cro${i}`)}</g>
      ))}
      {/* Poltrona com almofada bordada */}
      {box(18, 40, 34, 10, '#2f7fb3', 'enc')}
      {box(14, 46, 42, 10, '#2f7fb3', 'ass')}
      {rects([[14, 56, 3, 8, '#6b4423'], [53, 56, 3, 8, '#6b4423'], [18, 41, 34, 1, '#5b9fd0']], 'pl')}
      {box(28, 42, 12, 8, '#fdf6e3', 'alm')}
      {rects([[33, 44, 2, 2, '#ec6a8c'], [31, 45, 1, 1, '#3aa655'], [36, 45, 1, 1, '#3aa655']], 'am')}
      {/* Cesta de novelos e o gatinho brincando com a linha */}
      {box(140, 66, 22, 10, '#c58b4a', 'cesta')}
      {rects([[140, 69, 22, 1, '#a0703e'], [140, 72, 22, 1, '#a0703e'], [146, 66, 1, 10, '#a0703e'], [153, 66, 1, 10, '#a0703e']], 'ct')}
      {disc(145, 64, 3, '#d64545', 'n1')}
      {disc(151, 63, 3, '#f2b705', 'n2')}
      {disc(157, 64, 3, '#12a3a0', 'n3')}
      <path d="M160 66 Q170 74 176 80" stroke="#ec6a8c" strokeWidth={0.8} fill="none" />
      <g className="mz-roll">{disc(178, 81, 2, '#ec6a8c', 'nb')}</g>
      <g>
        {rects([[184, 76, 9, 6, INK], [182, 73, 5, 5, INK]], 'co')}
        {rects([[185, 77, 7, 4, '#9aa5ad'], [183, 74, 3, 3, '#9aa5ad'], [183, 72, 1, 1, '#9aa5ad'], [185, 72, 1, 1, '#9aa5ad'], [184, 75, 1, 1, INK], [186, 81, 1, 1, '#9aa5ad'], [190, 81, 1, 1, '#9aa5ad']], 'ct2')}
        <g className="mz-tail">{rects([[193, 76, 1, 3, '#9aa5ad'], [194, 75, 1, 2, '#9aa5ad']], 'cr2')}</g>
      </g>
      <Sunbeam x={66} y={40} w={22} time={time} />
      <Ambient />
      {night && <rect width={VW} height={VH} fill="#0d1b2e" opacity={0.2} />}
    </g>
  );
});

/** Cômodo do mestre, o centro do enquadramento no celular em pé e a cor do chão (que continua embaixo do quiz). */
export const ROOMS: Record<NonNullable<Place['variant']>, { fx: number; floor: string; Scene: (p: { time: DayTime }) => ReactNode }> = {
  roca: { fx: 150, floor: '#a24a35', Scene: Kitchen },
  hiphop: { fx: 150, floor: '#3a281d', Scene: Studio },
  bordado: { fx: 150, floor: '#8a5a2b', Scene: Atelier },
};
