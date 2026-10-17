import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { CityWorld } from '../../components/CityWorld';
import { useDayTime } from '../../components/Scene';
import { CITY_PLACES, getPoints, sfx } from '../../lib/cidade';
import { getHero } from '../../lib/personagem';
import type { Place } from '../../lib/world';
import { FullscreenToggle, Logo, ScoreBadge, SoundToggle, useCityTitle } from './CityHud';

const INTRO = [
  'Oi! Eu sou a Pomba e vou passear com você por Cataguases!',
  'Toque no chão para andar. Toque nos lugares, nas árvores, no rio e nas pessoas para explorar!',
  'Lá embaixo fica a Rua dos Mestres: o Seu Zico, o Sektor e a Dona Rosa são Mestres do Saber e adoram ensinar!',
  'Cada resposta certa vale estrelas. Vamos iniciar pela Praça Santa Rita?',
];

/** O mapa de Cataguases com os pontos turísticos, em tela cheia. */
export function CityMap() {
  useCityTitle();
  const navigate = useNavigate();
  const time = useDayTime();
  const [entering, setEntering] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  const hero = useMemo(getHero, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (to: string) => {
    sfx('pop');
    setLeaving(true);
    navigate(to);
  };

  const arrive = useCallback(
    (p: Place, screen: { x: number; y: number }) => {
      if (entering) return;
      sfx('pop');
      setEntering(screen);
      timer.current = window.setTimeout(() => {
        setLeaving(true);
        navigate(p.to);
      }, 900);
    },
    [entering, navigate],
  );

  return (
    <div className="city-screen">
      <div className={`city-stage ${entering ? 'entering' : ''}`} style={entering ? { transformOrigin: `${entering.x}px ${entering.y}px` } : undefined}>
        <CityWorld places={CITY_PLACES} time={time} onArrive={arrive} introLines={INTRO} hero={hero?.look} paused={leaving}>
          <div className="city-top">
            <div className="city-top-right">
              <button className="city-sound" aria-label="Voltar para o início" title="Início" onClick={() => go('/')}>
                🏠
              </button>
              {hero && (
                <button className="city-sound city-hero" aria-label="Trocar o personagem" title="Trocar o personagem" onClick={() => go('/personagem')}>
                  <Avatar config={hero.look} size={38} />
                </button>
              )}
            </div>
            <Logo />
            <div className="city-top-right">
              <ScoreBadge points={getPoints()} />
              <SoundToggle />
              <FullscreenToggle />
            </div>
          </div>
        </CityWorld>
      </div>
      {entering && <div className="city-flash" aria-hidden />}
    </div>
  );
}
