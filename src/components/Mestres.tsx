import { fromAscii, outline, toRuns, type Run } from '../lib/pixel';
import { Pixels } from './Scene';

/*
 * Mestres do Saber: personagens da cultura popular desenhados à mão, pixel a pixel.
 * Cada um tem três quadros: parado, piscando e acenando. Visuais provisórios até a
 * equipe definir as características de cada mestre.
 * - Seu Zico: chapéu de palha, cabelo e bigode brancos, camisa xadrez e bengala.
 * - Sektor: boné de aba reta, moletom, corrente, fone no pescoço e tênis (Hip Hop).
 * - Dona Rosa: coque grisalho, óculos, vestido florido, avental e bastidor de bordado.
 */

const INK = '#1b2b33';

interface Look {
  pal: Record<string, string>;
  stand: string[];
  wave: string[];
  /** Linha dos olhos e como ela fica de olhos fechados. */
  eyes: number;
  shut: string;
}

const ZICO_HEAD = ['......hh......', '.....hhhh.....', '....hhhhhh....', '....bbbbbb....', '..hhhhhhhhhh..', '...HHHHHHHH...', '...wssssssw...', '...skssssks...'];
const ZICO_LEGS = ['....pppppp..c.', '....pPpppP..c.', '....pp..pp..c.', '....pp..pp..c.', '...ooo..ooo.c.'];

const ZICO: Look = {
  pal: {
    h: '#ecc96a', // palha do chapéu
    H: '#c79a3c', // aba na sombra
    b: '#8a3b2a', // fita do chapéu
    s: '#b97a45', // pele
    S: '#97602f',
    m: '#d98a6a', // bochecha
    w: '#f3f1ea', // cabelo e bigode brancos
    k: INK,
    r: '#c0392b', // camisa xadrez
    R: '#f0e2c8',
    B: '#3b2412', // cinto
    p: '#5a6b7a', // calça
    P: '#45535f',
    o: '#4a2c17', // sapatos
    c: '#8a5a2b', // bengala
  },
  stand: [
    ...ZICO_HEAD,
    '...smssssms...',
    '...swwwwwws...',
    '....wsSSsw....',
    '......SS......',
    '...rRrRRrRr...',
    '..rrRrRRrRrr..',
    '..RRRRRRRRRR..',
    '..rrRrRRrRrrcc',
    '..ssBBBBBBssc.',
    ...ZICO_LEGS,
  ],
  wave: [
    ...ZICO_HEAD,
    '.s.smssssms...',
    '.r.swwwwwws...',
    '.r..wsSSsw....',
    '.r....SS......',
    '.rrrRrRRrRr...',
    '...rRrRRrRrr..',
    '...RRRRRRRRR..',
    '...rRrRRrRrrcc',
    '....BBBBBBssc.',
    ...ZICO_LEGS,
  ],
  eyes: 7,
  shut: '...sSssssSs...',
};

const SEKTOR_HEAD = ['....qqqqq.....', '...qqqqqqq....', '...qqqqqqqQQQ.', '...rssssssr...', '...skssssks...', '...ssssssss...'];
const SEKTOR_LEGS = ['...jjjjjjjj...', '...jjjJjjjj...', '...jjj..jjj...', '...jjj..jjj...', '..ooOo..oOoo..'];

const SEKTOR: Look = {
  pal: {
    q: '#d64545', // boné
    Q: '#8f2a2a', // aba reta
    r: '#14110f', // costeleta
    s: '#8d5524', // pele
    S: '#6e4019',
    b: '#2b1b0e', // barba
    k: INK,
    h: '#6b4fa0', // moletom
    H: '#54397f',
    w: '#f4f4f4', // cordões do capuz
    g: '#f2b705', // corrente
    p: '#1b2b33', // fone no pescoço
    P: '#12a3a0',
    j: '#2f4f6f', // calça larga
    J: '#24405a',
    o: '#f4f4f4', // tênis
    O: '#d64545',
  },
  stand: [
    ...SEKTOR_HEAD,
    '...sbssssbs...',
    '....bbSSbb....',
    '......ss......',
    '..hhpPPPPphh..',
    '..hhhhgghhhh..',
    '..hhhhghhhhh..',
    '..hhwhhhhwhh..',
    '..hhhHHHHhhh..',
    '..sshHHHHhss..',
    ...SEKTOR_LEGS,
  ],
  wave: [
    ...SEKTOR_HEAD,
    '.s.sbssssbs...',
    '.h..bbSSbb....',
    '.h....ss......',
    '.hhhpPPPPphh..',
    '...hhhgghhhh..',
    '...hhhghhhhh..',
    '...hwhhhhwhh..',
    '...hhHHHHhhh..',
    '....hHHHHhss..',
    ...SEKTOR_LEGS,
  ],
  eyes: 4,
  shut: '...sSssssSs...',
};

