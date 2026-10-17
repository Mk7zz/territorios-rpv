import { memo } from 'react';
import { emptyGrid, outline, shade, toRuns, type Grid, type Run } from '../lib/pixel';
import type { AvatarConfig } from '../lib/types';

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: '#e0ac69',
  hair: 'short',
  hairColor: '#2b1b0e',
  eyes: 'round',
  mouth: 'smile',
  shirt: '#1f7a4d',
  accessory: 'none',
  background: '#cdebd7',
  outfit: 'tee',
  pants: '#23384a',
};

export const AVATAR_PALETTES = {
  skin: ['#fbe0cb', '#f2d0b5', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'],
  hairColor: ['#14110f', '#2b1b0e', '#5a3417', '#a0522d', '#d9a441', '#e9e4da', '#12a3a0', '#8cc63f'],
  shirt: ['#1f7a4d', '#3aa655', '#8cc63f', '#12a3a0', '#23384a', '#f2b705', '#e8772e', '#d64545', '#f4f4f4', '#6b4fa0'],
  pants: ['#23384a', '#2f4f6f', '#3b3b3b', '#6b4f2f', '#1f7a4d', '#9a8f7a'],
  background: ['#cdebd7', '#e2f6f5', '#f1f9e4', '#fff6d6', '#dfe8e1', '#d7e3f4', '#f7dede'],
} as const;

export const AVATAR_OPTIONS = {
  hair: [
    ['none', 'Raspado'],
    ['short', 'Curto'],
    ['long', 'Longo'],
    ['curly', 'Cacheado'],
    ['afro', 'Black power'],
    ['bun', 'Coque'],
    ['mohawk', 'Moicano'],
  ],
  eyes: [
    ['round', 'Atentos'],
    ['happy', 'Felizes'],
    ['wink', 'Piscando'],
    ['sleepy', 'Tranquilos'],
  ],
  mouth: [
    ['smile', 'Sorriso'],
    ['grin', 'Risada'],
    ['neutral', 'Sério'],
    ['open', 'Surpresa'],
  ],
  outfit: [
    ['tee', 'Camiseta'],
    ['hoodie', 'Moletom'],
    ['jacket', 'Jaqueta'],
  ],
  accessory: [
    ['none', 'Nenhum'],
    ['glasses', 'Óculos'],
    ['sunglasses', 'Óculos escuros'],
    ['cap', 'Boné'],
    ['headphones', 'Fones'],
    ['earring', 'Brinco'],
  ],
} as const;

const INK = '#1b2b33';
const W = 16;
const H = 20;

/** Monta o personagem pixel a pixel. frame: 0 parado, 1 e 2 passos da caminhada. */
function buildGrid(c: AvatarConfig, frame: 0 | 1 | 2): Grid {
  const g = emptyGrid(W, H);
  const set = (x: number, y: number, col: string | null) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = col;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, col);
  };

  const skin = c.skin;
  const skinD = shade(skin, -0.16);
  const hair = c.hairColor;
  const hairD = shade(hair, -0.3);
  const hairL = shade(hair, 0.28);
  const shirt = c.shirt;
  const shirtD = shade(shirt, -0.25);
  const pants = c.pants ?? DEFAULT_AVATAR.pants!;
  const pantsD = shade(pants, -0.3);
  const outfit = c.outfit ?? 'tee';
  const shoe = '#2b2f36';

  // Cabelo de trás (fica atrás do rosto e dos ombros)
  if (c.hair === 'afro') {
    for (let y = 0; y < 11; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - 7.5, (y - 4.6) * 1.08) <= 6.7) set(x, y, (x + y) % 5 === 0 ? hairD : hair);
  }
  if (c.hair === 'long') {
    rect(2, 3, 3, 13, hair);
    rect(12, 3, 13, 13, hair);
    set(2, 13, hairD);
    set(13, 13, hairD);
  }

  // Pernas e sapatos (animação de passo)
  rect(4, 16, 11, 16, pants);
  const leftUp = frame === 1;
  const rightUp = frame === 2;
  rect(4, 17, 6, leftUp ? 17 : 18, pants);
  rect(9, 17, 11, rightUp ? 17 : 18, pants);
  set(6, 17, pantsD);
  set(9, 17, pantsD);
  rect(3, leftUp ? 18 : 19, 6, leftUp ? 18 : 19, shoe);
  rect(9, rightUp ? 18 : 19, 12, rightUp ? 18 : 19, shoe);

  // Tronco e braços
  rect(4, 11, 11, 15, shirt);
  rect(11, 12, 11, 15, shirtD);
  rect(4, 15, 11, 15, shirtD);
  const longSleeves = outfit !== 'tee';
  rect(3, 12, 3, longSleeves ? 15 : 13, shirt);
  rect(12, 12, 12, longSleeves ? 15 : 13, shirtD);
  if (!longSleeves) {
    rect(3, 14, 3, 15, skin);
    rect(12, 14, 12, 15, skinD);
  }
  set(3, 16, skin);
  set(12, 16, skinD);
  if (outfit === 'tee') {
    set(7, 11, skin);
    set(8, 11, skin);
  } else if (outfit === 'hoodie') {
    rect(4, 11, 11, 11, shirtD);
    set(6, 12, '#f4f4f4');
    set(9, 12, '#f4f4f4');
    set(6, 13, '#f4f4f4');
    set(9, 13, '#f4f4f4');
    rect(5, 14, 10, 14, shirtD);
  } else {
    rect(7, 11, 8, 15, '#f4f4f4');
    rect(6, 11, 6, 14, shirtD);
    rect(9, 11, 9, 14, shirtD);
  }

  // Cabeça
  rect(3, 2, 12, 10, skin);
  set(3, 2, null);
  set(12, 2, null);
  set(3, 10, null);
  set(12, 10, null);
  rect(4, 10, 11, 10, skinD);
  set(2, 6, skin);
  set(2, 7, skin);
  set(13, 6, skinD);
  set(13, 7, skinD);

  // Rosto
  const shades = c.accessory === 'sunglasses';
  if (c.accessory === 'glasses') {
    rect(4, 6, 6, 7, '#d9f2f1');
    rect(9, 6, 11, 7, '#d9f2f1');
    rect(4, 5, 6, 5, INK);
    rect(9, 5, 11, 5, INK);
    set(7, 6, INK);
    set(8, 6, INK);
  }
  if (!shades) {
    const eye = (x: number, wink: boolean) => {
      if (c.eyes === 'happy') {
        set(x - 1, 7, INK);
        set(x, 6, INK);
        set(x + 1, 7, INK);
      } else if (c.eyes === 'sleepy' || wink) {
        set(x - 1, 7, INK);
        set(x, 7, INK);
        set(x + 1, 7, INK);
      } else {
        set(x, 6, INK);
        set(x, 7, INK);
      }
    };
    eye(5, false);
    eye(10, c.eyes === 'wink');
    set(4, 8, '#ec9a8c');
    set(11, 8, '#ec9a8c');
  } else {
    rect(4, 6, 6, 7, '#14181c');
    rect(9, 6, 11, 7, '#14181c');
    set(4, 6, '#5b6b75');
    set(9, 6, '#5b6b75');
    set(7, 6, '#14181c');
    set(8, 6, '#14181c');
  }
  const mouth = '#7c2d12';
  if (c.mouth === 'smile') {
    set(6, 8, mouth);
    set(9, 8, mouth);
    set(7, 9, mouth);
    set(8, 9, mouth);
  } else if (c.mouth === 'grin') {
    rect(6, 8, 9, 8, mouth);
    set(7, 8, '#ffffff');
    set(8, 8, '#ffffff');
    rect(7, 9, 8, 9, mouth);
  } else if (c.mouth === 'open') {
    rect(7, 8, 8, 9, mouth);
  } else {
    rect(7, 9, 8, 9, mouth);
  }

  // Cabelo da frente
  const top = () => {
    rect(4, 1, 11, 1, hair);
    rect(3, 2, 12, 3, hair);
    set(5, 2, hairL);
    set(6, 2, hairL);
  };
  switch (c.hair) {
    case 'short':
      top();
      rect(3, 4, 5, 4, hair);
      rect(10, 4, 12, 4, hair);
      set(7, 4, hair);
      set(3, 5, hair);
      set(12, 5, hair);
      break;
    case 'long':
      top();
      rect(3, 4, 6, 4, hair);
      rect(10, 4, 12, 4, hair);
      rect(2, 4, 2, 12, hair);
      rect(13, 4, 13, 12, hairD);
      set(3, 5, hair);
      set(12, 5, hair);
      break;
    case 'curly':
      [4, 6, 9, 11].forEach((x) => set(x, 0, hair));
      rect(3, 1, 12, 1, hair);
      rect(2, 2, 13, 3, hair);
      rect(2, 4, 4, 4, hair);
      rect(11, 4, 13, 4, hair);
      rect(7, 4, 8, 4, hair);
      rect(2, 5, 2, 6, hair);
      rect(13, 5, 13, 6, hair);
      for (let x = 2; x <= 13; x += 2) set(x, 3, hairD);
      for (let x = 3; x <= 12; x += 3) set(x, 1, hairL);
      break;
    case 'afro':
      rect(3, 1, 12, 3, hair);
      rect(3, 4, 4, 4, hair);
      rect(11, 4, 12, 4, hair);
      set(5, 1, hairL);
      set(6, 1, hairL);
      break;
    case 'bun':
      top();
      rect(6, 0, 9, 0, hair);
      set(7, 0, hairL);
      rect(3, 4, 4, 4, hair);
      rect(11, 4, 12, 4, hair);
      break;
    case 'mohawk':
      rect(7, 0, 8, 4, hair);
      set(8, 1, hairD);
      set(8, 3, hairD);
      set(4, 3, skinD);
      set(11, 3, skinD);
      break;
    default:
      set(5, 3, shade(skin, 0.25));
      set(6, 3, shade(skin, 0.25));
  }

  // Acessórios
  if (c.accessory === 'cap') {
    const cap = shirt;
    rect(3, 1, 12, 3, cap);
    rect(4, 0, 11, 0, cap);
    rect(2, 4, 13, 4, shade(cap, -0.3));
    set(7, 1, '#ffffff');
    set(8, 1, '#ffffff');
  }
  if (c.accessory === 'headphones') {
    rect(4, 0, 11, 0, INK);
    set(3, 1, INK);
    set(12, 1, INK);
    rect(2, 2, 2, 4, INK);
    rect(13, 2, 13, 4, INK);
    rect(1, 5, 2, 8, '#3a4650');
    rect(13, 5, 14, 8, '#3a4650');
    set(1, 6, '#12a3a0');
    set(14, 6, '#12a3a0');
  }
  if (c.accessory === 'earring') {
    set(2, 8, '#f2b705');
    set(13, 8, '#f2b705');
  }
  return g;
}

