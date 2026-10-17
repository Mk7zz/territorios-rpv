import { useEffect, useState, type ReactNode } from 'react';
import { BRAND } from '../brand';
import { GuideSprite } from './Scene';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Texto que aparece letra a letra, como nas caixas de diálogo de RPG. Clique para completar. */
export function useTypewriter(text: string, speed = 22) {
  const [n, setN] = useState(reduceMotion() ? text.length : 0);
  useEffect(() => {
    if (reduceMotion()) return setN(text.length);
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length, finish: () => setN(text.length) };
}

/** Caixa de diálogo com a guia do mundo falando (ou outro personagem, com `speaker` e `portrait`). */
export function Dialogue({ text, children, speaker = BRAND.guide.name, portrait, compact }: { text: string; children?: ReactNode; speaker?: string; portrait?: ReactNode; compact?: boolean }) {
  const { shown, done, finish } = useTypewriter(text);
  return (
    <div className={`dialogue ${compact ? 'compact' : ''}`} onClick={finish}>
      <div className="dialogue-portrait">
        {portrait ?? <GuideSprite size={compact ? 48 : 64} />}
      </div>
      <div className="dialogue-main">
        <span className="dialogue-name">{speaker}</span>
        <p className="dialogue-text" aria-live="polite">
          {shown}
          {!done && <span className="caret" aria-hidden />}
        </p>
        {children && <div className={`dialogue-actions ${done ? 'ready' : ''}`}>{children}</div>}
      </div>
    </div>
  );
}
