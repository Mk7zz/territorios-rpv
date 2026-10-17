import type { ReactNode } from 'react';
import { CITY_BRIDGE as BRIDGE, CITY_PATH as MAIN_PATH, type Place } from '../lib/world';
import type { HouseParts, Part } from './MestreHouses';

/*
 * Peças do mapa que outras partes usam: as cores e o tabuleiro da Ponte Metálica (com os pilares de
 * pedra no rio), as letrinhas das placas e o Prédio Sicredi, patrocinador, desenhado em destaque.
 * Os outros pontos focais ficam em MapLandmarks.tsx.
 */

const INK = '#1b2b33';
export const BRIDGE_RED = '#c8443a';
export const BRIDGE_DARK = '#8e2f27';
export const BRIDGE_LIGHT = '#e6735f';

/** Meia largura da ponte no mapa e onde ficam as torres (distância do meio). */
export const MAP_BRIDGE = { half: 15, tower: 8 };

/** Tabuleiro da ponte no chão do mapa (asfalto, calçadas e o guarda-corpo da frente). */
export function BridgeDeck({ bx }: { bx: number }) {
  const { half } = MAP_BRIDGE;
  const y0 = BRIDGE.y0;
  const y1 = BRIDGE.y1;
  return (
    <g>
      <rect x={bx - half - 1} y={y1 + 2} width={half * 2 + 3} height={3} fill="#000" opacity={0.18} />
      {/* Pilares de pedra embaixo das torres */}
      {[bx - MAP_BRIDGE.tower, bx + MAP_BRIDGE.tower].map((tx) => (
        <g key={tx}>
          <rect x={tx - 2.5} y={y1 + 1} width={6} height={5} fill="#1b2b33" />
          <rect x={tx - 2} y={y1 + 1} width={5} height={4.5} fill="#b9b2a0" />
          <rect x={tx - 2} y={y1 + 1} width={5} height={1} fill="#d8d2c2" />
        </g>
      ))}
      <rect x={bx - half} y={y0 + 1} width={half * 2 + 1} height={y1 - y0} fill="#9d978b" />
      <rect x={bx - half} y={y0 + 1} width={half * 2 + 1} height={2} fill="#cfc6b0" />
      <rect x={bx - half} y={y1 - 2} width={half * 2 + 1} height={2} fill="#cfc6b0" />
      <rect x={bx - half} y={MAIN_PATH.y + 3} width={half * 2 + 1} height={1} fill="#b7b0a1" />
      <rect x={bx - half - 1} y={y1} width={half * 2 + 3} height={2} fill={BRIDGE_RED} />
      <rect x={bx - half - 1} y={y1 + 1} width={half * 2 + 3} height={1} fill={BRIDGE_DARK} />
      {Array.from({ length: half + 1 }, (_, i) => (
        <rect key={i} x={bx - half + i * 2} y={y1 - 2} width={1} height={2} fill={BRIDGE_RED} />
      ))}
    </g>
  );
}

