import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useTypewriter } from '../../components/Dialogue';
import { MasterPixels, MasterPortrait, masterHeight, type MasterFrame } from '../../components/Mestres';
import { PixelIcon } from '../../components/PixelIcon';
import { useDayTime, type DayTime } from '../../components/Scene';
import { addPoints, getPoints, markSeen, MASTER_PLACES, nextQuestion, say, sfx, shuffle, stopVoice, type Option } from '../../lib/cidade';
import { enterClip, questionClips, rightClip, wrongClip, type Clip } from '../../lib/vozes';
import type { Place } from '../../lib/world';
import { ScoreBadge, SoundToggle, useCityTitle } from './CityHud';
import { ROOMS, VH, VW } from './MestreRooms';
import { Confetti } from './PlaceVisit';

/*
 * Casa de um Mestre do Saber: ele aparece grande dentro de casa, conversa com a criança,
 * faz uma pergunta curiosa e, acertando ou errando, completa a resposta com o que ele sabe.
 * Ao entrar, ele diz de quem é a casa e chama para o jogo (uma frase só).
 * As reações ao acerto e ao erro também são sorteadas, no jeito de falar de cada mestre.
 * Cada fala toca a gravação do mestre quando ela existe (veja lib/vozes.ts).
 */

type Stage = 'intro' | 'ask' | 'right' | 'wrong';
type Choice = Option & { right: boolean };

const roll = (n: number) => Math.floor(Math.random() * n);

export function MestreVisit() {
  const { id = '' } = useParams();
  const place = MASTER_PLACES[id];
  if (!place?.master) return <Navigate to="/mapa" replace />;
  return <Visit key={id} place={place} />;
}

