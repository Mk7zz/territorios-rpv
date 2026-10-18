/**
 * Gera docs/ROTEIRO-VOZES.md: todas as falas gravadas por crianças (Mestres do Saber e a Pomba,
 * que narra os pontos focais), com o nome do arquivo de cada gravação. Cada fala é gravada duas
 * vezes, por uma menina e por um menino, porque o jogo inteiro fala com a voz do personagem que a
 * criança montou. Rodar com `npm run roteiro` sempre que mudar alguma fala.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clean, MASTER_PLACES } from '../src/lib/cidade';
import type { Gender } from '../src/lib/personagem';
import { allClips, POMBA, pombaClips, type Clip } from '../src/lib/vozes';

const OUT = resolve(process.cwd(), 'docs/ROTEIRO-VOZES.md');
const VOZES = resolve(process.cwd(), 'public/vozes');
const GENDERS: Gender[] = ['menina', 'menino'];

interface Voice {
  folder: string;
  name: string;
  /** Como o personagem fala (para quem vai gravar). */
  how: string;
  blocks: { title: string; clips: Clip[] }[];
}

const master = (folder: string, how: string): Voice => ({ folder, name: MASTER_PLACES[folder].master!.name, how, blocks: allClips(folder) });

const VOICES: Voice[] = [
  { folder: POMBA, name: 'Pomba (narradora dos lugares)', how: 'A pombinha guia, alegre e animada, que passeia com a criança pela cidade.', blocks: pombaClips() },
  master('seu-zico', 'Um vovô da roça, calmo e brincalhão. Pode engrossar um pouquinho a voz e falar devagar, sem pressa.'),
  master('sektor', 'Um rapaz animado do Hip Hop. Fala com ritmo e alegria, como quem está numa roda de dança.'),
  master('dona-rosa', 'Uma vovó carinhosa. Fala devagar e com doçura, como quem conversa com um netinho.'),
];

/** Se a fala já tem gravação na pasta (em qualquer formato aceito; o id pode ter subpasta). */
const recorded = (gender: Gender, folder: string, id: string) => ['mp3', 'm4a', 'opus', 'ogg', 'wav'].some((e) => existsSync(resolve(VOZES, gender, folder, `${id}.${e}`)));

const total = VOICES.reduce((n, v) => n + v.blocks.reduce((k, b) => k + b.clips.length, 0), 0);

const parts: string[] = [
  '# Roteiro de vozes',
  '',
  '> Gerado a partir do jogo (`npm run roteiro`). Não edite à mão: mude a fala no código e gere de novo.',
  '',
  `São ${total} falas curtas, gravadas por crianças, e **cada uma é gravada duas vezes: por uma menina e por um menino**. No começo do jogo a criança monta o personagem dela; com personagem menina, o jogo inteiro (Pomba e Mestres) fala com as vozes de menina, e com personagem menino, com as de menino. Não precisa gravar tudo de uma vez: o que ainda não tiver gravação continua sendo lido pela voz do computador (feminina ou masculina, conforme o personagem).`,
  '',
  '## Como gravar',
  '',
  '- **Um arquivo por fala**, com o nome exato da coluna "Arquivo" (ex.: `entrada.mp3`). Vale `.mp3`, `.m4a` (gravador do Windows e iPhone), `.opus` (áudio do WhatsApp), `.ogg` ou `.wav`.',
  '- A gravação da menina vai em `public/vozes/menina/<pasta>/` e a do menino em `public/vozes/menino/<pasta>/`. O nome da pasta aparece no título de cada personagem, abaixo.',
  '- **Pomba:** cada lugar tem a sua pasta dentro de `pomba` (ex.: `public/vozes/menina/pomba/ponte/`), com um áudio da pergunta (`pergunta-1`, `pergunta-2`...) e um da resposta certa (`resposta-1`, `resposta-2`...). O número é a ordem da pergunta no lugar.',
  '- **Acerto e erro nos lugares:** a Pomba não grava. O jogo toca uma das gravações de acerto ou de erro dos Mestres do Saber, na voz do personagem (menina ou menino).',
  '- Pode gravar no celular, num lugar silencioso, com o aparelho a um palmo da boca.',
  '- Fale **devagar e bem claro**: quem escuta também são crianças aprendendo a ler.',
  '- Deixe só um respiro de silêncio no começo e no fim. Se errar, grave a fala inteira de novo.',
  '- Os emojis foram tirados do roteiro. As colunas "Menina" e "Menino" mostram o que já está em cada pasta.',
  '',
];

for (const v of VOICES) {
  parts.push(`## ${v.name} (pasta \`${v.folder}\`)`, '', `**Como fala:** ${v.how}`, '');
  for (const block of v.blocks) {
    parts.push(`### ${block.title}`, '', '| Arquivo | Fala | Menina | Menino |', '| --- | --- | --- | --- |');
    for (const c of block.clips) parts.push(`| \`${c.id}.mp3\` | ${clean(c.text).replace(/\|/g, '\\|')} | ${GENDERS.map((g) => (recorded(g, v.folder, c.id!) ? 'gravada' : '')).join(' | ')} |`);
    parts.push('');
  }
}

writeFileSync(OUT, parts.join('\n'));
console.log(`Roteiro gerado: ${total} falas (cada uma por menina e por menino) → docs/ROTEIRO-VOZES.md`);
