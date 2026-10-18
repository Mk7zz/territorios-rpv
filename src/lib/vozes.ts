/**
 * Vozes gravadas por crianças: os Mestres do Saber e a Pomba, que narra os pontos focais.
 *
 * Toda fala é gravada duas vezes, por uma menina e por um menino: quem joga com personagem menina
 * ouve o jogo todo em vozes de menina; com personagem menino, em vozes de menino (lib/personagem.ts).
 * Cada fala tem um nome de arquivo fixo. Quando existe a gravação em
 * `web/public/vozes/<menina|menino>/<mestre>/<nome>.mp3` (ou .m4a, .opus, .ogg, .wav), o jogo toca ela; quando não existe,
 * lê o texto com a voz do navegador (feminina ou masculina). Dá para gravar aos poucos: o que ainda
 * não foi gravado continua funcionando.
 *
 * Por mestre: 1 fala de entrada, de acerto e de erro e, para cada pergunta dele, a pergunta e a
 * curiosidade. A Pomba (pasta `pomba`) tem uma pasta por ponto focal e, nela, a pergunta e a
 * resposta de cada pergunta (`pomba/<lugar>/pergunta-1`, `pomba/<lugar>/resposta-1`...). Acerto e
 * erro seguem um padrão em todo o jogo (PADRAO, abaixo).
 * O roteiro sai de `npm run roteiro` (docs/ROTEIRO-VOZES.md). Mudou o texto, regrave.
 */
import { CITY_INFO, MASTER_PLACES, QUESTIONS, type Question } from './cidade';
import type { Master } from './world';

export interface Clip {
  /** Nome do arquivo (sem .mp3), podendo ter subpasta. Sem nome, a fala é lida pela voz do navegador. */
  id?: string;
  text: string;
  /** Gravações de outras pastas para tentar, em ordem, quando esta não existe (antes da voz do navegador). */
  alts?: { who: string; id: string }[];
}

/** O que o mestre diz quando a criança entra na casa. */
export const enterClip = (m: Master): Clip => ({ id: 'entrada', text: m.enter });

/** Acerto e erro do mestre; sem a gravação dele, toca o acerto/erro padrão (veja PADRAO). */
export const rightClip = (m: Master, k: number): Clip => ({ id: `acerto-${k + 1}`, text: m.right[k], alts: padraoAlts('acerto') });
export const wrongClip = (m: Master, k: number): Clip => ({ id: `erro-${k + 1}`, text: m.wrong[k], alts: padraoAlts('erro') });

/** A pergunta falada é o gancho (que já termina perguntando); a curiosidade sempre diz a resposta certa. */
export function questionClips(q: Question) {
  return {
    ask: { id: `${q.id}-pergunta`, text: q.hook ?? q.text } as Clip,
    fact: { id: `${q.id}-curiosidade`, text: q.fact } as Clip,
  };
}

/** Pasta das falas da Pomba, que narra os pontos focais. */
export const POMBA = 'pomba';

/**
 * Acerto e erro padrão do jogo: as gravações dos Mestres do Saber, sempre nesta ordem (a primeira
 * que existir na voz do personagem toca). Hoje: Dona Rosa nas vozes de menina, Sektor nas de menino.
 */
const PADRAO = ['dona-rosa', 'sektor', 'seu-zico'];

function padraoAlts(kind: 'acerto' | 'erro') {
  return PADRAO.flatMap((who) => {
    const m = MASTER_PLACES[who].master!;
    return (kind === 'acerto' ? m.right : m.wrong).map((_, k) => ({ who, id: `${kind}-${k + 1}` }));
  });
}

/** Falas comuns da Pomba em todos os pontos focais. Acerto e erro tocam o acerto/erro padrão. */
export const POMBA_CLIPS = {
  get right(): Clip {
    return { text: 'Parabéns! Você acertou!', alts: padraoAlts('acerto') };
  },
  get wrong(): Clip {
    return { text: 'Quase! Olha a resposta certa.', alts: padraoAlts('erro') };
  },
  /** Dica falada ao tocar na pomba (o balão mostra a dica certinha de cada coisa). */
  tip: { id: 'dica', text: 'Toque nas coisas para descobrir!' } as Clip,
};

/** Pergunta e resposta de um ponto focal, na voz da Pomba (`pomba/<lugar>/pergunta-1`...). */
export function placeClips(placeId: string, q: Question) {
  const n = (QUESTIONS[placeId] ?? []).findIndex((x) => x.id === q.id) + 1;
  return {
    ask: { id: `${placeId}/pergunta-${n}`, text: q.text } as Clip,
    fact: { id: `${placeId}/resposta-${n}`, text: q.fact } as Clip,
  };
}

/** Falas da Pomba, em blocos, para o roteiro de gravação (acerto e erro vêm dos Mestres). */
export function pombaClips(): { title: string; clips: Clip[] }[] {
  return [
    { title: 'Em todos os lugares', clips: [POMBA_CLIPS.tip] },
    ...Object.values(CITY_INFO).map((p) => ({ title: `${p.title} (pasta \`pomba/${p.id}\`)`, clips: (QUESTIONS[p.id] ?? []).flatMap((q) => Object.values(placeClips(p.id, q))) })),
  ];
}

/** Todas as falas de um mestre, em blocos, para o roteiro de gravação. */
export function allClips(placeId: string): { title: string; clips: Clip[] }[] {
  const m = MASTER_PLACES[placeId].master!;
  return [
    { title: 'Quando a criança entra', clips: [enterClip(m)] },
    { title: 'Quando acerta', clips: m.right.map((_, k) => rightClip(m, k)) },
    { title: 'Quando erra', clips: m.wrong.map((_, k) => wrongClip(m, k)) },
    { title: 'Perguntas e curiosidades', clips: (QUESTIONS[placeId] ?? []).flatMap((q) => Object.values(questionClips(q))) },
  ];
}
