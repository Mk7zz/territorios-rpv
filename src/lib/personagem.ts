/**
 * O personagem da criança, montado na tela /personagem logo depois do "Começar".
 *
 * Além da aparência (que anda pelo mapa), ele define quem dubla o jogo: personagem menina ouve
 * todas as falas gravadas por meninas e personagem menino, por meninos (veja `say` em lib/cidade.ts).
 */
import { DEFAULT_AVATAR } from '../components/Avatar';
import type { AvatarConfig } from './types';

export type Gender = 'menina' | 'menino';

export interface Hero {
  gender: Gender;
  look: AvatarConfig;
}

const KEY = 'cidade:personagem';

/** Aparência inicial de cada um, ao tocar em Menina ou Menino. */
export const STARTER: Record<Gender, AvatarConfig> = {
  menina: { ...DEFAULT_AVATAR, hair: 'long', hairColor: '#2b1b0e', shirt: '#ec6a8c', pants: '#2f4f6f', outfit: 'tee', accessory: 'none' },
  menino: { ...DEFAULT_AVATAR, hair: 'short', hairColor: '#2b1b0e', shirt: '#12a3a0', pants: '#23384a', outfit: 'tee', accessory: 'none' },
};

export function getHero(): Hero | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && (raw.gender === 'menina' || raw.gender === 'menino')) return { gender: raw.gender, look: { ...STARTER[raw.gender as Gender], ...raw.look } };
  } catch {
    /* sem armazenamento: sem personagem */
  }
  return null;
}

export function saveHero(h: Hero) {
  try {
    localStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    /* ignorado */
  }
}

/** Gênero de quem joga; sem personagem montado, as falas ficam com vozes de menina. */
export const heroGender = (): Gender => getHero()?.gender ?? 'menina';

/** Palavra no feminino ou no masculino, conforme o personagem ("Bem-vindo"/"Bem-vinda"). */
export const byGender = (menino: string, menina: string) => (heroGender() === 'menino' ? menino : menina);
