import { memo, useMemo } from 'react';
import { fromAscii, outline, toRuns, type Grid } from '../lib/pixel';

/** Paleta dos ícones (cores da identidade RPV + apoio). "c" usa a cor do texto ao redor. */
const PAL: Record<string, string> = {
  k: '#1b2b33',
  w: '#ffffff',
  g: '#1f7a4d',
  f: '#3aa655',
  l: '#8cc63f',
  L: '#c9e88f',
  r: '#12a3a0',
  R: '#7fd8d4',
  T: '#0b6f6c',
  y: '#f2b705',
  Y: '#ffe27a',
  o: '#e8772e',
  d: '#d64545',
  b: '#8a5a2b',
  B: '#c58b4a',
  s: '#8a9a94',
  S: '#d5dfda',
  n: '#23384a',
  p: '#f1c27d',
  c: 'currentColor',
};

/** Ícones desenhados a partir de uma função (formas circulares), contornados automaticamente. */
function radial(fn: (d: number, a: number, x: number, y: number) => string | null): Grid {
  const g: Grid = [];
  for (let y = 0; y < 12; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < 12; x++) {
      const dx = x - 5.5;
      const dy = y - 5.5;
      const ch = fn(Math.hypot(dx, dy), Math.atan2(dy, dx), x, y);
      row.push(ch ? PAL[ch] : null);
    }
    g.push(row);
  }
  return outline(g, PAL.k);
}