/** Letrinhas 3×5 das placas no mapa (hotel, museu, estação). */
const MINI: Record<string, string[]> = {
  V: ['1.1', '1.1', '1.1', '1.1', '.1.'],
  I: ['1', '1', '1', '1', '1'],
  L: ['1..', '1..', '1..', '1..', '111'],
  A: ['111', '1.1', '111', '1.1', '1.1'],
  S: ['111', '1..', '111', '..1', '111'],
  M: ['1.1', '111', '1.1', '1.1', '1.1'],
  U: ['1.1', '1.1', '1.1', '1.1', '111'],
  E: ['111', '1..', '11.', '1..', '111'],
  N: ['11.', '1.1', '1.1', '1.1', '1.1'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'],
  G: ['111', '1..', '1.1', '1.1', '111'],
  C: ['111', '1..', '1..', '1..', '111'],
  T: ['111', '.1.', '.1.', '.1.', '.1.'],
  Z: ['111', '..1', '.1.', '1..', '111'],
};

export function MiniText({ text, x, y, fill }: { text: string; x: number; y: number; fill: string }) {
  const out: ReactNode[] = [];
  let cx = x;
  for (const ch of text) {
    const g = MINI[ch];
    g.forEach((row, r) => [...row].forEach((c, k) => c === '1' && out.push(<rect key={`${cx}-${r}-${k}`} x={cx + k} y={y + r} width={1} height={1} />)));
    cx += g[0].length + 1;
  }
  return <g fill={fill}>{out}</g>;
}

/**
 * Prédio Sicredi (o antigo Grande Hotel Villas) no mapa, em destaque por ser patrocinador: maior que
 * os outros, no canto de cima à direita. Sobrado verde com as pilastras brancas, as janelas em arco
 * (as do meio com sacadinha), as portas brancas, a base de pedra, a cornija, as ameias, a placa
 * "VILLAS" com o enfeite em cima, as bandeirinhas verdes e a placa do Sicredi (acesa à noite).
 */
export function hotelParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === '#ffd76a';
  const x0 = x - 32;
  const w = 64;
  const green = '#3f9a52';
  const greenD = '#2f7a40';
  const white = '#f6f5ee';
  const whiteD = '#d9d7cc';
  const bays = [x0 + 6.5, x0 + 19, x0 + 32, x0 + 45, x0 + 57.5];
  const body: Part[] = [
    [x0, y - 39, w, 39, green],
    [x0, y - 33, w, 1, greenD],
    // Cornija, faixa do meio e a base
    [x0 - 2, y - 35, w + 4, 2, white],
    [x0 - 1, y - 18, w + 2, 2, white],
    [x0, y - 6, w, 6, '#e7e5dc'],
    // Ameias
    ...Array.from({ length: 11 }, (_, i) => [x0 + 1 + i * 6, y - 42, 3, 3, white] as Part),
    [x0 - 1, y - 39, w + 2, 1, white],
  ];
  const details: Part[] = [];
  bays.forEach((cx, i) => {
    // Janela de cima em arco (vidro) com o peitoril
    details.push([cx - 2, y - 30, 4, 9, glass], [cx - 1, y - 31, 2, 1, glass], [cx - 3, y - 21, 6, 1, white]);
    // Porta branca em arco com a bandeira de vidro
    details.push([cx - 2.5, y - 13, 5, 13, white], [cx - 1.5, y - 14, 3, 1, white], [cx - 2, y - 12, 4, 3, night ? '#ffe7a8' : '#9fc4c8']);
    if (i === 2) details.push([cx - 0.5, y - 9, 1, 9, whiteD]);
  });
  // Placa do hotel no meio, em cima
  details.push([x - 15, y - 51, 30, 10, white], [x - 14, y - 50, 28, 8, greenD]);
  return {
    body,
    details,
    sign: [x - 5, y - 66],
    under: (
      <g>
        <rect x={x0 - 2} y={y - 1} width={w + 4} height={2} fill="#6b6b62" />
        {/* Calçada com o meio-fio amarelo na frente do prédio */}
        <rect x={x0 - 4} y={y + 1} width={w + 8} height={3} fill="#c9a89a" />
        <rect x={x0 - 4} y={y + 4} width={w + 8} height={1} fill="#e8c62e" />
      </g>
    ),
    extra: (
      <g>
        {/* Pilastras brancas com friso */}
        {[x0, x0 + 12.5, x0 + 25.5, x0 + 38.5, x0 + 51.5, x0 + w - 2].map((px) => (
          <g key={px}>
            <rect x={px} y={y - 33} width={2} height={15} fill={white} />
            <rect x={px} y={y - 16} width={2} height={10} fill={white} />
            <rect x={px + 0.8} y={y - 31} width={0.4} height={11} fill={whiteD} />
          </g>
        ))}
        {/* Sacadinhas de ferro nas três janelas do meio */}
        {bays.slice(1, 4).map((cx) => (
          <g key={cx}>
            <rect x={cx - 3.5} y={y - 24} width={7} height={0.6} fill="#1f2326" />
            {[-3, -1.5, 0, 1.5, 3].map((d) => (
              <rect key={d} x={cx + d - 0.2} y={y - 24} width={0.4} height={3} fill="#1f2326" />
            ))}
          </g>
        ))}
        {/* Pedras da base */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={i} x={x0 + 0.5 + i * 2.9} y={y - 5 + (i % 3) * 1.5} width={1.6} height={1} fill={i % 2 ? '#5b5d58' : '#8a8c85'} />
        ))}
        {/* Dentinhos da cornija */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={`d${i}`} x={x0 + i * 3} y={y - 33} width={1.5} height={0.8} fill={whiteD} />
        ))}
        {/* Nome na placa e o enfeite de dois laços em cima */}
        <MiniText text="VILLAS" x={x - 11} y={y - 49} fill={white} />
        <circle cx={x - 2} cy={y - 53} r={1.6} fill="none" stroke={white} strokeWidth={0.9} />
        <circle cx={x + 2} cy={y - 53} r={1.6} fill="none" stroke={white} strokeWidth={0.9} />
        {/* Bandeirinhas verdes nas pontas */}
        {[x0 + 1, x0 + w - 2].map((fx, i) => (
          <g key={fx}>
            <rect x={fx} y={y - 52} width={0.8} height={10} fill="#6b6b62" />
            <path d={i ? `M${fx} ${y - 52}L${fx - 6} ${y - 50}L${fx} ${y - 48}Z` : `M${fx + 0.8} ${y - 52}L${fx + 6.8} ${y - 50}L${fx + 0.8} ${y - 48}Z`} fill="#3fae49" />
          </g>
        ))}
        {/* Placa do Sicredi presa na pilastra, com a florzinha */}
        <rect x={x0 + 9} y={y - 18} width={7} height={5} fill={INK} />
        <rect x={x0 + 9.5} y={y - 17.5} width={6} height={4} fill={night ? '#6fe07a' : '#3fae49'} />
        <rect x={x0 + 12} y={y - 16.5} width={1} height={2} fill="#e9fbe9" />
        <rect x={x0 + 11} y={y - 15.5} width={3} height={0.8} fill="#e9fbe9" />
        {/* À noite, as luzes da calçada iluminam a fachada */}
        {night &&
          [x0 + 1, x0 + 13.5, x0 + 26.5, x0 + 39.5, x0 + 52.5, x0 + w - 1].map((lx) => (
            <path key={lx} d={`M${lx - 1} ${y}L${lx - 3} ${y - 30}L${lx + 3} ${y - 30}L${lx + 1} ${y}Z`} fill="#ffe2a0" opacity={0.28} />
          ))}
      </g>
    ),
  };
}
