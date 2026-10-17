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
 * curiosidade. A Pomba (pasta `pomba`) tem 3 falas comuns e, para cada pergunta de cada ponto
 * focal, a pergunta e a curiosidade (`<lugar>-<pergunta>-pergunta`).
 * O roteiro sai de `npm run roteiro -w web` (docs/ROTEIRO-VOZES.md). Mudou o texto, regrave.
 */
import { CITY_INFO, MASTER_PLACES, QUESTIONS, type Question } from './cidade';
import type { Master } from './world';

export interface Clip {
  /** Nome do arquivo (sem .mp3). Sem nome, a fala é sempre lida pela voz do navegador. */
  id?: string;
  text: string;
}

/** O que o mestre diz quando a criança entra na casa. */
export const enterClip = (m: Master): Clip => ({ id: 'entrada', text: m.enter });

export const rightClip = (m: Master, k: number): Clip => ({ id: `acerto-${k + 1}`, text: m.right[k] });
export const wrongClip = (m: Master, k: number): Clip => ({ id: `erro-${k + 1}`, text: m.wrong[k] });

/** A pergunta falada é o gancho (que já termina perguntando); a curiosidade sempre diz a resposta certa. */
export function questionClips(q: Question) {
  return {
    ask: { id: `${q.id}-pergunta`, text: q.hook ?? q.text } as Clip,
    fact: { id: `${q.id}-curiosidade`, text: q.fact } as Clip,
  };
}

/** Pasta das falas da Pomba, que narra os pontos focais. */
export const POMBA = 'pomba';

/** Falas comuns da Pomba em todos os pontos focais. */
export const POMBA_CLIPS = {
  right: { id: 'acerto', text: 'Parabéns! Você acertou!' },
  wrong: { id: 'erro', text: 'Quase! Tente de novo.' },
  /** Dica falada ao tocar na pomba (o balão mostra a dica certinha de cada coisa). */
  tip: { id: 'dica', text: 'Toque nas coisas para descobrir!' },
} satisfies Record<string, Clip>;

/** Pergunta e curiosidade de um ponto focal, na voz da Pomba. */
export function placeClips(placeId: string, q: Question) {
  return {
    ask: { id: `${placeId}-${q.id}-pergunta`, text: q.text } as Clip,
    fact: { id: `${placeId}-${q.id}-curiosidade`, text: q.fact } as Clip,
  };
}

/** Todas as falas da Pomba, em blocos, para o roteiro de gravação. */
export function pombaClips(): { title: string; clips: Clip[] }[] {
  return [
    { title: 'Em todos os lugares', clips: [POMBA_CLIPS.right, POMBA_CLIPS.wrong, POMBA_CLIPS.tip] },
    ...Object.values(CITY_INFO).map((p) => ({ title: p.title, clips: (QUESTIONS[p.id] ?? []).flatMap((q) => Object.values(placeClips(p.id, q))) })),
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
