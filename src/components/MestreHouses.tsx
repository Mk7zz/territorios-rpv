import type { ReactNode } from 'react';
import { fromAscii, outline, shade, toRuns, type Run } from '../lib/pixel';
import type { Place } from '../lib/world';
import { Pixels } from './Scene';

/*
 * Casas dos Mestres do Saber no mapa (porta em p.x, p.y). Cada uma conta quem mora nela:
 * - roça (Seu Zico): casinha mineira com telhado de barro, chaminé, lenha e floreiras;
 * - hip hop (Sektor): sobrado de tijolinho com grafite, porta de enrolar, caixa d'água e varal de luzes;
 * - bordado (Dona Rosa): casinha com alpendre, bastidor pendurado e varal de panos bordados.
 * `body` e `details` ganham contorno; `under` é pintado na parede, antes das janelas e portas.
 */

const INK = '#1b2b33';

export type Part = [x: number, y: number, w: number, h: number, fill: string];

export interface HouseParts {
  body: Part[];
  details: Part[];
  under?: ReactNode;
  extra?: ReactNode;
  sign: [number, number];
}

export function roofSteps(x0: number, top: number, w: number, roof: string, rows = 11): Part[] {
  const dark = shade(roof, -0.22);
  return Array.from({ length: rows }, (_, i) => [x0 - 3 + i, top - 1 - i, w + 6 - 2 * i, 1, i % 3 === 0 ? dark : roof] as Part);
}

/* ---- Letras de grafite (pixel) ---- */

const GLYPHS: Record<string, string[]> = {
  H: ['1001', '1001', '1111', '1001', '1001'],
  I: ['111', '010', '010', '010', '111'],
  P: ['1110', '1001', '1110', '1000', '1000'],
  O: ['0110', '1001', '1001', '1001', '0110'],
  ' ': ['00', '00', '00', '00', '00'],
};

/** Palavra em letras de grafite: contorno escuro, cor de cima para baixo e brilho branco. */
export function tagRuns(text: string, colors: string[]): Run[] {
  const rows = Array.from({ length: 5 }, (_, r) => [...text].map((ch) => (GLYPHS[ch] ?? GLYPHS[' '])[r]).join('0'));
  const grid = rows.map((row, r) => `0${row}0`.replace(/1/g, String.fromCharCode(97 + Math.min(r, colors.length - 1))));
  const pal: Record<string, string> = Object.fromEntries(colors.map((c, i) => [String.fromCharCode(97 + i), c]));
  const pad = '0'.repeat(grid[0].length);
  const g = fromAscii([pad, ...grid, pad], pal);
  // Brilho: primeiro pixel de cima de cada letra fica branco.
  g[1] = g[1].map((c, x) => (c && !g[1][x - 1] ? '#ffffff' : c));
  return toRuns(outline(g, INK));
}

const HIP = tagRuns('HIP', ['#ffe27a', '#f2b705', '#ec6a8c', '#d64545', '#6b4fa0']);

/* ---- Pecinhas comuns ---- */

/** Telhas de barro: fileiras com pixels claros e escuros alternados, e a cumeeira. */
function roofTiles(x0: number, top: number, w: number, roof: string, rows: number) {
  const out: ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    const y = top - 1 - i;
    const a = x0 - 3 + i;
    const b = a + w + 6 - 2 * i;
    for (let x = a + 1 + (i % 2) * 2; x < b - 1; x += 4) out.push(<rect key={`t${i}:${x}`} x={x} y={y} width={1} height={1} fill={i % 3 === 0 ? shade(roof, 0.15) : shade(roof, -0.12)} />);
  }
  out.push(<rect key="ridge" x={x0 - 3 + rows - 1} y={top - rows} width={w + 6 - 2 * (rows - 1)} height={1} fill={shade(roof, -0.35)} />);
  out.push(<rect key="eave" x={x0 - 3} y={top - 1} width={w + 6} height={1} fill={shade(roof, -0.32)} />);
  return out;
}

