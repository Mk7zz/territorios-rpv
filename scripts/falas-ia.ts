/**
 * Lista todas as falas do jogo (Pomba e Mestres do Saber) para gerar a voz de IA de cada uma,
 * nas duas vozes (menina e menino). Rodado por `npm run vozes-ia`, que depois chama
 * scripts/vozes-ia.py para criar os áudios em public/vozes/ia/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clean } from '../src/lib/cidade';
import { allClips, POMBA, pombaClips } from '../src/lib/vozes';

const blocks = [
  { who: POMBA, blocks: pombaClips() },
  ...['seu-zico', 'sektor', 'dona-rosa'].map((who) => ({ who, blocks: allClips(who) })),
];
const falas = blocks.flatMap(({ who, blocks }) => blocks.flatMap((b) => b.clips.filter((c) => c.id).map((c) => ({ who, id: c.id!, text: clean(c.text) }))));
const out = resolve(process.cwd(), 'node_modules/.cache/falas-ia.json');
mkdirSync(resolve(out, '..'), { recursive: true });
writeFileSync(out, JSON.stringify(falas, null, 1));
console.log(`${falas.length} falas listadas`);
