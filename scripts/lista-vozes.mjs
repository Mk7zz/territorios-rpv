/**
 * Gera public/vozes/arquivos.json com todos os áudios que existem em public/vozes (gravações das
 * crianças e voz de IA): o jogo lê essa lista e vai direto no arquivo certo, sem tentar formato por
 * formato. Roda sozinho antes do `npm run dev` e do `npm run build`.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const VOZES = resolve(process.cwd(), 'public/vozes');
const EXT = /\.(mp3|m4a|opus|ogg|wav)$/;
const out = {};
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.test(f)) out[relative(VOZES, p).split(sep).join('/').replace(EXT, '')] = f.match(EXT)[1];
  }
};
walk(VOZES);
writeFileSync(join(VOZES, 'arquivos.json'), JSON.stringify(out));
console.log(`${Object.keys(out).length} áudios em public/vozes/arquivos.json`);