/** Janela mineira: vidro com cortina de renda, cruzeta branca, folhas abertas e floreira. */
function Window({ x, y, glass, wood, flowers }: { x: number; y: number; glass: string; wood: string; flowers: string[] }) {
  const trim = '#fbf7ee';
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={5} height={5} fill={glass} />
      <rect x={x + 1} y={y + 1} width={5} height={1} fill="#ffffff" />
      <rect x={x + 1} y={y + 2} width={1} height={1} fill="#ffffff" />
      <rect x={x + 5} y={y + 2} width={1} height={1} fill="#ffffff" />
      <rect x={x + 3} y={y + 1} width={1} height={5} fill={trim} />
      <rect x={x + 1} y={y + 3} width={5} height={1} fill={trim} />
      <rect x={x - 3} y={y} width={2} height={7} fill={wood} />
      <rect x={x + 8} y={y} width={2} height={7} fill={wood} />
      <rect x={x - 3} y={y + 1} width={1} height={5} fill={shade(wood, 0.2)} />
      <rect x={x + 9} y={y + 1} width={1} height={5} fill={shade(wood, -0.25)} />
      <rect x={x - 1} y={y + 8} width={9} height={2} fill="#8a5a2b" />
      <rect x={x - 1} y={y + 9} width={9} height={1} fill="#6b4423" />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => (
        <rect key={k} x={x + k} y={y + 7} width={1} height={1} fill={k % 2 ? '#3aa655' : flowers[(k / 2) % flowers.length]} />
      ))}
    </g>
  );
}

function Pot({ x, y, leaf, bloom }: { x: number; y: number; leaf: string; bloom?: string }) {
  return (
    <g>
      <rect x={x + 1} y={y - 3} width={5} height={3} fill="#c4553a" />
      <rect x={x + 1} y={y - 3} width={5} height={1} fill="#9a3e28" />
      <rect x={x} y={y - 5} width={7} height={2} fill={leaf} />
      <rect x={x - 1} y={y - 4} width={1} height={1} fill={leaf} />
      <rect x={x + 7} y={y - 4} width={1} height={1} fill={leaf} />
      <rect x={x + 2} y={y - 6} width={3} height={1} fill={bloom ?? '#8cc63f'} />
      {bloom && <rect x={x + 1} y={y - 5} width={1} height={1} fill={bloom} />}
      {bloom && <rect x={x + 5} y={y - 5} width={1} height={1} fill={bloom} />}
    </g>
  );
}

/* ---- Casa da roça: Seu Zico ---- */

function roca(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const w = 40;
  const x0 = x - 20;
  const top = y - 20;
  const wall = p.wall ?? '#f4a3c4';
  const roof = p.roof ?? '#c4553a';
  const trim = '#fbf7ee';
  const wood = '#2f7f8a';
  const lime = '#efe6d6';
  const windows = [x0 + 5, x0 + w - 12];
  const wear: [number, number][] = [[15, 3], [24, 11], [13, 15], [35, 14], [7, 16], [27, 4]];
  return {
    body: [[x0 + 28, top - 13, 5, 8, lime], [x0, top, w, 20, wall], [x0, y - 3, w, 3, shade(wall, -0.18)], ...roofSteps(x0, top, w, roof, 9)],
    details: [[x - 3, y - 13, 6, 13, wood], ...windows.map((wx) => [wx, top + 5, 7, 7, trim] as Part)],
    sign: [x - 5, top - 12],
    under: (
      <g>
        <rect x={x0 + 2} y={top + 1} width={w - 4} height={2} fill={shade(wall, -0.12)} />
        {wear.map(([dx, dy]) => (
          <rect key={`${dx}:${dy}`} x={x0 + dx} y={top + dy} width={2} height={1} fill={shade(wall, -0.07)} />
        ))}
        <rect x={x0} y={y - 3} width={w} height={1} fill={shade(wall, -0.3)} />
        <rect x={x0} y={top} width={2} height={17} fill={trim} />
        <rect x={x0 + w - 2} y={top} width={2} height={17} fill={trim} />
        <rect x={x0} y={top} width={w} height={1} fill={trim} />
        <rect x={x - 4} y={y - 15} width={8} height={1} fill={trim} />
      </g>
    ),
    extra: (
      <g>
        {/* Chaminé com tijolinhos e fumaça do fogão a lenha */}
        <rect x={x0 + 27} y={top - 14} width={7} height={1} fill="#8a8f88" />
        <rect x={x0 + 28} y={top - 10} width={5} height={1} fill="#d9cdb8" />
        <rect x={x0 + 30} y={top - 12} width={1} height={2} fill="#d9cdb8" />
        <rect x={x0 + 28} y={top - 13} width={1} height={1} fill="#6b6f68" />
        <g className="w-smoke" fill="#e9eef2">
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x0 + 29 + (i % 2)} y={top - 17} width={3 - (i % 2)} height={2} style={{ animationDelay: `${-i * 1.2}s` }} />
          ))}
        </g>
        {roofTiles(x0, top, w, roof, 9)}
        {/* Passarinho na cumeeira */}
        <rect x={x0 + 12} y={top - 11} width={3} height={1} fill="#6b4423" />
        <rect x={x0 + 14} y={top - 12} width={1} height={1} fill="#6b4423" />
        <rect x={x0 + 15} y={top - 12} width={1} height={1} fill="#f2b705" />
        {windows.map((wx) => (
          <Window key={wx} x={wx} y={top + 5} glass={glass} wood={wood} flowers={['#d64545', '#f2b705']} />
        ))}
        {/* Porta: almofadas, maçaneta e soleira */}
        <rect x={x - 2} y={y - 12} width={4} height={4} fill={shade(wood, 0.15)} />
        <rect x={x - 2} y={y - 6} width={4} height={4} fill={shade(wood, 0.15)} />
        <rect x={x - 2} y={y - 12} width={4} height={1} fill={shade(wood, 0.3)} />
        <rect x={x + 1} y={y - 7} width={1} height={1} fill="#f2b705" />
        <rect x={x - 5} y={y} width={10} height={1} fill="#bdb49a" />
        <Pot x={x + 8} y={y} leaf="#3aa655" />
        {/* Lenha empilhada do lado de fora */}
        <rect x={x0 + w} y={y - 7} width={10} height={7} fill={INK} />
        <rect x={x0 + w + 1} y={y - 6} width={8} height={6} fill="#6b4423" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <g key={`${r}${c}`}>
              <rect x={x0 + w + 1 + c * 2} y={y - 6 + r * 2} width={2} height={2} fill={(r + c) % 2 ? '#c58b4a' : '#d9a066'} />
              <rect x={x0 + w + 1 + c * 2} y={y - 5 + r * 2} width={1} height={1} fill="#8a5a2b" />
            </g>
          )),
        )}
      </g>
    ),
  };
}

