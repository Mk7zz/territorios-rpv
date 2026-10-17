import type { ReactNode } from 'react';
import { CITY_BRIDGE as BRIDGE, type Place } from '../lib/world';
import { BRIDGE_DARK, BRIDGE_LIGHT, BRIDGE_RED, MAP_BRIDGE, MiniText } from './Landmarks';
import type { HouseParts, Part } from './MestreHouses';

/*
 * Pontos focais desenhados no mapa com mais capricho, cada um seguindo a sua cena (pages/cidade):
 * telhado de telha em fileiras, tijolinho, janelas com moldura e vidro, enfeites brancos, plantas
 * na frente e luzes acesas à noite. O `body` é só a silhueta (ganha o contorno escuro); o resto
 * vai em `extra`, sem contorno, para os detalhes pequenos ficarem finos.
 */

const INK = '#1b2b33';
const NIGHT = '#ffd76a';

/** Retângulo sem contorno (atalho para os detalhes). */
const R = (x: number, y: number, w: number, h: number, fill: string, opacity?: number) => <rect key={`${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />;

/** Janela em arco: moldura clara, vidro (aceso à noite), travessa e o arco em cima. */
function ArchWindow({ x, y, w, h, frame, glass, bars = true }: { x: number; y: number; w: number; h: number; frame: string; glass: string; bars?: boolean }) {
  return (
    <g>
      {R(x - 1, y + 1, w + 2, h, frame)}
      {R(x, y, w, 1, frame)}
      {R(x, y + 1, w, h - 1, glass)}
      {R(x + 1, y, w - 2, 1, glass)}
      {bars && R(x + w / 2 - 0.25, y + 1, 0.5, h - 1, frame)}
      {bars && R(x, y + Math.round(h * 0.45), w, 0.5, frame)}
      {R(x, y + 1, 1, h - 1, '#ffffff', 0.18)}
    </g>
  );
}

/** Agave: as folhas compridas azuladas que ficam na frente da Chácara. */
function Agave({ x, y }: { x: number; y: number }) {
  const leaves: [number, number][] = [
    [-4, -1],
    [-3, -3],
    [-1, -4],
    [1, -4],
    [3, -3],
    [4, -1],
  ];
  return (
    <g>
      {leaves.map(([dx, dy], i) => (
        <line key={i} x1={x} y1={y} x2={x + dx} y2={y + dy} stroke={i % 2 ? '#4f7f72' : '#7aa89a'} strokeWidth={0.9} />
      ))}
      {R(x - 0.5, y - 2, 1, 2, '#3f6a5e')}
    </g>
  );
}

/* ---- Chácara Dona Catarina ---- */

/**
 * Casa laranja com as duas alas de telhado vermelho, o corpo do meio mais alto com o frontão de
 * renda branca, o olho-de-boi, a cruz em cima, as janelas em arco, cunhais brancos, a grade branca
 * da varanda, a base cinza e as agaves na frente.
 */
export function chacaraParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const wall = '#f08a24';
  const wallD = '#cf6f1a';
  const roof = '#b5523b';
  const roofD = '#8e3f2c';
  const white = '#fbf7ec';
  const win = night ? NIGHT : '#33434a';
  const body: Part[] = [
    [x - 27, y - 14, 19, 14, wall],
    [x + 8, y - 14, 19, 14, wall],
    ...Array.from({ length: 6 }, (_, i) => [x - 28 + i, y - 15 - i, 21 - i, 1, roof] as Part),
    ...Array.from({ length: 6 }, (_, i) => [x + 7, y - 15 - i, 21 - i, 1, roof] as Part),
    [x - 9, y - 22, 18, 22, wall],
    ...Array.from({ length: 9 }, (_, i) => [x - 9 + i, y - 23 - i, 18 - 2 * i, 1, wall] as Part),
  ];
  // Telhas: fileiras com a linha escura a cada duas
  const tiles: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const c = i % 2 ? roofD : roof;
    tiles.push(R(x - 28 + i, y - 15 - i, 21 - i, 1, c), R(x + 7, y - 15 - i, 21 - i, 1, c));
    for (let k = 0; k < 21 - i; k += 3) tiles.push(R(x - 28 + i + k + (i % 2), y - 15 - i, 0.5, 1, roofD), R(x + 7 + k + (i % 2), y - 15 - i, 0.5, 1, roofD));
  }
  // Renda de madeira branca na beira do frontão e das alas
  const lace: ReactNode[] = [];
  for (let i = 0; i < 9; i++) lace.push(R(x - 10 + i, y - 23 - i, 1, i % 2 ? 2 : 1, white), R(x + 9 - i, y - 23 - i, 1, i % 2 ? 2 : 1, white));
  for (let k = 0; k < 19; k += 2) lace.push(R(x - 27 + k, y - 14, 1, 1.4, white), R(x + 8 + k, y - 14, 1, 1.4, white));
  return {
    body,
    details: [],
    sign: [x - 5, y - 46],
    under: (
      <g>
        {R(x - 27, y - 2, 54, 2, '#8d969c')}
        {/* Caminho de pedrinha até a porta */}
        {R(x - 4, y, 8, 3, '#e3dccb')}
      </g>
    ),
    extra: (
      <g>
        {tiles}
        {/* Sombra das alas encostando no corpo do meio e a parede mais escura embaixo do beiral */}
        {R(x - 27, y - 14, 19, 1, wallD)}
        {R(x + 8, y - 14, 19, 1, wallD)}
        {R(x - 9, y - 22, 18, 1, wallD)}
        {/* Beiral vermelho por cima do frontão */}
        {Array.from({ length: 10 }, (_, i) => (
          <g key={`b${i}`}>
            {R(x - 11 + i, y - 23 - i, 1, 1, roof)}
            {R(x + 10 - i, y - 23 - i, 1, 1, roof)}
          </g>
        ))}
        {lace}
        {/* Olho-de-boi e a cruz com o enfeite amarelo */}
        <circle cx={x} cy={y - 27} r={2.2} fill={white} />
        <circle cx={x} cy={y - 27} r={1.2} fill={win} />
        {R(x - 0.5, y - 38, 1, 5, white)}
        {R(x - 1.5, y - 37, 3, 1, white)}
        {R(x - 1, y - 33, 2, 1, '#f2b705')}
        {/* Cunhais brancos com os blocos */}
        {[x - 9, x + 7.5, x - 27, x + 25.5].map((cx) => (
          <g key={cx}>
            {R(cx, cx === x - 9 || cx === x + 7.5 ? y - 22 : y - 14, 1.5, cx === x - 9 || cx === x + 7.5 ? 22 : 14, white)}
            {Array.from({ length: 6 }, (_, k) => R(cx + (k % 2 ? 0 : 0.5), y - 3 - k * 3.4, 1, 1, '#e3dccb'))}
          </g>
        ))}
        {/* Janelas em arco das alas e as três do meio */}
        {[x - 24, x - 16, x + 11, x + 19].map((wx) => (
          <ArchWindow key={wx} x={wx} y={y - 12} w={5} h={9} frame={white} glass={win} />
        ))}
        {[x - 7, x - 2, x + 3].map((wx) => (
          <ArchWindow key={wx} x={wx} y={y - 20} w={4} h={9} frame={white} glass={win} />
        ))}
        {/* Varanda com a grade branca */}
        {R(x - 7.5, y - 9, 15, 7, night ? '#a8823a' : '#3d2f28')}
        {R(x - 7.5, y - 9, 15, 1, white)}
        {Array.from({ length: 8 }, (_, k) => R(x - 7 + k * 2, y - 8, 0.6, 6, white))}
        {R(x - 7.5, y - 4, 15, 0.6, white)}
        {/* Agaves dos dois lados da entrada */}
        <Agave x={x - 13} y={y + 1} />
        <Agave x={x + 13} y={y + 1} />
      </g>
    ),
  };
}

/* ---- Centro Cultural Humberto Mauro ---- */

/**
 * Prédio de dois andares: a galeria em cima (janelões com os quadros lá dentro), a faixa vermelha
 * com o logo e o nome, e embaixo a entrada aberta mostrando o elevador vermelho, a cortina e as
 * cadeiras do teatro, entre os pilares de cobogó. Caixa d'água em cima e o cartaz na calçada.
 */
export function culturalParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const wall = '#eeece0';
  const red = '#d42a2a';
  const brick = '#9a5a48';
  const body: Part[] = [
    [x - 16, y - 32, 32, 32, wall],
    [x - 17, y - 34, 34, 2, '#cfcdb0'],
    [x + 5, y - 39, 8, 5, '#b9c0c4'],
  ];
  const art = ['#d64545', '#2f8fd8', '#f2b705', '#3aa655', '#6b4fa0', '#e8772e'];
  return {
    body,
    details: [],
    sign: [x - 5, y - 50],
    under: R(x - 16, y - 1, 32, 1, '#8d969c'),
    extra: (
      <g>
        {/* Caixa d'água e o ar-condicionado em cima */}
        {R(x + 5, y - 36, 8, 1, '#8d969c')}
        {R(x + 6, y - 38, 2, 4, '#dfe4e6')}
        {R(x - 13, y - 37, 5, 3, '#c9ced1')}
        {R(x - 12, y - 36, 3, 1, '#8d969c')}
        {/* Janelões da galeria com os quadros */}
        {[x - 14, x + 1].map((wx, i) => (
          <g key={wx}>
            {R(wx - 1, y - 30, 15, 11, '#4a5258')}
            {R(wx, y - 29, 13, 9, night ? '#f3e2b0' : '#e9eef0')}
            {[0, 1, 2].map((k) => R(wx + 1 + k * 4, y - 27, 3, 3, art[(k + i * 3) % art.length]))}
            {R(wx, y - 23, 13, 3, night ? '#e9cf8a' : '#d9cdb4')}
            {R(wx + 6.25, y - 29, 0.5, 9, '#4a5258')}
            {R(wx, y - 29, 13, 1, '#ffffff', 0.35)}
          </g>
        ))}
        {/* Faixa vermelha com o logo e as letrinhas do nome */}
        {R(x - 17, y - 18, 34, 6, red)}
        {R(x - 17, y - 18, 34, 1, '#e8584f')}
        {R(x - 17, y - 13, 34, 1, '#a81f1f')}
        {R(x - 15, y - 17, 3, 4, '#ffffff')}
        {R(x - 14, y - 16, 1, 3, red)}
        {R(x - 10, y - 16.5, 18, 1, '#ffffff')}
        {R(x - 10, y - 14.5, 14, 1, '#ffffff')}
        {/* Entrada aberta: elevador, cortina, cadeiras e o piso */}
        {R(x - 14, y - 12, 28, 12, night ? '#4a3a2a' : '#2f2a2a')}
        {R(x - 12, y - 11, 5, 11, '#c8262b')}
        {R(x - 9.75, y - 10, 0.5, 10, '#8e1a1e')}
        {R(x - 12, y - 11, 5, 1, '#e8584f')}
        {R(x, y - 11, 12, 5, '#b81f24')}
        {Array.from({ length: 6 }, (_, k) => R(x + 1 + k * 2, y - 11, 0.5, 5, '#8e1a1e'))}
        {R(x - 5, y - 2, 19, 2, '#d9b98a')}
        {[0, 1].map((r) => (
          <g key={r}>{Array.from({ length: 5 }, (_, k) => R(x - 1 + k * 2.6 + r, y - 5 + r * 2, 2, 1.6, '#d42a2a'))}</g>
        ))}
        {[x - 10, x - 2, x + 6].map((lx) => R(lx, y - 12, 2, 0.8, '#fff1b8'))}
        {R(x - 14, y - 12, 28, 12, '#bfe9f2', night ? 0.06 : 0.12)}
        {/* Pilares de cobogó */}
        {[x - 17, x + 14].map((px) => (
          <g key={px}>
            {R(px, y - 12, 3, 12, brick)}
            {Array.from({ length: 5 }, (_, k) => (
              <g key={k}>
                {R(px + 0.5, y - 11 + k * 2.3, 0.8, 0.8, '#4a2a22')}
                {R(px + 1.7, y - 11 + k * 2.3 + 1, 0.8, 0.8, '#4a2a22')}
              </g>
            ))}
          </g>
        ))}
        {/* Cartaz do cinema na calçada */}
        {R(x + 18, y - 9, 5, 7, INK)}
        {R(x + 18.5, y - 8.5, 4, 6, '#f2b705')}
        {R(x + 19, y - 7.5, 3, 2, '#2f5fb3')}
        {R(x + 19, y - 5, 3, 1, '#d42a2a')}
        {R(x + 18.5, y - 2, 0.6, 2, INK)}
        {R(x + 21.9, y - 2, 0.6, 2, INK)}
      </g>
    ),
  };
}

/* ---- Museu Energisa ---- */

/**
 * Casarão amarelo art nouveau: o frontão curvo com o enfeite branco, as cornijas, as três janelas
 * altas com venezianas brancas e sacadas de ferro, o térreo listrado com as janelinhas gradeadas e
 * a porta; à esquerda, o alpendre com o telhadinho de madeira, o nome do museu, a turbina laranja
 * no porão e a escada branca. No chão, do lado do caminho, a plaquinha "MUSEU ENERGISA".
 */
export function museumParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const wall = '#f2cf6b';
  const wallD = '#d9b24e';
  const white = '#fbf7ec';
  const iron = '#4f5d66';
  const x0 = x - 23;
  const xb = x0 + 14;
  const xc = xb + 7;
  const teal = '#12a3a0';
  const body: Part[] = [
    [x0, y - 12, 14, 12, wall],
    [x0 + 1, y - 24, 13, 11, wallD],
    [x0 - 1, y - 26, 16, 2, '#8a5a2b'],
    [xb, y - 28, 32, 28, wall],
    [xc, y - 33, 18, 5, wall],
    [xc + 2, y - 35, 14, 2, wall],
    [xc + 5, y - 37, 8, 2, white],
  ];
  return {
    body,
    details: [],
    sign: [x - 5, y - 52],
    under: (
      <g>
        {R(x0 - 7, y - 1, 60, 1, '#8d969c')}
        {/* Plaquinha no chão, do lado do caminho */}
        <g>
          {R(x + 9, y + 9, 1, 6, '#5f6d76')}
          {R(x + 30, y + 9, 1, 6, '#5f6d76')}
          {R(x + 7, y + 3, 26, 10, INK)}
          {R(x + 8, y + 4, 24, 8, '#0f6f6a')}
          {R(x + 8, y + 4, 24, 1, '#3fb5ae')}
          <path d={`M${x + 10.5} ${y + 5}L${x + 9.5} ${y + 8}L${x + 11} ${y + 8}L${x + 10} ${y + 11}L${x + 12} ${y + 7.5}L${x + 10.6} ${y + 7.5}L${x + 11.6} ${y + 5}Z`} fill="#f2a33a" />
          <g transform={`translate(${x + 14} ${y + 5}) scale(0.55)`}>
            <MiniText text="MUSEU" x={0} y={0} fill="#ffffff" />
          </g>
          <g transform={`translate(${x + 13} ${y + 8.4}) scale(0.5)`}>
            <MiniText text="ENERGISA" x={0} y={0} fill="#ffffff" />
          </g>
          {R(x + 7, y + 15, 26, 1, '#000', 0.15)}
        </g>
      </g>
    ),
    extra: (
      <g>
        {/* Térreo listrado (reboco em faixas) */}
        {Array.from({ length: 6 }, (_, k) => R(xb, y - 13 + k * 2, 32, 0.6, wallD))}
        {R(xb + 31, y - 28, 1, 28, wallD)}
        {/* Cornijas brancas e o frontão curvo */}
        {R(xb - 1, y - 29, 34, 1.5, white)}
        {R(xb - 1, y - 15, 34, 1.5, white)}
        <path d={`M${xc} ${y - 28}V${y - 31}Q${xc + 9} ${y - 38} ${xc + 18} ${y - 31}V${y - 28}`} fill="none" stroke={white} strokeWidth={1} />
        {R(xc + 6, y - 33, 6, 3, white)}
        {R(xc + 7, y - 32, 4, 1, wallD)}
        {R(xc + 8.5, y - 40, 1, 3, white)}
        {/* Pilastras brancas */}
        {[xb, xb + 10, xb + 20.5, xb + 30].map((px) => R(px, y - 28, 1.5, 13, white))}
        {/* Janelas altas com venezianas brancas e sacada de ferro */}
        {[xb + 3.5, xb + 13.5, xb + 24].map((wx) => (
          <g key={wx}>
            {R(wx - 1, y - 27, 6, 11, white)}
            {R(wx, y - 26, 4, 3, night ? NIGHT : '#9fc8e0')}
            {R(wx, y - 23, 4, 6, '#f4f1e6')}
            {[0, 1, 2, 3].map((k) => R(wx, y - 22.5 + k * 1.5, 4, 0.4, '#cfc6b0'))}
            {R(wx + 1.8, y - 23, 0.4, 6, '#cfc6b0')}
            {R(wx - 2, y - 17, 8, 0.7, iron)}
            {[0, 1, 2, 3, 4].map((k) => R(wx - 1.6 + k * 1.8, y - 16.3, 0.4, 1.6, iron))}
          </g>
        ))}
        {/* Janelinhas do porão com grade e a porta */}
        {[xb + 3.5, xb + 24].map((wx) => (
          <g key={wx}>
            {R(wx - 0.5, y - 11, 5, 7, white)}
            {R(wx, y - 10.5, 4, 6, night ? '#e9cf8a' : '#3d5560')}
            {[1, 2, 3].map((k) => R(wx + k - 0.2, y - 10.5, 0.4, 6, '#c9ced1'))}
          </g>
        ))}
        {R(xb + 13, y - 12, 6, 12, white)}
        {R(xb + 14, y - 11, 4, 11, '#7a4a25')}
        {R(xb + 15.8, y - 11, 0.4, 11, '#5a3418')}
        {/* Alpendre: telhadinho com caibros, o nome do museu e o guarda-corpo */}
        {Array.from({ length: 5 }, (_, k) => R(x0 + k * 3.5, y - 26, 1, 2, '#6b4423'))}
        {R(x0 + 2, y - 23, 10, 1, teal)}
        {R(x0 + 2, y - 21, 7, 1, teal)}
        {R(x0 + 2.5, y - 20, 4, 3, '#efe2c4')}
        {R(x0 + 2.5, y - 17.6, 4, 0.6, '#ec6a8c')}
        {R(x0, y - 17, 14, 0.8, iron)}
        {Array.from({ length: 7 }, (_, i) => R(x0 + i * 2, y - 16.2, 0.5, 3, iron))}
        {R(x0, y - 13, 14, 1, white)}
        {R(x0, y - 24, 0.8, 11, iron)}
        {R(x0 + 12.5, y - 24, 0.8, 11, iron)}
        {/* Porão aberto com a turbina laranja */}
        {R(x0 + 1, y - 11, 12, 10, '#3d4549')}
        <circle cx={x0 + 7} cy={y - 6} r={3.6} fill="#e8772e" />
        <circle cx={x0 + 7} cy={y - 6} r={2.2} fill="#2b2f33" />
        {[0, 1, 2, 3].map((k) => (
          <line key={k} x1={x0 + 7} y1={y - 6} x2={x0 + 7 + Math.cos(k * 0.8) * 2.2} y2={y - 6 + Math.sin(k * 0.8 + 1) * 2.2} stroke="#c9ced1" strokeWidth={0.5} />
        ))}
        {/* Escada branca subindo pela esquerda */}
        {Array.from({ length: 6 }, (_, i) => R(x0 - 6 + i, y - 2 - i * 2, 3, 2, i % 2 ? '#e9e2d0' : white))}
        {R(x0 - 6, y - 14, 0.6, 12, iron)}
      </g>
    ),
  };
}

/* ---- Estação Cataguases ---- */

/**
 * Estação de tijolinho: o frontão da esquerda com o beiral escuro, os dois olhos-de-boi, a placa
 * com o nome, as janelas e a porta em arco com os vasos; o prédio comprido de telha marrom com a
 * plataforma coberta, as portas, o sino e o relógio; e os trilhos com dormentes na frente.
 */
export function stationParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const brick = '#c0573e';
  const brickD = '#a8462f';
  const roof = '#8a5a3a';
  const roofD = '#6b4423';
  const cream = '#f1e3c4';
  const gx = x - 30;
  const win = night ? NIGHT : '#3d2a1e';
  const body: Part[] = [
    [gx, y - 16, 20, 16, brick],
    ...Array.from({ length: 10 }, (_, i) => [gx + i, y - 17 - i, 20 - 2 * i, 1, brick] as Part),
    [gx + 20, y - 13, 46, 13, brick],
    [gx + 19, y - 22, 48, 8, roof],
  ];
  const bricks: ReactNode[] = [];
  for (let r = 0; r < 7; r++) bricks.push(R(gx, y - 15 + r * 2, 20, 0.4, brickD), R(gx + 20, y - 12 + r * 2, 46, 0.4, brickD));
  return {
    body,
    details: [],
    sign: [x - 5, y - 44],
    under: (
      <g>
        {/* Plataforma com a faixa amarela */}
        {R(gx - 2, y - 2, 72, 3, '#d9c9a3')}
        {R(gx - 2, y + 0.5, 72, 0.6, '#e8c62e')}
        {/* Trilhos: brita, dormentes e os dois trilhos */}
        {R(gx - 6, y + 2, 80, 7, '#9a8f7a')}
        {Array.from({ length: 27 }, (_, i) => R(gx - 6 + i * 3, y + 2.5, 2, 6, '#6b4423'))}
        {R(gx - 6, y + 3.5, 80, 0.8, '#c9ced1')}
        {R(gx - 6, y + 6.5, 80, 0.8, '#c9ced1')}
      </g>
    ),
    extra: (
      <g>
        {bricks}
        {/* Telhado comprido: fileiras de telha e as emendas */}
        {Array.from({ length: 8 }, (_, i) => R(gx + 19, y - 22 + i, 48, 1, i % 3 === 2 ? roofD : roof))}
        {Array.from({ length: 16 }, (_, k) => R(gx + 20 + k * 3, y - 22, 0.4, 8, roofD))}
        {R(gx + 19, y - 14.5, 48, 1, '#4a2e18')}
        {/* Beiral escuro do frontão com o friso claro */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={`e${i}`}>
            {R(gx - 1 + i, y - 17 - i, 1.4, 1.4, '#3a2418')}
            {R(gx + 19.6 - i, y - 17 - i, 1.4, 1.4, '#3a2418')}
          </g>
        ))}
        {R(gx, y - 16.5, 20, 0.8, cream)}
        {/* Olhos-de-boi e a placa com o nome */}
        {[gx + 7, gx + 13].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={y - 22} r={1.7} fill={cream} />
            <circle cx={cx} cy={y - 22} r={0.9} fill="#2a1a12" />
          </g>
        ))}
        {R(gx + 0.5, y - 18.5, 19, 4, cream)}
        <g transform={`translate(${gx + 1.6} ${y - 17.6}) scale(0.42)`}>
          <MiniText text="CATAGUAZES" x={0} y={0} fill="#3a2418" />
        </g>
        {/* Janelas e a porta em arco, com os vasos */}
        <ArchWindow x={gx + 2} y={y - 12} w={4} h={9} frame={cream} glass={win} />
        <ArchWindow x={gx + 14} y={y - 12} w={4} h={9} frame={cream} glass={win} />
        <ArchWindow x={gx + 8} y={y - 13} w={4} h={13} frame={cream} glass={night ? '#c9a95a' : '#5a3a26'} bars={false} />
        {[gx + 4, gx + 16].map((vx) => (
          <g key={vx}>
            {R(vx - 1.5, y - 3, 3, 2, '#b9b6ac')}
            <line x1={vx} y1={y - 3} x2={vx - 2} y2={y - 6} stroke="#3aa655" strokeWidth={0.7} />
            <line x1={vx} y1={y - 3} x2={vx + 2} y2={y - 6} stroke="#3aa655" strokeWidth={0.7} />
            <line x1={vx} y1={y - 3} x2={vx} y2={y - 6.5} stroke="#2f8a45" strokeWidth={0.7} />
          </g>
        ))}
        {/* Prédio comprido: portas e janelas com moldura creme */}
        {Array.from({ length: 5 }, (_, i) => (
          <g key={`d${i}`}>
            {R(gx + 23 + i * 9, y - 11, 6, 11, cream)}
            {R(gx + 24 + i * 9, y - 10, 4, 10, i % 2 ? win : night ? '#c9a95a' : '#2f2420')}
          </g>
        ))}
        {/* Sombra da cobertura sobre a plataforma */}
        {R(gx + 20, y - 13, 46, 2, '#000', 0.22)}
        {/* Sino e relógio */}
        {R(gx + 21, y - 12, 2, 0.6, '#5f6d76')}
        <path d={`M${gx + 21.2} ${y - 11.4}L${gx + 22.8} ${y - 11.4}L${gx + 23.2} ${y - 9}L${gx + 20.8} ${y - 9}Z`} fill="#e3b341" />
        {R(gx + 63, y - 14, 0.8, 13, '#4a5258')}
        <circle cx={gx + 63.4} cy={y - 15} r={1.6} fill="#f4f1de" stroke={INK} strokeWidth={0.4} />
        {R(gx + 63.2, y - 16, 0.4, 1, INK)}
      </g>
    ),
  };
}

/* ---- Memorial Nanzita ---- */

/**
 * Casa moderna: a laje fina com o brise de lâminas e a caixa d'água, a fileira de janelas com as
 * cortinas verdes e rosadas, a laje do meio, o térreo com a garagem de tela, o pilar em V, o painel
 * de azulejos (a moça do cesto, o burrinho, o sol e a planta), o muro de pedra, a parede de tijolo
 * do lado e, na frente, a grade preta com as bromélias.
 */
export function memorialParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const beige = '#cfc8ae';
  const x0 = x - 21;
  const curtain = ['#6fb5a5', '#d9a7a0', '#6fb5a5', '#6fb5a5', '#d9a7a0', '#6fb5a5'];
  const body: Part[] = [
    [x0 - 3, y - 29, 48, 3, beige],
    [x0, y - 26, 42, 26, '#5a5a52'],
    [x0 + 42, y - 28, 4, 28, '#c27a4a'],
    [x0 + 17, y - 33, 7, 4, '#b9c0c4'],
  ];
  return {
    body,
    details: [],
    sign: [x - 5, y - 44],
    under: R(x0 - 2, y - 1, 50, 1, '#8d969c'),
    extra: (
      <g>
        {/* Laje com a beirada clara e o brise */}
        {R(x0 - 3, y - 29, 48, 1, '#e4dec6')}
        {R(x0 - 2, y - 26, 46, 2, '#a8a08a')}
        {Array.from({ length: 23 }, (_, k) => (
          <path key={k} d={`M${x0 - 2 + k * 2} ${y - 26}l1 0l1 2l-1 0Z`} fill="#efe9d6" />
        ))}
        {R(x0 + 18, y - 32, 5, 1, '#8d969c')}
        {/* Tijolinho da parede do lado */}
        {Array.from({ length: 13 }, (_, k) => R(x0 + 42, y - 27 + k * 2, 4, 0.4, '#a8623a'))}
        {/* Fileira de janelas: basculante, cortina e o painel de vidro opaco */}
        {R(x0, y - 24, 42, 11, INK)}
        {curtain.map((c, i) => {
          const bx = x0 + i * 7;
          return (
            <g key={i}>
              {R(bx + 0.5, y - 23.5, 6, 1.6, night ? '#ffe7a8' : '#cfe0dc')}
              {R(bx + 0.5, y - 21.5, 6, 5, night ? '#f3d68a' : '#f4f1de')}
              {R(bx + 1, y - 21, 5, 4, c)}
              {[0, 1, 2].map((k) => R(bx + 1.6 + k * 1.6, y - 21, 0.3, 4, '#000', 0.2))}
              {R(bx + 0.5, y - 15.6, 6, 2, '#dfe6dc')}
            </g>
          );
        })}
        {/* Laje do meio */}
        {R(x0 - 1, y - 13, 44, 2, beige)}
        {R(x0 - 1, y - 13, 44, 0.6, '#e4dec6')}
        {R(x0, y - 11, 42, 1, '#000', 0.3)}
        {/* Garagem com o portão de tela e o pilar em V */}
        {R(x0 + 1, y - 10, 14, 10, '#3d4549')}
        {Array.from({ length: 7 }, (_, k) => R(x0 + 2 + k * 2, y - 10, 0.5, 10, '#555f63'))}
        <path d={`M${x0 + 3} ${y - 11}L${x0 + 5} ${y - 11}L${x0 + 8} ${y}L${x0 + 6} ${y}Z`} fill="#e9e6dc" />
        <path d={`M${x0 + 11} ${y - 11}L${x0 + 13} ${y - 11}L${x0 + 8} ${y}L${x0 + 6} ${y}Z`} fill="#e9e6dc" />
        {/* Painel de azulejos */}
        {R(x0 + 16, y - 10, 18, 9, '#e3cf9a')}
        {R(x0 + 27, y - 10, 7, 9, '#b9c4a6')}
        {Array.from({ length: 6 }, (_, k) => R(x0 + 16 + k * 3, y - 10, 0.3, 9, '#8a7a5a', 0.4))}
        {R(x0 + 17, y - 4, 3, 3, '#b5523b')}
        <path d={`M${x0 + 20} ${y - 7}L${x0 + 23} ${y - 7}L${x0 + 24} ${y - 1}L${x0 + 19} ${y - 1}Z`} fill="#c9a052" />
        <circle cx={x0 + 21.5} cy={y - 8} r={1} fill="#c9a27a" />
        {['#d64545', '#f2b705', '#8cc63f'].map((c, k) => R(x0 + 20 + k * 1.2, y - 10, 1, 1, c))}
        {R(x0 + 25, y - 6, 6, 2.5, '#a89277')}
        {R(x0 + 24, y - 8, 1.6, 2.5, '#a89277')}
        {[25.4, 30].map((d) => R(x0 + d, y - 3.5, 0.6, 2.5, '#8a7660'))}
        <circle cx={x0 + 32} cy={y - 8} r={1.4} fill="#e3b341" />
        {/* Muro de pedra */}
        {R(x0 + 34, y - 11, 8, 11, '#5f625c')}
        {[
          [35, 9],
          [38, 8],
          [35.5, 6],
          [39, 5],
          [36, 3],
          [39.5, 2],
        ].map(([dx, dy], k) => R(x0 + dx, y - dy, 2.4, 1.4, k % 2 ? '#787b74' : '#4a4d48'))}
        {/* Grade preta e as bromélias */}
        {R(x0 - 2, y - 4, 46, 0.6, '#1f2326')}
        {Array.from({ length: 12 }, (_, k) => R(x0 - 2 + k * 4, y - 4, 0.5, 4, '#1f2326'))}
        {Array.from({ length: 23 }, (_, k) => R(x0 - 2 + k * 2, y - 3.4, 0.3, 3.4, '#2b2f33', 0.5))}
        {[x0 + 18, x0 + 23, x0 + 28, x0 + 33].map((bx) => (
          <g key={bx}>
            {R(bx - 1.5, y - 2, 3, 1, '#3f7a3a')}
            {R(bx - 0.5, y - 3, 1, 1, '#d64545')}
          </g>
        ))}
      </g>
    ),
  };
}

/* ---- Painel do Educandário ---- */

/**
 * O muro baixo de azulejos azuis com as faixas brancas e as pombas, o portão azul de tábuas, o muro
 * de tijolinho, o sobrado bege de telha vermelha lá atrás, o poste com a luminária e a arvorezinha
 * com o protetor de madeira na frente do painel.
 */
export function painelParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === NIGHT;
  const x0 = x - 18;
  const blue = '#2448a8';
  const body: Part[] = [
    [x + 4, y - 21, 19, 9, '#efe2c6'],
    [x + 2, y - 25, 23, 4, '#c4553a'],
    [x0, y - 11, 8, 11, '#c98a52'],
    [x0 + 8, y - 12, 9, 12, '#2f5fb3'],
    [x0 + 17, y - 12, 25, 12, blue],
  ];
  const doves: [number, number, number][] = [
    [4, 3.5, 1],
    [11, 7, 1.2],
    [17, 3.5, 1],
    [22, 8, 0.9],
  ];
  return {
    body,
    details: [],
    sign: [x - 5, y - 38],
    under: (
      <g>
        {R(x0 - 1, y - 1, 45, 1, '#8d969c')}
        {/* Calçada de ladrilho */}
        {R(x0 - 2, y, 47, 3, '#ddd5c0')}
        {Array.from({ length: 12 }, (_, k) => R(x0 - 2 + k * 4, y, 0.4, 3, '#b9b2a0'))}
      </g>
    ),
    extra: (
      <g>
        {/* Telhado de telha do sobrado e as janelas com moldura */}
        {Array.from({ length: 4 }, (_, i) => R(x + 2 + i * 0.5, y - 25 + i, 23 - i, 1, i % 2 ? '#a8432e' : '#c4553a'))}
        {Array.from({ length: 8 }, (_, k) => R(x + 3 + k * 3, y - 25, 0.4, 4, '#8e2f27'))}
        {R(x + 4, y - 21, 19, 1, '#000', 0.15)}
        {[x + 6, x + 11.5, x + 17].map((wx) => (
          <g key={wx}>
            {R(wx - 0.5, y - 19.5, 5, 5, '#f8f4ea')}
            {R(wx, y - 19, 4, 4, night ? NIGHT : '#5f8a96')}
            {R(wx + 1.8, y - 19, 0.4, 4, '#f8f4ea')}
          </g>
        ))}
        {/* Muro de tijolinho com a tampa clara */}
        {R(x0, y - 12, 8, 1, '#e9e4da')}
        {[0, 1, 2, 3].map((r) => R(x0, y - 9 + r * 2.4, 8, 0.4, '#a8623a'))}
        {[0, 1, 2, 3].map((r) => R(x0 + (r % 2 ? 2 : 5), y - 9 + r * 2.4, 0.4, 2.4, '#a8623a'))}
        {/* Portão azul de tábuas */}
        {Array.from({ length: 4 }, (_, k) => R(x0 + 9.5 + k * 2, y - 12, 0.5, 12, '#244a8a'))}
        {R(x0 + 8, y - 12, 9, 0.8, '#5b86d6')}
        {R(x0 + 15, y - 6, 1, 2, '#c9ced1')}
        {/* Painel: faixas brancas, rejunte dos azulejos, pombas e a placa */}
        <path d={`M${x0 + 17} ${y - 3}L${x0 + 26} ${y - 12}L${x0 + 31} ${y - 12}L${x0 + 20} ${y}L${x0 + 17} ${y}Z`} fill="#eef1f8" />
        <path d={`M${x0 + 33} ${y}L${x0 + 42} ${y - 9}L${x0 + 42} ${y - 4}L${x0 + 38} ${y}Z`} fill="#eef1f8" />
        {Array.from({ length: 8 }, (_, k) => R(x0 + 17 + k * 3, y - 12, 0.3, 12, '#1a3482', 0.35))}
        {Array.from({ length: 3 }, (_, k) => R(x0 + 17, y - 9 + k * 3, 25, 0.3, '#1a3482', 0.35))}
        {Array.from({ length: 14 }, (_, k) => R(x0 + 18 + ((k * 7) % 23), y - 11 + ((k * 5) % 10), 0.5, 0.5, '#c8d4f2'))}
        {doves.map(([dx, dy, s], i) => {
          const cx = x0 + 17 + dx;
          const cy = y - 12 + dy;
          return (
            <path
              key={i}
              d={`M${cx - 3.2 * s} ${cy}L${cx - 1.6 * s} ${cy - 0.6 * s}L${cx - 3 * s} ${cy - 3 * s}L${cx - 0.6 * s} ${cy - 1 * s}L${cx + 1.4 * s} ${cy - 1.6 * s}L${cx + 2.6 * s} ${cy - 1.2 * s}L${cx + 1.6 * s} ${cy + 0.2 * s}L${cx} ${cy + 1 * s}L${cx - 2 * s} ${cy + 1 * s}Z`}
              fill="#f7f8fb"
              stroke="#1a3482"
              strokeWidth={0.3}
            />
          );
        })}
        {R(x0 + 38, y - 3, 3, 2, '#d8dcdf')}
        {/* Poste com a luminária */}
        {R(x0 - 3, y - 22, 1.2, 22, '#b9b8b0')}
        {R(x0 - 5, y - 21, 5, 0.6, '#8d969c')}
        {R(x0 - 2, y - 17, 3, 0.6, '#8d969c')}
        {R(x0, y - 16.4, 1.6, 1, night ? '#ffe9a8' : '#e9e4da')}
        {/* Arvorezinha com o protetor de madeira */}
        {R(x + 6.6, y - 9, 0.6, 9, '#6b4423')}
        <circle cx={x + 5.5} cy={y - 10} r={2} fill="#4f9a3a" />
        <circle cx={x + 8.2} cy={y - 9} r={1.8} fill="#3aa655" />
        <circle cx={x + 6.8} cy={y - 12} r={1.7} fill="#3aa655" />
        <rect x={x + 5} y={y - 3} width={3.4} height={3} fill="none" stroke="#8a5a2b" strokeWidth={0.5} />
      </g>
    ),
  };
}

/* ---- Ponte Metálica ---- */

/** Altura do banzo de cima acima do tabuleiro, a `d` pixels do meio da ponte. */
function topAt(d: number) {
  const { half, tower } = MAP_BRIDGE;
  const a = Math.abs(d);
  if (a <= tower) return 7 + 5 * (a / tower) ** 2;
  const k = (a - tower) / (half - tower);
  return 3 + 9 * (1 - k) ** 2;
}

/**
 * Ponte de ferro vermelha: o banzo de cima arqueado, os montantes e as diagonais em X da treliça,
 * as duas torres treliçadas com o lampião em cima e o banzo de baixo com o brilho.
 */
export function bridgeParts(p: Place, night: boolean): HouseParts {
  const bx = p.x;
  const y0 = BRIDGE.y0;
  const { half, tower } = MAP_BRIDGE;
  const truss: ReactNode[] = [];
  let chord = `M${bx - half} ${y0}`;
  for (let d = -half; d <= half; d++) chord += `L${bx + d + 0.5} ${y0 - topAt(d)}`;
  chord += `L${bx + half + 1} ${y0}`;
  for (let d = -half; d < half; d += 2) {
    const h0 = topAt(d);
    const h1 = topAt(d + 2);
    truss.push(R(bx + d, y0 - h0, 0.8, h0, BRIDGE_RED));
    // Diagonais em X entre um montante e o próximo
    truss.push(<line key={`a${d}`} x1={bx + d + 0.4} y1={y0 - h0 + 0.5} x2={bx + d + 2.4} y2={y0 - 0.5} stroke={BRIDGE_DARK} strokeWidth={0.45} />);
    truss.push(<line key={`b${d}`} x1={bx + d + 2.4} y1={y0 - h1 + 0.5} x2={bx + d + 0.4} y2={y0 - 0.5} stroke={BRIDGE_DARK} strokeWidth={0.45} />);
  }
  return {
    body: [],
    details: [],
    sign: [bx - 5, y0 - 28],
    extra: (
      <g>
        <rect x={bx - half - 1} y={y0 - 18} width={half * 2 + 3} height={BRIDGE.y1 - y0 + 20} fill="transparent" />
        {truss}
        {R(bx + half, y0 - topAt(half), 0.8, topAt(half), BRIDGE_RED)}
        {/* Banzo de cima (contorno escuro, vermelho e o brilho) */}
        <path d={chord} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        <path d={chord} fill="none" stroke={BRIDGE_RED} strokeWidth={1.2} strokeLinejoin="round" />
        <path d={chord} fill="none" stroke={BRIDGE_LIGHT} strokeWidth={0.4} transform="translate(0 -0.4)" />
        {/* Torres treliçadas em cima dos pilares, com o lampião */}
        {[bx - tower, bx + tower].map((tx) => (
          <g key={tx}>
            {R(tx - 2, y0 - 17, 5, 17, INK)}
            {R(tx - 1.4, y0 - 16.4, 1.2, 16.4, BRIDGE_RED)}
            {R(tx + 1.2, y0 - 16.4, 1.2, 16.4, BRIDGE_RED)}
            {R(tx - 1.4, y0 - 16.4, 0.5, 16.4, BRIDGE_LIGHT)}
            {[0, 1, 2, 3].map((k) => (
              <g key={k}>
                <line x1={tx - 0.6} y1={y0 - 16 + k * 4} x2={tx + 1.8} y2={y0 - 12.4 + k * 4} stroke={BRIDGE_DARK} strokeWidth={0.5} />
                <line x1={tx + 1.8} y1={y0 - 16 + k * 4} x2={tx - 0.6} y2={y0 - 12.4 + k * 4} stroke={BRIDGE_DARK} strokeWidth={0.5} />
              </g>
            ))}
            {R(tx - 2.5, y0 - 18, 6, 1.4, BRIDGE_RED)}
            {R(tx - 2.5, y0 - 18, 6, 0.5, BRIDGE_LIGHT)}
            {R(tx - 0.2, y0 - 20, 1.4, 2, '#2b2f33')}
            {R(tx, y0 - 19.6, 1, 1.2, night ? '#ffe27a' : '#f4f1de')}
            {night && <circle cx={tx + 0.5} cy={y0 - 19} r={3} fill="#ffe27a" opacity={0.25} />}
          </g>
        ))}
        {/* Banzo de baixo */}
        {R(bx - half - 1, y0 - 1, half * 2 + 3, 2, BRIDGE_DARK)}
        {R(bx - half - 1, y0 - 1, half * 2 + 3, 0.8, BRIDGE_LIGHT)}
      </g>
    ),
  };
}