const ROSA_HEAD = ['......gg......', '.....gGGg.....', '....gggggg....', '...gggggggg...', '...gssssssg...', '...lklsslkl...', '...smssssms...'];
const ROSA_SKIRT = ['..dDddDddDdd..', '..ddDddDddDd..', '...dddddddd...', '....ss..ss....', '...ooo..ooo...'];

const ROSA: Look = {
  pal: {
    g: '#d4d2cb', // cabelo grisalho
    G: '#a3a39c',
    s: '#e0ac69', // pele
    S: '#c48f52',
    m: '#e88f8f', // bochecha
    k: INK,
    l: '#7a4a25', // armação dos óculos
    d: '#2f7fb3', // vestido
    D: '#f4f4f4', // florzinhas do vestido
    y: '#f2b705',
    a: '#fdf6e3', // avental
    H: '#c58b4a', // bastidor de madeira
    w: '#ffffff', // pano
    r: '#d64545', // bordado
    o: '#6b4423', // sapatos
  },
  stand: [
    ...ROSA_HEAD,
    '....ssSSss....',
    '......ss......',
    '...ddyddydd...',
    '..ddaaaaaadd..',
    '..ddaaaaaadd..',
    '..ddHHHHHddd..',
    '..dsHrwwHsdd..',
    '..dsHwywHsdd..',
    '..ddHHHHHddd..',
    ...ROSA_SKIRT,
  ],
  wave: [
    ...ROSA_HEAD,
    '.s..ssSSss....',
    '.d....ss......',
    '.ddddyddydd...',
    '...daaaaaadd..',
    '...daaaaaadd..',
    '...dHHHHHddd..',
    '...dHrwwHsdd..',
    '...dHwywHsdd..',
    '...dHHHHHddd..',
    ...ROSA_SKIRT,
  ],
  eyes: 5,
  shut: '...lSlsslSl...',
};

const pad = (rows: string[]) => ['.'.repeat(16), ...rows.map((r) => `.${r}.`), '.'.repeat(16)];
const runs = (look: Look, rows: string[]) => toRuns(outline(fromAscii(pad(rows), look.pal), INK));

function build(look: Look) {
  const blink = [...look.stand];
  blink[look.eyes] = look.shut;
  return { stand: runs(look, look.stand), blink: runs(look, blink), wave: runs(look, look.wave), w: 16, h: look.stand.length + 2 };
}

export type MasterFrame = 'stand' | 'blink' | 'wave';

const ART: Record<string, Record<MasterFrame, Run[]> & { w: number; h: number }> = {
  'seu-zico': build(ZICO),
  sektor: build(SEKTOR),
  'dona-rosa': build(ROSA),
};

const art = (id: string) => ART[id] ?? ART['seu-zico'];
const SCALE = 0.7;

/** Altura do desenho do mestre em pixels (para o svg grande da casa dele). */
export const masterHeight = (id: string) => art(id).h;

/** Mestre do Saber no mapa, com os pés em (x, y). */
export function MasterSprite({ id, x, y, frame }: { id: string; x: number; y: number; frame: MasterFrame }) {
  const a = art(id);
  const w = a.w * SCALE;
  const h = a.h * SCALE;
  return (
    <g transform={`translate(${(x - w / 2).toFixed(2)} ${(y - h + 1).toFixed(2)})`}>
      <ellipse cx={w / 2} cy={h - 1.2} rx={5.5} ry={1.6} fill="#000" opacity={0.2} />
      <rect width={w} height={h} fill="transparent" />
      <g transform={`scale(${SCALE})`}>
        <Pixels runs={a[frame]} />
      </g>
    </g>
  );
}

/** O mestre em tamanho grande: preenche um <svg viewBox={`0 0 16 ${masterHeight(id)}`}>. */
export function MasterPixels({ id, frame }: { id: string; frame: MasterFrame }) {
  return <Pixels runs={art(id)[frame]} />;
}

/** Rosto do mestre (para a caixa de diálogo e o quiz). */
export function MasterPortrait({ id, size = 64 }: { id: string; size?: number }) {
  return (
    <svg className="mestre-portrait" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <Pixels runs={art(id).wave} />
    </svg>
  );
}
