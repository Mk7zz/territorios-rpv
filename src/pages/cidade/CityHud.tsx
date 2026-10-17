import { useEffect, useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { isMuted, setMuted } from '../../lib/cidade';

/** Nome do jogo e o lema da tela de abertura. Para trocar, mude só aqui. */
export const APP_NAME = 'Territórios';
export const TAGLINE = 'onde a cultura cresce com você!';

/** Título da aba: "Lugar · Territórios" (ou só o nome do jogo). */
export function useCityTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}

/** Logo fixo nas cores dos azulejos da Igreja de Santa Rita (azul e branco). */
export function Logo({ big }: { big?: boolean }) {
  return (
    <span className={`city-logo ${big ? 'big' : ''}`} aria-label={APP_NAME}>
      <span className="city-logo-icon" aria-hidden>
        <PixelIcon name="compass" size={big ? 44 : 22} />
      </span>
      <span className="city-logo-text">
        <strong>{APP_NAME}</strong>
      </span>
    </span>
  );
}

/** Placar de estrelas da criança. */
export function ScoreBadge({ points }: { points: number }) {
  return (
    <span className="city-score" title="Suas estrelas" aria-label={`${points} estrelas`}>
      <PixelIcon name="star" size={22} /> {points}
    </span>
  );
}

export function SoundToggle() {
  const [muted, setM] = useState(isMuted);
  return (
    <button
      className="city-sound"
      onClick={(e) => {
        e.stopPropagation();
        setMuted(!muted);
        setM(!muted);
      }}
      aria-label={muted ? 'Ligar o som' : 'Desligar o som'}
      title={muted ? 'Ligar o som' : 'Desligar o som'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/** Entra/sai da tela cheia do aparelho (some onde o navegador não deixa, como no iPhone). */
export function FullscreenToggle() {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;
  return (
    <button
      className="city-sound"
      onClick={(e) => {
        e.stopPropagation();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      }}
      aria-label={on ? 'Sair da tela cheia' : 'Tela cheia'}
      title={on ? 'Sair da tela cheia' : 'Tela cheia'}
    >
      {on ? '🗗' : '⛶'}
    </button>
  );
}

/** Pede tela cheia em celulares e tablets (chamado no toque do botão Iniciar). */
export function enterFullscreenOnTouch() {
  try {
    if (window.matchMedia('(pointer: coarse)').matches && document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch {
    /* ignorado */
  }
}