const ART: Record<string, readonly string[]> = {
  // ---- Níveis (da semente à lenda) ----
  seed: ['............', '......ll....', '.....lLl....', '....lLl.....', '.....kk.....', '....kBBk....', '...kBBbBk...', '...kBbBBk...', '...kBBBbk...', '....kBbk....', '.....kk.....', '............'],
  sprout: ['............', '.ll......ll.', 'lLLl....lLLl', 'lLLLl..lLLLl', '.lLLlf.lLLl.', '..lllfflll..', '.....ff.....', '.....ff.....', '..bbbbbbbb..', '..bBBBBBBb..', '...bBBBBb...', '....bbbb....'],
  drop: ['............', '.....kk.....', '....krrk....', '....krrk....', '...krRrrk...', '..krRRrrrk..', '..krwRrrrk..', '..krwrrrrk..', '..krrrrrTk..', '...krrrTk...', '....kkkk....', '............'],
  creek: ['............', '.y..........', 'yYy....ff...', '.y....fllf..', '.....fllllf.', '..ffflllllff', '.fllRrllllll', 'flllrRrrllll', 'llllllrRrrll', 'lllllllrrRrr', 'llllllllrrrr', '............'],
  wave: ['............', '.....kkkk...', '...kkRRRRk..', '..kRRrrrrRk.', '.kRrrkkkrrk.', '.kRrk...kk..', 'kRrrk.......', 'kRrrrkk..kk.', 'krrrrrrkkRRk', 'krrrrrrrrrrk', 'kTTTTTTTTTTk', '.kkkkkkkkkk.'],
  canoe: ['............', '.....k......', '.....kyy....', '.....kyyy...', '.....kyyyy..', '.....k......', 'k....k.....k', 'kBkkkkkkkkBk', '.kBBBBBBBBk.', '..kbbbbbbk..', 'rr.kkkkkk.rr', '.rrrRRRRrrr.'],
  boot: ['............', '...kkkkk....', '...kBBBk....', '...kBkBk....', '...kBBBk....', '...kBkBk....', '...kBBBkk...', '...kBBBBBkk.', '..kBBBBBBBBk', '..kbbbbbbbbk', '..kkkkkkkkkk', '............'],
  mountain: ['............', '.....kk.....', '....kwwk....', '...kwwssk...', '...kwssssk..', '..ksssssssk.', '..ksssfssssk', '.kssfflfsssk', '.kfflllllffk', 'kfllllllllfk', 'kkkkkkkkkkkk', '............'],
  shield: ['............', '.kkkkkkkkkk.', '.kggggllllk.', '.kgggyyllLk.', '.kggyyyylLk.', '.kgggyyllLk.', '.kggggllllk.', '..kgggllLk..', '..kggglllk..', '...kgglLk...', '....kglk....', '.....kk.....'],
  summit: ['....kyyy....', '....kyyyy...', '....kyyy....', '....k.......', '....kk......', '...kwwk.....', '..kwwsskk...', '..kwsssskk..', '.kssssfssk..', '.kssfflffssk', 'kfflllllllfk', 'kkkkkkkkkkkk'],

  // ---- Conquistas e jogo ----
  books: ['............', '.kkk.kkk....', '.krk.kgk.kk.', '.kRk.kfk.kyk', '.krk.kgk.kyk', '.krk.kgk.kyk', '.kRk.kfk.kyk', '.krk.kgk.kyk', '.krk.kgk.kyk', '.kkk.kkk.kkk', 'kkkkkkkkkkkk', '............'],
  bulb: ['....kkkk....', '...kYYYYk...', '..kYwYYYYk..', '..kYwYYYYk..', '..kYYYYYYk..', '..kYYyyYYk..', '...kYyyYk...', '....kyyk....', '....kssk....', '....kSSk....', '....kssk....', '.....kk.....'],
  check: ['............', '..........kk', '.........klk', '........kllk', 'kk.....kllk.', 'klk...kllk..', 'kllk.kllk...', '.kllkllk....', '..klllk.....', '...klk......', '....k.......', '............'],
  star: ['.....kk.....', '....kYYk....', '....kYyk....', 'kkkkkYyykkkk', 'kYYYYYyyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyyyyyk..', '.kyyykkyyyk.', '.kyyk..kyyk.', 'kyyk....kyyk', 'kkk......kkk'],
  gradcap: ['............', '.....kk.....', '...kknnkk...', '.kknnnnnnkk.', 'knnnnnnnnnnk', '.kknnnnnnkyk', '...kknnkk.y.', '..knnkknnk.y', '..knnnnnnk.y', '..knnnnnnkYY', '...kkkkkk.YY', '............'],
  portal: ['....kkkk....', '..kkrrrrkk..', '.krRRRRRRrk.', '.krRkkkkRrk.', 'krRkLLLLkRrk', 'krRkLwLLkRrk', 'krRkLLLLkRrk', 'krRkLLLLkRrk', '.krRkkkkRrk.', '.krRRRRRRrk.', '..kkrrrrkk..', '....kkkk....'],
  compass: ['....kkkk....', '..kkwwwwkk..', '.kwwwwdwwwk.', '.kwwwwddwwk.', 'kwwwwwddwwwk', 'kwwwwkdwwwwk', 'kwwwwskwwwwk', 'kwwwssswwwwk', '.kwwssswwwk.', '.kwwwswwwwk.', '..kkwwwwkk..', '....kkkk....'],
  scroll: ['............', '..kkkkkkkkk.', '.kYYYYYYYYBk', '.kYsssssYYk.', '..kYYYYYYYk.', '..kYssssYYk.', '..kYYYYYYYk.', '..kYsssYYYk.', '..kYYYYYdYk.', '.kBYYYYdddk.', 'kBBkkkkkdk..', '.kkk........'],
  flame: ['......k.....', '.....kok....', '.....kook...', '....kooyok..', '..k.kooyyok.', '.kokooyyyyok', '.kooooyYyyok', '.koooyYYYyok', '.kooyYYYYyok', '..kooyYYyok.', '...kooooook.', '....kkkkkk..'],
  bolt: ['......kkkk..', '.....kyyk...', '....kyyk....', '...kyyk.....', '..kyyykkkk..', '.kyyyyyyyk..', '..kkkkyyk...', '....kyyk....', '...kyyk.....', '..kyyk......', '..kyk.......', '..kk........'],
  sun: ['.....y......', '.y...y...y..', '..y.kkkk.y..', '...kYYYYk...', '..kYYYYYYk..', 'yykYYYYYYkyy', '..kYYYYYYk..', '...kYYYYk...', '..y.kkkk.y..', '.y...y...y..', '.....y......', '............'],
  clock: ['....kkkk....', '..kkwwwwkk..', '.kwwwkwwwwk.', '.kwwwkwwwwk.', 'kwwwwkwwwwwk', 'kwwwwkwwwwwk', 'kwwwwkkkkwwk', 'kwwwwwwwwwwk', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '..kkwwwwkk..', '....kkkk....'],
  network: ['............', '..kk....kk..', '.kffk..krrk.', '.kffkkkkrrk.', '..kk....kk..', '...k....k...', '....k..k....', '.....kk.....', '....kyyk....', '....kyyk....', '.....kk.....', '............'],
  chat: ['............', '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kwwrwwrwwrwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', '.kkkkwkkkkk.', '....kwk.....', '....kk......', '............', '............'],
  palette: ['...kkkkk....', '..kBBBBBkk..', '.kBdBByBBBk.', 'kBBBBBBBBBBk', 'kBrBBBBkkBBk', 'kBBBBBk..kBk', 'kBlBBBk..kBk', 'kBBBBBBkkBk.', '.kBfBBBBBk..', '..kBBBBBBk..', '...kkkkkk...', '............'],
  map: ['............', 'kkkkkkkkkkkk', 'kLLkYYYkLLLk', 'kLdkYYYkLLLk', 'kLLkYdYkLrLk', 'kLLkYYdkLrrk', 'kLdkYYYdLLrk', 'kLLkYYYkdLLk', 'kLLkYYYkLdLk', 'kLLkYYYkLLdk', 'kkkkkkkkkkkk', '............'],
  flag: ['............', '.kkkkk..kk..', '.kddddkkddk.', '.kdddddddddk', '.kdddddddddk', '.kddkkdddddk', '.kdk..kkkkk.', '.kk.........', '.k..........', '.k..........', '.k..........', '.k..........'],
  trophy: ['..kkkkkkkk..', 'kkkYYYYYykkk', 'kYkYwYYYykYk', 'kYkYwYYYykYk', '.kkYYYYYykk.', '...kYYYyk...', '....kyyk....', '.....kk.....', '....kyyk....', '...kkkkkk...', '...kbbbbk...', '...kkkkkk...'],
  chest: ['............', '..kkkkkkkk..', '.kBBBBBBBBk.', 'kBbbbbbbbbBk', 'kkkkkyykkkkk', 'kBBBkyykBBBk', 'kBBBBkkBBBBk', 'kbbbbbbbbbbk', 'kBBBBBBBBBBk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', '............'],
  puzzle: ['............', '....kk......', '...kllk.....', 'kkkkllkkkk..', 'kllllllllk..', 'kllllllllkk.', 'kllllllllllk', 'kllllllllllk', 'kllllllllkk.', 'kllllllllk..', 'kkkkkkkkkk..', '............'],
  play: ['............', 'kkkkkkkkkkkk', 'krrrrrrrrrrk', 'krrrkkrrrrrk', 'krrrkwkkrrrk', 'krrrkwwwkrrk', 'krrrkwwwkrrk', 'krrrkwkkrrrk', 'krrrkkrrrrrk', 'krrrrrrrrrrk', 'kkkkkkkkkkkk', '............'],
  medal: ['.kkk...kkk..', '.krrk.kddk..', '..krrkddk...', '...krkdk....', '....kkkk....', '...kyyyyk...', '..kyYyyyyk..', '..kyYyyyyk..', '..kyyyyyyk..', '..kyyyyyyk..', '...kyyyyk...', '....kkkk....'],
  crown: ['............', '............', 'kk...kk...kk', 'kyk.kyyk.kyk', 'kyykyyyykyyk', 'kyyyyyyyyyyk', 'kyydyyyydyyk', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk', 'kYYYYYYYYYYk', 'kkkkkkkkkkkk', '............'],
  dice: ['............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwkwwwwkwk.', '.kwwwwwwwwk.', '.kwwwkkwwwk.', '.kwwwkkwwwk.', '.kwwwwwwwwk.', '.kwkwwwwkwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
  heart: ['............', '.kkk...kkk..', 'kdddk.kdddk.', 'kdwddkddddk.', 'kdwdddddddk.', 'kdddddddddk.', '.kdddddddk..', '..kdddddk...', '...kdddk....', '....kdk.....', '.....k......', '............'],
  backpack: ['....kkkk....', '...k....k...', '..kkkkkkkk..', '.kggggggggk.', '.kgfffffggk.', '.kgkkkkkkgk.', '.kgkyyyykgk.', '.kgkkkkkkgk.', '.kggggggggk.', '.kggggggggk.', '..kkkkkkkk..', '............'],

  // ---- Interface ----
  bell: ['.....kk.....', '....kyyk....', '...kyYyyk...', '..kyYyyyyk..', '..kyYyyyyk..', '..kyyyyyyk..', '..kyyyyyyk..', '.kyyyyyyyyk.', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk', '.....kk.....', '............'],
  mail: ['............', '............', 'kkkkkkkkkkkk', 'kkwwwwwwwwkk', 'kwkwwwwwwkwk', 'kwwkwwwwkwwk', 'kwwwkkkkwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............'],
  calendar: ['..k.....k...', 'kkkkkkkkkkkk', 'kddddddddddk', 'kddddddddddk', 'kkkkkkkkkkkk', 'kwwwwwwwwwwk', 'kwkwkwkwkwwk', 'kwwwwwwwwwwk', 'kwkwkwkwkwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............'],
  pin: ['....kkkk....', '...kddddk...', '...kdwddk...', '...kddddk...', '..kkkkkkkk..', '.kddddddddk.', '..kkkkkkkk..', '.....kk.....', '.....kk.....', '.....kk.....', '......k.....', '............'],
  location: ['....kkkk....', '...kddddk...', '..kddwwddk..', '..kdwkkwdk..', '..kdwkkwdk..', '..kddwwddk..', '...kddddk...', '...kddddk...', '....kddk....', '....kddk....', '.....kk.....', '............'],
  megaphone: ['............', '.........kk.', '......kkkrk.', '....kkrrrrk.', 'kkkkrrrrrrk.', 'kwwkrrrrrrk.', 'kwwkrrrrrrk.', 'kkkkrrrrrrk.', '..kkkkrrrrk.', '..kwk.kkkrk.', '..kk.....kk.', '............'],
  lock: ['....kkkk....', '...kssssk...', '..ks....sk..', '..ks....sk..', '.kkkkkkkkkk.', '.kyyyyyyyyk.', '.kyyykkyyyk.', '.kyyykkyyyk.', '.kyyyykyyyk.', '.kyyyyyyyyk.', '.kkkkkkkkkk.', '............'],
  user: ['....kkkk....', '...kppppk...', '...kppppk...', '...kppppk...', '....kkkk....', '..kkrrrrkk..', '.krrrrrrrrk.', '.krrrrrrrrk.', '.krrrrrrrrk.', '.kkkkkkkkkk.', '............', '............'],
  users: ['............', '.kkk....kkk.', 'kpppk..kpppk', 'kpppk..kpppk', '.kkk....kkk.', '.kggk..krrk.', 'kggggkkrrrrk', 'kggggkkrrrrk', 'kggggkkrrrrk', 'kkkkkkkkkkkk', '............', '............'],
  chart: ['............', 'k.......kkk.', 'k.......kgk.', 'k...kkk.kgk.', 'k...krk.kgk.', 'k...krk.kgk.', 'kkkkkrk.kgk.', 'kyyykrk.kgk.', 'kyyykrk.kgk.', 'kyyykrk.kgk.', 'kkkkkkkkkkkk', '............'],
  folder: ['............', 'kkkkk.......', 'kYYYYkkkkkk.', 'kYYYYYYYYYk.', 'kkkkkkkkkkkk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk', '............'],
  question: ['...kkkkkk...', '..krrrrrrk..', '.krrkkkkrrk.', '.kkk...krrk.', '.......krrk.', '......krrk..', '.....krrk...', '.....krk....', '.....kkk....', '.....krk....', '.....kkk....', '............'],
  pencil: ['.........kk.', '........kddk', '.......kyykk', '......kyyyk.', '.....kyyyk..', '....kyyyk...', '...kyyyk....', '..kyyyk.....', '.kBByk......', '.kBBk.......', 'kkkk........', '............'],
  list: ['............', 'rr.kkkkkkkkk', 'rr..........', '............', 'rr.kkkkkkkkk', 'rr..........', '............', 'rr.kkkkkkkkk', 'rr..........', '............', 'rr.kkkkkkkkk', 'rr..........'],
  home: ['.....kk.....', '....kddk....', '...kddddk...', '..kddddddk..', '.kddddddddk.', 'kkkkkkkkkkkk', '.kBBBBBBBBk.', '.kBRRBBbbBk.', '.kBRRBBbbBk.', '.kBBBBBbbBk.', '.kBBBBBbbBk.', '.kkkkkkkkkk.'],
  search: ['............', '..kkkk......', '.kRRRRk.....', 'kRwRRRRk....', 'kRwRRRRk....', 'kRRRRRRk....', 'kRRRRRRk....', '.kRRRRkk....', '..kkkkkkk...', '......kkkk..', '.......kkkk.', '........kk..'],
  school: ['.....kdd....', '.....k......', '...kkkkkk...', '.kknnnnnnkk.', 'kkkkkkkkkkkk', 'kSkSSkkSSkSk', 'kSkSSkkSSkSk', 'kSSSSSSSSSSk', 'kSkSSkkSSkSk', 'kSSSSkkSSSSk', 'kSSSSkkSSSSk', 'kkkkkkkkkkkk'],
  door: ['............', '..kkkkkkk...', '..kBBBBBk...', '..kBBBBBk...', '..kBBBBBk...', '..kBBByBk...', '..kBBBBBk...', '..kBBBBBk...', '..kBBBBBk...', '..kBBBBBk...', '..kkkkkkk...', '............'],
  download: ['.....kk.....', '.....kk.....', '.....kk.....', '..kk.kk.kk..', '...kkkkkk...', '....kkkk....', '.....kk.....', '............', 'k..........k', 'k..........k', 'kkkkkkkkkkkk', '............'],
  trash: ['....kkkk....', 'kkkkkkkkkkkk', 'kssssssssssk', 'kkkkkkkkkkkk', '.kSsSSsSSsk.', '.kSsSSsSSsk.', '.kSsSSsSSsk.', '.kSsSSsSSsk.', '.kSsSSsSSsk.', '.kSSSSSSSSk.', '..kkkkkkkk..', '............'],
  warning: ['.....kk.....', '....kyyk....', '....kyyk....', '...kyyyyk...', '...kykkyk...', '..kyykkyyk..', '..kyykkyyk..', '.kyyyyyyyyk.', '.kyyykkyyyk.', 'kyyyykkyyyyk', 'kkkkkkkkkkkk', '............'],
  menu: ['............', '............', 'cccccccccccc', 'cccccccccccc', '............', '............', 'cccccccccccc', 'cccccccccccc', '............', '............', 'cccccccccccc', 'cccccccccccc'],
  briefcase: ['............', '...kkkkkk...', '...k....k...', 'kkkkkkkkkkkk', 'kBBBBBBBBBBk', 'kBBBBBBBBBBk', 'kbbbbkkbbbbk', 'kkkkkyykkkkk', 'kBBBBkkBBBBk', 'kBBBBBBBBBBk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk'],
  building: ['....kkkk....', '....kSSk....', '.kkkkSSkkkk.', '.kSSSSSSSSk.', '.kSRSRRSRSk.', '.kSSSSSSSSk.', '.kSRSRRSRSk.', '.kSSSSSSSSk.', '.kSRSkkSRSk.', '.kSSSkkSSSk.', '.kSSSkkSSSk.', 'kkkkkkkkkkkk'],
  close: ['............', '.cc......cc.', '.ccc....ccc.', '..ccc..ccc..', '...cccccc...', '....cccc....', '....cccc....', '...cccccc...', '..ccc..ccc..', '.ccc....ccc.', '.cc......cc.', '............'],
};

const GENERATED: Record<string, () => Grid> = {
  target: () => radial((d) => (d < 1.3 ? 'd' : d < 2.4 ? 'w' : d < 3.6 ? 'd' : d < 4.6 ? 'w' : d < 5.4 ? 'd' : null)),
  coin: () => radial((d, _a, x) => (d < 3.2 ? (x === 5 || x === 6 ? 'Y' : 'y') : d < 4.4 ? 'y' : d < 5.3 ? 'o' : null)),
  gear: () => radial((d, a) => (d < 1.5 ? null : d < 3.6 ? 's' : d < 5.2 && Math.cos(a * 8) > 0.2 ? 's' : null)),
};

/** Equivalência dos emojis legados (dados antigos no banco) para os ícones próprios. */
const LEGACY: Record<string, string> = {
  '🌱': 'seed', '🌿': 'sprout', '💧': 'drop', '🏞️': 'creek', '🌊': 'wave', '🛶': 'canoe', '🥾': 'boot', '⛰️': 'mountain', '🛡️': 'shield', '🏔️': 'summit',
  '🎯': 'target', '📚': 'books', '🧠': 'bulb', '✅': 'check', '💯': 'star', '🎓': 'gradcap', '🌌': 'portal', '🚀': 'compass', '📜': 'scroll', '🔥': 'flame',
  '⚡': 'bolt', '☀️': 'sun', '⏱️': 'clock', '⏱': 'clock', '🤝': 'users', '🕸️': 'network', '💬': 'chat', '🎨': 'palette', '🗺️': 'map', '🚩': 'flag',
  '🏆': 'trophy', '🎁': 'chest', '🪙': 'coin', '🧩': 'puzzle', '🎬': 'play', '🏅': 'medal', '🔔': 'bell', '✉️': 'mail', '📅': 'calendar', '📌': 'pin', '📣': 'megaphone',
};

export type IconName = keyof typeof ART | keyof typeof GENERATED;

const cache = new Map<string, ReturnType<typeof toRuns>>();
function runsFor(name: string) {
  let r = cache.get(name);
  if (!r) {
    const grid = ART[name] ? fromAscii(ART[name], PAL) : GENERATED[name]?.();
    if (!grid) return null;
    r = toRuns(grid);
    cache.set(name, r);
  }
  return r;
}

/** Faixas de pixels de um ícone (para embutir em outro SVG, como o mundo 2D). */
export const iconRuns = (name: string) => runsFor(LEGACY[name] ?? name) ?? [];

export const hasIcon =(name: string | null | undefined) => !!name && (name in ART || name in GENERATED || name in LEGACY);

/** Ícone em pixel-art. Aceita o nome do ícone (ou um emoji legado vindo do banco). */
export const PixelIcon = memo(function PixelIcon({ name, size = 20, title, className = '' }: { name: string; size?: number; title?: string; className?: string }) {
  const key = LEGACY[name] ?? name;
  const runs = useMemo(() => runsFor(key), [key]);
  if (!runs) return <span className={className}>{name}</span>;
  return (
    <svg
      className={`px-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {runs.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
});

export const ICON_NAMES = [...Object.keys(ART), ...Object.keys(GENERATED)] as IconName[];