/** Grade com margem de 1px e contorno escuro (estilo adesivo). */
function framed(c: AvatarConfig, frame: 0 | 1 | 2): Grid {
  const base = buildGrid(c, frame);
  const padded = emptyGrid(W + 2, H + 2);
  base.forEach((row, y) => row.forEach((col, x) => (padded[y + 1][x + 1] = col)));
  return outline(padded, INK);
}

const cache = new Map<string, Run[]>();
export function avatarRuns(c: AvatarConfig, frame: 0 | 1 | 2 = 0): Run[] {
  const key = `${JSON.stringify(c)}|${frame}`;
  let r = cache.get(key);
  if (!r) {
    r = toRuns(framed({ ...DEFAULT_AVATAR, ...c }, frame));
    if (cache.size > 400) cache.clear();
    cache.set(key, r);
  }
  return r;
}

/** Dimensões do sprite completo (com contorno), em pixels lógicos. */
export const SPRITE_W = W + 2;
export const SPRITE_H = H + 2;

/** Sprite para ser embutido em outro SVG (mundo 2D). */
export const AvatarSprite = memo(function AvatarSprite({ config, frame = 0 }: { config: AvatarConfig | null | undefined; frame?: 0 | 1 | 2 }) {
  const runs = avatarRuns(config ?? DEFAULT_AVATAR, frame);
  return (
    <g shapeRendering="crispEdges">
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </g>
  );
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * Avatar em pixel-art. "portrait" mostra cabeça e ombros (listas, ranking, cabeçalho);
 * "full" mostra o corpo inteiro (criador de personagem, celebrações).
 */
export function Avatar({
  config,
  name = '',
  size = 40,
  variant = 'portrait',
  walking = false,
}: {
  config: AvatarConfig | null | undefined;
  name?: string;
  size?: number;
  variant?: 'portrait' | 'full';
  walking?: boolean;
}) {
  const label = name ? `Avatar de ${name}` : 'Avatar';
  if (!config) {
    return (
      <svg className="avatar avatar-empty" width={size} height={size} viewBox="0 0 16 16" role="img" aria-label={label} shapeRendering="crispEdges">
        <rect width="16" height="16" fill="#cdebd7" />
        <rect y="13" width="16" height="3" fill="#8cc63f" />
        <text x="8" y="8.6" dominantBaseline="middle" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1f7a4d" fontFamily="var(--font-pixel)">
          {initials(name) || '?'}
        </text>
      </svg>
    );
  }
  const full = variant === 'full';
  const viewBox = full ? `-3 -3 ${SPRITE_W + 6} ${SPRITE_H + 4}` : '1 0 16 16';
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
  return (
    <svg
      className={`avatar ${full ? 'avatar-full' : ''} ${walking ? 'walking' : ''}`}
      width={full ? (size * vw) / vh : size}
      height={size}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect x={vx} y={vy} width={vw} height={vh} fill={config.background} />
      {full ? (
        <rect x={vx} y={SPRITE_H - 2} width={vw} height={vh} fill={shade(config.background, -0.12)} />
      ) : (
        <rect x={vx} y={13} width={vw} height={3} fill={shade(config.background, -0.08)} />
      )}
      {walking ? (
        <>
          <g className="frame-a">
            <AvatarSprite config={config} frame={1} />
          </g>
          <g className="frame-b">
            <AvatarSprite config={config} frame={2} />
          </g>
        </>
      ) : (
        <g className={full ? 'idle-bob' : undefined}>
          <AvatarSprite config={config} frame={0} />
        </g>
      )}
    </svg>
  );
}
