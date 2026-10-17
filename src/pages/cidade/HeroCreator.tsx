import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, AVATAR_OPTIONS, AVATAR_PALETTES, AvatarSprite, SPRITE_H, SPRITE_W } from '../../components/Avatar';
import { CityWorld } from '../../components/CityWorld';
import { useDayTime } from '../../components/Scene';
import { CITY_PLACES, sfx } from '../../lib/cidade';
import { getHero, saveHero, STARTER, type Gender } from '../../lib/personagem';
import type { AvatarConfig } from '../../lib/types';
import { useCityTitle } from './CityHud';
import { Confetti } from './PlaceVisit';

/*
 * Criação de personagem, logo depois do "Começar": primeiro a criança escolhe menina ou menino
 * (isso troca as vozes do jogo inteiro, veja lib/personagem.ts) e depois a pele, o cabelo, a roupa
 * e um enfeite. É a parte simples do criador do Multiverso, com botões grandes para dedinhos.
 */

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

type Look = AvatarConfig;
type Choice<K extends keyof Look> = { key: K; label: string; options: readonly (readonly [Look[K], string])[] };

const HAIR: Choice<'hair'> = { key: 'hair', label: 'Cabelo', options: AVATAR_OPTIONS.hair };
const OUTFIT: Choice<'outfit'> = { key: 'outfit', label: 'Roupa', options: AVATAR_OPTIONS.outfit };
const EXTRA: Choice<'accessory'> = { key: 'accessory', label: 'Enfeite', options: AVATAR_OPTIONS.accessory };

const COLORS: { key: 'skin' | 'hairColor' | 'shirt' | 'pants'; label: string; list: readonly string[] }[] = [
  { key: 'skin', label: 'Pele', list: AVATAR_PALETTES.skin },
  { key: 'hairColor', label: 'Cor do cabelo', list: AVATAR_PALETTES.hairColor },
  { key: 'shirt', label: 'Cor da roupa', list: [...AVATAR_PALETTES.shirt, '#ec6a8c'] },
  { key: 'pants', label: 'Cor da calça', list: AVATAR_PALETTES.pants },
];

function randomLook(gender: Gender): Look {
  return {
    ...STARTER[gender],
    skin: pick(AVATAR_PALETTES.skin),
    hair: pick(gender === 'menina' ? (['long', 'curly', 'bun', 'afro'] as const) : (['short', 'curly', 'afro', 'none', 'mohawk'] as const)),
    hairColor: pick(AVATAR_PALETTES.hairColor),
    shirt: pick(COLORS[2].list),
    pants: pick(AVATAR_PALETTES.pants),
    outfit: pick(AVATAR_OPTIONS.outfit)[0],
    accessory: pick(['none', 'none', 'glasses', 'cap', 'headphones', 'earring'] as const),
  };
}

/** Seletor ‹ valor ›, grande. */
function Cycler<K extends 'hair' | 'outfit' | 'accessory'>({ c, look, onChange }: { c: Choice<K>; look: Look; onChange: (v: Look[K]) => void }) {
  const i = Math.max(0, c.options.findIndex(([v]) => v === look[c.key]));
  const go = (d: number) => {
    sfx('pop');
    onChange(c.options[(i + d + c.options.length) % c.options.length][0]);
  };
  return (
    <div className="hc-row">
      <span className="hc-label">{c.label}</span>
      <div className="hc-cycler">
        <button type="button" onClick={() => go(-1)} aria-label={`${c.label}: anterior`}>
          ‹
        </button>
        <span aria-live="polite">{c.options[i][1]}</span>
        <button type="button" onClick={() => go(1)} aria-label={`${c.label}: próximo`}>
          ›
        </button>
      </div>
    </div>
  );
}

