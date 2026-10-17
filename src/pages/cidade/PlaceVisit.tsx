import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { GuideSprite, useDayTime } from '../../components/Scene';
import { addPoints, CITY_INFO, getPoints, markSeen, nextQuestion, say, sfx, shuffle, stopVoice, type CityPlace, type Option } from '../../lib/cidade';
import { placeClips, POMBA, POMBA_CLIPS } from '../../lib/vozes';
import { ScoreBadge, SoundToggle, useCityTitle } from './CityHud';
import { ChacaraScene } from './ChacaraScene';
import { CulturalScene } from './CulturalScene';
import { EducandarioScene } from './EducandarioScene';
import { EstacaoScene } from './EstacaoScene';
import { MuseuScene } from './MuseuScene';
import { NanzitaScene } from './NanzitaScene';
import { PlaceScene } from './PlaceScene';
import { PonteScene } from './PonteScene';
import { SicrediScene } from './SicrediScene';

/** Cena de cada ponto focal (a Praça Santa Rita é a cena padrão). */
const SCENES: Record<string, typeof PlaceScene> = { ponte: PonteScene, museu: MuseuScene, estacao: EstacaoScene, chacara: ChacaraScene, cultural: CulturalScene, nanzita: NanzitaScene, educandario: EducandarioScene, sicredi: SicrediScene };

const CONFETTI = ['#f2b705', '#12a3a0', '#d64545', '#8cc63f', '#2f5fb3', '#ec6a8c'];

export function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.8, dur: 1.6 + Math.random() * 1.4, c: CONFETTI[i % CONFETTI.length] })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} style={{ left: `${b.left}%`, background: b.c, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />
      ))}
    </div>
  );
}

type Choice = Option & { right: boolean };

export function PlaceVisit() {
  const { id = '' } = useParams();
  const place = CITY_INFO[id];
  if (!place) return <Navigate to="/mapa" replace />;
  return <Visit key={id} place={place} />;
}

function Visit({ place }: { place: CityPlace }) {
  useCityTitle(place.title);
  const Scene = SCENES[place.id] ?? PlaceScene;
  const time = useDayTime();
  const [question, setQuestion] = useState(() => nextQuestion(place.id));
  const choices = useMemo<Choice[]>(() => (question ? shuffle(question.options.map((o, i) => ({ ...o, right: i === 0 }))) : []), [question]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [popup, setPopup] = useState<'oops' | 'win' | null>(null);
  const [earned, setEarned] = useState(0);
  const [points, setPoints] = useState(getPoints);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (question) markSeen(place.id, question.id);
  }, [place.id, question]);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1200);
    return () => {
      clearTimeout(t);
      stopVoice();
    };
  }, []);

  useEffect(() => {
    if (ready && question) say([placeClips(place.id, question).ask], POMBA);
  }, [ready, question]);

  if (!question) return <Navigate to="/mapa" replace />;
  const clips = placeClips(place.id, question);

  const pick = (c: Choice) => {
    if (popup || wrong.includes(c.text)) return;
    if (c.right) {
      const n = wrong.length ? 5 : 10;
      setEarned(n);
      setPoints(addPoints(n));
      setPopup('win');
      sfx('ok');
      say([POMBA_CLIPS.right, clips.fact], POMBA);
    } else {
      setWrong((w) => [...w, c.text]);
      setPopup('oops');
      sfx('oops');
      say([POMBA_CLIPS.wrong], POMBA);
    }
  };

  const another = () => {
    sfx('pop');
    setQuestion(nextQuestion(place.id, question.id));
    setWrong([]);
    setPopup(null);
  };

  return (
    <div className={`visit time-${time}`}>
      <div className="visit-scene">
        <Scene place={place} time={time} onPoints={setPoints} />
      </div>

      <header className="visit-top">
        <Link to="/mapa" className="visit-back" onClick={() => sfx('pop')}>
          ‹ Mapa
        </Link>
        <h1 className="visit-title">
          <PixelIcon name={place.icon} size={22} /> {place.title}
        </h1>
        <div className="visit-hud">
          <ScoreBadge points={points} />
          <SoundToggle />
        </div>
      </header>

      {ready && (
        <section className="quiz" aria-live="polite">
          <div className="quiz-head">
            <span className="quiz-portrait">
              <GuideSprite size={44} />
            </span>
            <p className="quiz-q">{question.text}</p>
            <button className="quiz-listen" onClick={() => say([clips.ask], POMBA)} aria-label="Ouvir a pergunta" title="Ouvir a pergunta">
              🔊
            </button>
          </div>
          <div className="quiz-options">
            {choices.map((c, i) => {
              const off = wrong.includes(c.text);
              return (
                <button key={c.text} className={`quiz-opt ${off ? 'off' : ''}`} style={{ animationDelay: `${0.1 + i * 0.12}s` }} onClick={() => pick(c)} disabled={off}>
                  <span className="quiz-emoji" aria-hidden>
                    {off ? '❌' : c.emoji}
                  </span>
                  <span>{c.text}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {popup === 'oops' && (
        <div className="kid-modal-backdrop" onClick={() => setPopup(null)}>
          <div className="kid-modal oops" role="alertdialog" aria-label="Quase! Tente de novo" onClick={(e) => e.stopPropagation()}>
            <GuideSprite className="kid-modal-dove" size={80} flying />
            <h2>Quase! 💪</h2>
            <p>Não foi dessa vez, mas você consegue. Tente de novo!</p>
            <button className="kid-btn" onClick={() => (sfx('pop'), setPopup(null))} autoFocus>
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {popup === 'win' && (
        <div className="kid-modal-backdrop">
          <Confetti />
          <div className="kid-modal win" role="alertdialog" aria-label="Parabéns, você acertou">
            <div className="win-stars" aria-hidden>
              <PixelIcon name="star" size={34} />
              <PixelIcon name="star" size={52} />
              <PixelIcon name="star" size={34} />
            </div>
            <h2>Parabéns!</h2>
            <p className="win-earned">
              +{earned} <PixelIcon name="star" size={26} />
            </p>
            <p className="win-total">Você já tem {points} estrelas!</p>
            <div className="win-fact">
              <strong>Você sabia?</strong>
              <p>{question.fact}</p>
            </div>
            <div className="kid-modal-actions">
              <button className="kid-btn" onClick={another} autoFocus>
                Outra pergunta ▶
              </button>
              <Link className="kid-btn secondary" to="/mapa" onClick={() => sfx('pop')}>
                🗺️ Voltar ao mapa
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
