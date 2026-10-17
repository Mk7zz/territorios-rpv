/**
 * Utilitários de pixel-art: toda a arte da plataforma (ícones, avatares, cenários) é desenhada
 * como grades de cores e convertida em retângulos SVG nítidos, sem imagens externas.
 */

export type Grid = (string | null)[][];

export interface Run {
  x: number;
  y: number;
  w: number;
  c: string;
}

export function emptyGrid(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<string | null>(w).fill(null));
}

/** Converte linhas de caracteres em uma grade, usando uma paleta (caractere → cor). */
export function fromAscii(rows: readonly string[], palette: Record<string, string>): Grid {
  const w = Math.max(...rows.map((r) => r.length));
  return rows.map((r) => Array.from({ length: w }, (_, x) => palette[r[x]] ?? null));
}

/** Desenha um contorno de 1px em volta de tudo que estiver preenchido (visual de "adesivo" dos sprites). */
export function outline(g: Grid, color: string): Grid {
  const h = g.length;
  const w = g[0]?.length ?? 0;
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (g[y][x]) continue;
      if (g[y - 1]?.[x] || g[y + 1]?.[x] || g[y][x - 1] || g[y][x + 1]) out[y][x] = color;
    }
  return out;
}

/** Agrupa pixels vizinhos da mesma cor em faixas horizontais (menos elementos no SVG). */
export function toRuns(g: Grid): Run[] {
  const runs: Run[] = [];
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === c) w++;
      runs.push({ x, y, w, c });
      x += w;
    }
  });
  return runs;
}

/** Escurece/clareia uma cor hex (amount entre -1 e 1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Gerador pseudoaleatório determinístico (cenários iguais a cada visita). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