export function HeroCreator() {
  useCityTitle('Seu personagem');
  const navigate = useNavigate();
  const time = useDayTime();
  const saved = getHero();
  const [gender, setGender] = useState<Gender | null>(saved?.gender ?? null);
  const [look, setLook] = useState<Look>(saved?.look ?? STARTER.menina);
  const [leaving, setLeaving] = useState(false);
  /** Festa do "Pronto!": o personagem cai no meio da tela, pula, comemora e sai andando para o mapa. */
  const [party, setParty] = useState<'show' | 'go' | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const set = <K extends keyof Look>(k: K, v: Look[K]) => setLook((l) => ({ ...l, [k]: v }));

  const choose = (g: Gender) => {
    sfx('ok');
    // Primeira escolha: começa do visual pronto; trocando depois, só o cabelo muda.
    setLook((l) => (gender ? { ...l, hair: STARTER[g].hair } : STARTER[g]));
    setGender(g);
  };

  const toMap = () => {
    timers.current.forEach(clearTimeout);
    setLeaving(true);
    navigate('/mapa');
  };

  const done = () => {
    if (!gender || party) return;
    saveHero({ gender, look });
    sfx('ok');
    setParty('show');
    const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms));
    at(650, () => sfx('palmas'));
    at(1500, () => sfx('plim'));
    at(2300, () => setParty('go'));
    at(3300, toMap);
  };

  return (
    <div className="start-screen hc-screen">
      <CityWorld places={CITY_PLACES} time={time} demo paused={leaving} />
      <div className="start-shade" aria-hidden />
      <main className={`hc ${gender ? '' : 'hc-first'} ${party ? 'hc-out' : ''}`}>
        <h1 className="hc-title">{gender ? 'Monte seu personagem!' : 'Quem vai passear pela cidade?'}</h1>

        <div className="hc-gender" role="radiogroup" aria-label="Menina ou menino">
          {(['menina', 'menino'] as const).map((g) => (
            <button key={g} type="button" role="radio" aria-checked={gender === g} className={`hc-g hc-g-${g} ${gender === g ? 'on' : ''}`} onClick={() => choose(g)}>
              {!gender && <Avatar config={STARTER[g]} size={120} variant="full" />}
              <span>{g === 'menina' ? 'Menina' : 'Menino'}</span>
            </button>
          ))}
        </div>

        {gender && (
          <div className="hc-body">
            <div className="hc-stage">
              <Avatar config={{ ...look, background: gender === 'menina' ? '#fde3ec' : '#dcefff' }} size={210} variant="full" />
              <button type="button" className="kid-btn hc-dice" onClick={() => (sfx('pop'), setLook(randomLook(gender)))}>
                🎲 Sortear
              </button>
            </div>
            <div className="hc-panel">
              <Swatches c={COLORS[0]} value={look.skin} onPick={(v) => set('skin', v)} />
              <Cycler c={HAIR} look={look} onChange={(v) => set('hair', v)} />
              <Swatches c={COLORS[1]} value={look.hairColor} onPick={(v) => set('hairColor', v)} />
              <Cycler c={OUTFIT} look={look} onChange={(v) => set('outfit', v)} />
              <Swatches c={COLORS[2]} value={look.shirt} onPick={(v) => set('shirt', v)} />
              <Swatches c={COLORS[3]} value={look.pants ?? ''} onPick={(v) => set('pants', v)} />
              <Cycler c={EXTRA} look={look} onChange={(v) => set('accessory', v)} />
            </div>
          </div>
        )}

        {gender && (
          <button className="start-play hc-done" onClick={done}>
            Pronto! ▶
          </button>
        )}
      </main>
      {party && gender && <Party look={look} gender={gender} phase={party} onSkip={toMap} />}
    </div>
  );
}

/** A comemoração: raios girando, confete, o personagem pulando e, no fim, andando para o mapa. */
function Party({ look, gender, phase, onSkip }: { look: Look; gender: Gender; phase: 'show' | 'go'; onSkip: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  useEffect(() => {
    if (phase !== 'go') return;
    const id = setInterval(() => setStep((s) => (s === 1 ? 2 : 1)), 160);
    return () => clearInterval(id);
  }, [phase]);
  return (
    <div className={`hc-party hc-party-${gender} ${phase}`} onClick={onSkip} role="status" aria-label="Personagem pronto! Indo para o mapa">
      <div className="hc-rays" aria-hidden />
      <Confetti />
      <div className="hc-hero">
        <div className="hc-hero-jump">
          <svg viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`} shapeRendering="crispEdges" aria-hidden>
            <AvatarSprite config={look} frame={phase === 'go' ? step : 0} />
          </svg>
        </div>
        <span className="hc-hero-shadow" aria-hidden />
      </div>
      <p className="hc-party-title">{gender === 'menina' ? 'Prontinha!' : 'Prontinho!'}</p>
      <p className="hc-party-sub">Vamos passear pela cidade! 🗺️</p>
      <div className="hc-wipe" aria-hidden />
    </div>
  );
}

function Swatches({ c, value, onPick }: { c: (typeof COLORS)[number]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="hc-row">
      <span className="hc-label">{c.label}</span>
      <div className="hc-swatches">
        {c.list.map((col) => (
          <button
            key={col}
            type="button"
            className={value === col ? 'on' : ''}
            style={{ background: col }}
            onClick={() => (sfx('pop'), onPick(col))}
            aria-label={`${c.label} ${col}`}
            aria-pressed={value === col}
          />
        ))}
      </div>
    </div>
  );
}