function Visit({ place }: { place: Place }) {
  const master = place.master!;
  useCityTitle(master.room);
  const time = useDayTime();
  const [stage, setStage] = useState<Stage>('intro');
  const enter = enterClip(master);
  /** Fala do mestre logo depois da resposta e o título da janelinha. */
  const [react, setReact] = useState<{ say: Clip; title: string }>({ say: { text: '' }, title: '' });
  const [question, setQuestion] = useState(() => nextQuestion(place.id));
  const choices = useMemo<Choice[]>(() => (question ? shuffle(question.options.map((o, i) => ({ ...o, right: i === 0 }))) : []), [question]);
  const [earned, setEarned] = useState(0);
  const [points, setPoints] = useState(getPoints);
  const [ready, setReady] = useState(false);

  const right = question?.options[0];
  const qc = question ? questionClips(question) : null;
  const shownText = stage === 'intro' ? enter.text : stage === 'ask' ? (question?.hook ?? question?.text ?? '') : react.say.text;
  /** O que o mestre fala em voz alta nesta etapa. */
  const voice: Clip[] = !qc
    ? []
    : stage === 'intro'
      ? [enter]
      : stage === 'ask'
        ? [qc.ask]
        : [react.say, qc.fact];
  const { shown, done, finish } = useTypewriter(ready ? shownText : '', 28);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1100);
    return () => {
      clearTimeout(t);
      stopVoice();
    };
  }, []);

  useEffect(() => {
    if (ready && question) say(voice, place.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stage, question]);

  useEffect(() => {
    if (stage !== 'ask' || !question) return;
    markSeen(place.id, question.id);
  }, [stage, question, place.id]);

  // Animação do mestre: acena enquanto fala e pisca de vez em quando.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 160);
    return () => clearInterval(id);
  }, []);
  const talking = ready && !done;
  const frame: MasterFrame = talking && stage === 'intro' ? (tick % 4 < 2 ? 'wave' : 'stand') : tick % 22 === 0 ? 'blink' : 'stand';
  const mood = stage === 'right' ? 'happy' : stage === 'wrong' ? 'think' : talking ? 'talk' : '';

  if (!question || !right) return <Navigate to="/mapa" replace />;

  const start = () => {
    if (!done) return finish();
    sfx('pop');
    setStage('ask');
  };

  const pick = (c: Choice) => {
    if (stage !== 'ask') return;
    if (c.right) {
      setEarned(10);
      setPoints(addPoints(10));
      setReact({ say: rightClip(master, roll(master.right.length)), title: master.win[roll(master.win.length)] });
      setStage('right');
      sfx('ok');
    } else {
      setEarned(0);
      setReact({ say: wrongClip(master, roll(master.wrong.length)), title: master.oops[roll(master.oops.length)] });
      setStage('wrong');
      sfx('oops');
    }
  };

  const another = () => {
    sfx('pop');
    setQuestion(nextQuestion(place.id, question.id));
    setStage('ask');
  };

  return (
    <div className={`visit mz mz-${place.variant ?? 'roca'} time-${time}`} style={{ '--mz-c': master.color, '--mz-soft': master.soft, '--zr': 16 / masterHeight(place.id), background: ROOMS[place.variant ?? 'roca'].floor } as CSSProperties}>
      <div className="visit-scene">
        <Room place={place} time={time} />
      </div>

      <header className="visit-top">
        <Link to="/mapa" className="visit-back" onClick={() => sfx('pop')}>
          ‹ Mapa
        </Link>
        <h1 className="visit-title">
          <PixelIcon name={place.icon} size={22} /> {master.room}
        </h1>
        <div className="visit-hud">
          <ScoreBadge points={points} />
          <SoundToggle />
        </div>
      </header>

      <button className={`mz-zico ${mood}`} onClick={() => (sfx('pop'), say(voice, place.id))} aria-label={`${master.name}: ouvir de novo`}>
        <span className="mz-glow" aria-hidden />
        <svg viewBox={`0 0 16 ${masterHeight(place.id)}`} shapeRendering="crispEdges" aria-hidden>
          <MasterPixels id={place.id} frame={frame} />
        </svg>
      </button>

      {ready && stage !== 'intro' && (
        <div className="mz-bubble" key={`${stage}-${question.id}`} onClick={finish}>
          <span className="mz-name">{master.name}</span>
          <p>
            {shown}
            {!done && <span className="caret" aria-hidden />}
          </p>
        </div>
      )}

      {ready && stage === 'intro' && (
        <section className="quiz mz-talk" aria-live="polite" onClick={start}>
          <div className="mz-talk-head">
            <span className="mz-tag">
              {master.name} · {master.craft.replace('Mestre do Saber · ', '')}
            </span>
          </div>
          <p className="mz-talk-text">
            {shown}
            {!done && <span className="caret" aria-hidden />}
          </p>
          <div className="mz-talk-actions">
            <button className="kid-btn mz-go" onClick={(e) => (e.stopPropagation(), start())} autoFocus>
              Vamos jogar! 🎮
            </button>
          </div>
        </section>
      )}

      {stage === 'ask' && (
        <section className="quiz" aria-live="polite" key={question.id}>
          <div className="quiz-head">
            <span className="quiz-portrait mz-portrait">
              <MasterPortrait id={place.id} size={48} />
            </span>
            <p className="quiz-q">{question.text}</p>
            <button className="quiz-listen" onClick={() => qc && say([qc.ask], place.id)} aria-label="Ouvir a pergunta" title="Ouvir a pergunta">
              🔊
            </button>
          </div>
          <div className="quiz-options">
            {choices.map((c, i) => (
              <button key={c.text} className="quiz-opt" style={{ animationDelay: `${0.1 + i * 0.12}s` }} onClick={() => pick(c)}>
                <span className="quiz-emoji" aria-hidden>
                  {c.emoji}
                </span>
                <span>{c.text}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(stage === 'right' || stage === 'wrong') && (
        <div className="kid-modal-backdrop">
          {stage === 'right' && <Confetti />}
          <div className={`kid-modal mz-modal ${stage === 'right' ? 'win' : 'oops'}`} role="alertdialog" aria-label={stage === 'right' ? 'Você acertou' : 'Quase'}>
            <div className={`mz-modal-zico ${stage === 'right' ? 'happy' : 'think'}`} aria-hidden>
              <svg viewBox={`0 0 16 ${masterHeight(place.id)}`} shapeRendering="crispEdges">
                <MasterPixels id={place.id} frame={stage === 'right' ? (tick % 4 < 2 ? 'wave' : 'stand') : tick % 18 === 0 ? 'blink' : 'stand'} />
              </svg>
            </div>
            {stage === 'right' ? (
              <>
                <h2>{react.title}</h2>
                <p className="win-earned">
                  +{earned} <PixelIcon name="star" size={26} />
                </p>
                <p className="win-total">Você já tem {points} estrelas!</p>
              </>
            ) : (
              <>
                <h2>{react.title}</h2>
                <p>A resposta certa é:</p>
                <p className="mz-answer">
                  <span aria-hidden>{right.emoji}</span> {right.text}
                </p>
              </>
            )}
            <div className="win-fact mz-fact">
              <strong>{master.tell}</strong>
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

/** O cômodo do mestre; no celular em pé, a câmera aproxima no centro da cena. */
function Room({ place, time }: { place: Place; time: DayTime }) {
  const room = ROOMS[place.variant ?? 'roca'];
  const [portrait, setPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const f = () => setPortrait(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return (
    <svg className="visit-art" viewBox={portrait ? `${room.fx - 60} 0 120 ${VH}` : `0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <room.Scene time={time} />
    </svg>
  );
}