/* ---- Casa do Hip Hop: Sektor ---- */

const LIGHTS = ['#ec6a8c', '#f2b705', '#12a3a0', '#8cc63f'];

function hiphop(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === '#ffd76a';
  const w = 44;
  const x0 = x - 22;
  const top = y - 28;
  const brick = '#a45a45';
  const mortar = '#874436';
  const concrete = '#8a959c';
  const win = night ? '#d79cff' : '#3b4a52';
  const bricks: ReactNode[] = [];
  for (let r = 0, yy = top + 1; yy < y - 2; r++, yy += 3) {
    bricks.push(<rect key={`m${yy}`} x={x0} y={yy + 2} width={w} height={1} fill={mortar} />);
    for (let xx = x0 + (r % 2 ? 3 : 0); xx < x0 + w; xx += 6) bricks.push(<rect key={`j${yy}:${xx}`} x={xx} y={yy} width={1} height={2} fill={mortar} />);
    if (r % 3 === 1) bricks.push(<rect key={`l${yy}`} x={x0 + 4 + ((r * 7) % 30)} y={yy} width={2} height={1} fill={shade(brick, 0.12)} />);
  }
  const wire = Array.from({ length: 10 }, (_, i) => [x0 + w + 1 + i * 0.5, top - 1 + i * 0.9]);
  return {
    body: [
      [x0 + 29, top - 10, 10, 7, '#2f6fb0'],
      [x0, top, w, 28, brick],
      [x0 - 1, top - 3, w + 2, 3, concrete],
      [x0 + 8, top - 9, 1, 6, '#5c6970'],
    ],
    details: [[x - 8, y - 15, 16, 15, '#9aa5ad'], [x0 + 4, top + 4, 9, 7, win], [x0 + w - 13, top + 4, 9, 7, win]],
    sign: [x - 5, top - 14],
    under: (
      <g>
        {bricks}
        {/* Grafite "HIP" entre as janelas e uma marca colorida perto da porta */}
        <g transform={`translate(${x0 + 14} ${top + 3})`}>
          <rect x={-1} y={0} width={18} height={8} fill="#2a1f3d" opacity={0.25} />
          <Pixels runs={HIP} />
        </g>
        <rect x={x0 + 2} y={y - 12} width={10} height={7} fill="#12a3a0" />
        <rect x={x0 + 3} y={y - 13} width={6} height={1} fill="#12a3a0" />
        <rect x={x0 + 4} y={y - 11} width={2} height={2} fill="#ffffff" />
        <rect x={x0 + 8} y={y - 10} width={3} height={3} fill="#f2b705" />
        <rect x={x0 + 3} y={y - 7} width={4} height={1} fill="#ec6a8c" />
        <rect x={x0 + 5} y={y - 5} width={1} height={2} fill="#12a3a0" />
        <rect x={x0 + 10} y={y - 5} width={1} height={3} fill="#12a3a0" />
        <rect x={x0 + w - 9} y={y - 12} width={7} height={2} fill="#ec6a8c" />
        <rect x={x0 + w - 8} y={y - 10} width={5} height={1} fill="#6b4fa0" />
        <rect x={x0 + w - 5} y={y - 9} width={1} height={3} fill="#ec6a8c" />
      </g>
    ),
    extra: (
      <g>
        {/* Caixa d'água e antena */}
        <rect x={x0 + 30} y={top - 11} width={8} height={1} fill="#24578f" />
        <rect x={x0 + 30} y={top - 9} width={2} height={5} fill="#5b93cf" />
        <rect x={x0 + 6} y={top - 9} width={5} height={1} fill="#5c6970" />
        <rect x={x0 - 1} y={top - 3} width={w + 2} height={1} fill={shade(concrete, 0.2)} />
        {/* Varal de luzinhas embaixo da platibanda */}
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} className="w-light" x={x0 + 1 + i * 3} y={top + (i % 2)} width={1} height={1} fill={LIGHTS[i % 4]} style={{ animationDelay: `${-(i % 4) * 0.35}s` }} />
        ))}
        {/* Janelas com grade */}
        {[x0 + 4, x0 + w - 13].map((wx) => (
          <g key={wx}>
            {[2, 4, 6].map((k) => (
              <rect key={k} x={wx + k} y={top + 4} width={1} height={7} fill="#5c6970" />
            ))}
            <rect x={wx + 1} y={top + 5} width={1} height={2} fill={night ? '#ffffff' : '#ec6a8c'} opacity={0.7} />
          </g>
        ))}
        {/* Porta de enrolar meio aberta, com a luz do estúdio aparecendo */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={x - 8} y={y - 14 + i * 2} width={16} height={1} fill="#7f8a91" />
        ))}
        <rect x={x - 8} y={y - 5} width={16} height={5} fill="#2a1f3d" />
        <rect x={x - 8} y={y - 5} width={16} height={1} fill="#5c6970" />
        <rect x={x - 7} y={y - 3} width={14} height={1} fill={night ? '#ff9cf0' : '#c86bd8'} opacity={0.8} />
        <rect x={x - 6} y={y - 1} width={12} height={1} fill="#6b4fa0" opacity={0.7} />
        <rect x={x - 1} y={y - 6} width={2} height={1} fill="#3c4a52" />
        {/* Caixa de som portátil na calçada e lata de spray */}
        <rect x={x + 10} y={y - 6} width={9} height={6} fill={INK} />
        <rect x={x + 11} y={y - 5} width={7} height={4} fill="#3c4a52" />
        <rect x={x + 11} y={y - 4} width={2} height={2} fill="#9aa5ad" />
        <rect x={x + 16} y={y - 4} width={2} height={2} fill="#9aa5ad" />
        <rect x={x + 14} y={y - 5} width={1} height={1} fill="#ec6a8c" />
        <rect x={x + 13} y={y - 7} width={3} height={1} fill={INK} />
        <rect x={x0 + 13} y={y - 4} width={2} height={4} fill="#d64545" />
        <rect x={x0 + 13} y={y - 5} width={2} height={1} fill="#f4f4f4" />
        {/* Poste com o par de tênis pendurado no fio */}
        <rect x={x0 + w + 6} y={y - 24} width={1} height={24} fill="#5c6970" />
        <rect x={x0 + w + 4} y={y - 24} width={5} height={1} fill="#5c6970" />
        {wire.map(([wx, wy], i) => (
          <rect key={i} x={wx} y={wy} width={1} height={0.6} fill={INK} opacity={0.7} />
        ))}
        <rect x={x0 + w + 3} y={top + 4} width={1} height={3} fill="#f4f4f4" opacity={0.8} />
        <rect x={x0 + w + 2} y={top + 7} width={2} height={1} fill="#f4f4f4" />
        <rect x={x0 + w + 2} y={top + 8} width={2} height={1} fill="#d64545" />
      </g>
    ),
  };
}

/* ---- Casa do bordado: Dona Rosa ---- */

function bordado(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const w = 40;
  const x0 = x - 20;
  const top = y - 20;
  const wall = p.wall ?? '#f6dc8a';
  const roof = p.roof ?? '#b5523b';
  const trim = '#fbf7ee';
  const blue = '#3b6fb0';
  const windows = [x0 + 5, x0 + w - 12];
  const garland = ['#ec6a8c', '#3aa655', '#b48ae0', '#3aa655'];
  return {
    body: [[x0, top, w, 20, wall], [x0, y - 3, w, 3, shade(wall, -0.2)], ...roofSteps(x0, top, w, roof, 9)],
    details: [[x - 3, y - 13, 6, 13, blue], ...windows.map((wx) => [wx, top + 5, 7, 7, trim] as Part), [x - 10, y - 18, 20, 2, shade(roof, -0.05)]],
    sign: [x - 5, top - 12],
    under: (
      <g>
        <rect x={x0 + 2} y={top + 1} width={w - 4} height={1} fill={shade(wall, -0.12)} />
        {/* Barrado de florzinhas pintado embaixo do beiral */}
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={x0 + 3 + i * 2} y={top + 2 + (i % 2)} width={1} height={1} fill={garland[i % 4]} />
        ))}
        <rect x={x0} y={y - 3} width={w} height={1} fill={shade(wall, -0.32)} />
        <rect x={x0} y={top} width={2} height={17} fill={trim} />
        <rect x={x0 + w - 2} y={top} width={2} height={17} fill={trim} />
        <rect x={x0} y={top} width={w} height={1} fill={trim} />
      </g>
    ),
    extra: (
      <g>
        {roofTiles(x0, top, w, roof, 9)}
        {windows.map((wx) => (
          <Window key={wx} x={wx} y={top + 5} glass={glass} wood={blue} flowers={['#ec6a8c', '#b48ae0', '#ffffff']} />
        ))}
        {/* Gatinho dormindo na floreira */}
        <rect x={x0 + 6} y={top + 11} width={4} height={2} fill="#9aa5ad" />
        <rect x={x0 + 9} y={top + 10} width={2} height={2} fill="#9aa5ad" />
        <rect x={x0 + 9} y={top + 10} width={1} height={1} fill="#6f7b84" />
        <rect x={x0 + 5} y={top + 12} width={1} height={1} fill="#6f7b84" />
        {/* Alpendre: telhadinho sobre a porta, esteios e o bastidor pendurado */}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={x - 9 + i * 4} y={y - 18} width={1} height={1} fill={shade(roof, 0.18)} />
        ))}
        <rect x={x - 9} y={y - 15} width={1} height={15} fill="#8a5a2b" />
        <rect x={x + 8} y={y - 15} width={1} height={15} fill="#8a5a2b" />
        <rect x={x + 5} y={y - 15} width={1} height={1} fill="#6b4423" />
        <rect x={x + 3} y={y - 14} width={5} height={5} fill="#c58b4a" />
        <rect x={x + 4} y={y - 13} width={3} height={3} fill="#ffffff" />
        <rect x={x + 5} y={y - 12} width={1} height={1} fill="#d64545" />
        <rect x={x + 4} y={y - 13} width={1} height={1} fill="#3aa655" />
        {/* Porta azul com almofadas */}
        <rect x={x - 2} y={y - 12} width={4} height={4} fill={shade(blue, 0.18)} />
        <rect x={x - 2} y={y - 6} width={4} height={4} fill={shade(blue, 0.18)} />
        <rect x={x + 1} y={y - 7} width={1} height={1} fill="#f2b705" />
        <rect x={x - 5} y={y} width={10} height={1} fill="#bdb49a" />
        <Pot x={x + 10} y={y} leaf="#3aa655" bloom="#b48ae0" />
        {/* Varal com panos de prato bordados */}
        <rect x={x0 + w + 2} y={y - 14} width={1} height={14} fill="#8a5a2b" />
        <rect x={x0 + w + 13} y={y - 14} width={1} height={14} fill="#8a5a2b" />
        <rect x={x0 + w + 2} y={y - 13} width={12} height={1} fill="#e9e1d3" />
        <rect x={x0 + w + 3} y={y - 12} width={5} height={6} fill={INK} />
        <rect x={x0 + w + 4} y={y - 12} width={3} height={5} fill="#ffffff" />
        <rect x={x0 + w + 5} y={y - 10} width={1} height={1} fill="#d64545" />
        <rect x={x0 + w + 4} y={y - 8} width={3} height={1} fill="#12a3a0" />
        <rect x={x0 + w + 8} y={y - 12} width={5} height={5} fill={INK} />
        <rect x={x0 + w + 9} y={y - 12} width={3} height={4} fill="#ffe1ec" />
        <rect x={x0 + w + 10} y={y - 11} width={1} height={1} fill="#f2b705" />
        <rect x={x0 + w + 9} y={y - 9} width={3} height={1} fill="#ec6a8c" />
      </g>
    ),
  };
}

/** Desenho da casa do Mestre do Saber conforme o estilo dela. */
export function mestreParts(p: Place, glass: string): HouseParts {
  if (p.variant === 'hiphop') return hiphop(p, glass);
  if (p.variant === 'bordado') return bordado(p, glass);
  return roca(p, glass);
}
