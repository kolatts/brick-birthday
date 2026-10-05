import { useEffect, useRef, useState } from 'react';
import { say, stopSpeaking, isTestMode } from '../../audio/speech';
import { safeSfx as sfx } from './ui';
import { useUi } from '../../state/ui';
import { Button, palette } from '../../ui/Button';
import { Backdrop, Bubble, MomPortrait, softPanel } from './ui';
import { TheaterCanvas } from './scene3d';
import { MOM_MOVIE_CHEER, MOM_MOVIE_DONE, MOM_MOVIE_INTRO, MOM_MOVIE_NEXT, MOM_MOVIE_RETRY, MOM_MOVIE_SILLY } from './lines';
import { STORIES_NEEDED, SCENE_COUNT, completeMovieNight, isCorrectOrder, movieStories, narrationFor, shuffleOrder } from './movie';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const randomSeed = () => Math.floor(Math.random() * 1e9);

type Phase = 'arrange' | 'curtains' | 'silly' | 'cheer' | 'finished';

export function Challenge() {
  const setScreen = useUi((s) => s.setScreen);
  const test = isTestMode();
  const [storyIdx, setStoryIdx] = useState(0);
  const [pool, setPool] = useState<number[]>(() => shuffleOrder(randomSeed()));
  const [slots, setSlots] = useState<(number | null)[]>(() => Array(SCENE_COUNT).fill(null));
  const [phase, setPhase] = useState<Phase>('arrange');
  const [scene, setScene] = useState(-1);
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const alive = useRef(true);
  const story = movieStories[Math.min(storyIdx, movieStories.length - 1)];

  useEffect(() => {
    alive.current = true;
    void say(MOM_MOVIE_INTRO, { speaker: 'mom' });
    return () => {
      alive.current = false;
      stopSpeaking();
    };
  }, []);

  const place = (sceneIdx: number) => {
    const free = slots.indexOf(null);
    if (free < 0 || slots.includes(sceneIdx)) return;
    sfx('pop');
    const next = [...slots];
    next[free] = sceneIdx;
    setSlots(next);
  };

  const remove = (slotIdx: number) => {
    if (slots[slotIdx] === null) return;
    sfx('tap');
    const next = [...slots];
    next[slotIdx] = null;
    setSlots(next);
  };

  const narrate = (line: string, speaker: 'mom' | 'narrator' = 'mom') => say(line, { speaker });

  const play = async () => {
    if (slots.some((s) => s === null)) return;
    const placed = slots as number[];
    const lines = narrationFor(story, placed);
    if (isCorrectOrder(placed)) {
      setPhase('curtains');
      setCurtainsOpen(false);
      setScene(-1);
      sfx('fanfare');
      await sleep(test ? 300 : 700);
      if (!alive.current) return;
      setCurtainsOpen(true);
      await sleep(test ? 900 : 1300);
      for (let i = 0; i < lines.length; i++) {
        if (!alive.current) return;
        setScene(i);
        await narrate(lines[i]);
        await sleep(test ? 250 : 500);
      }
      if (!alive.current) return;
      const done = storyIdx + 1;
      sfx('sparkle');
      if (done >= STORIES_NEEDED) {
        completeMovieNight();
        setPhase('finished');
        void narrate(MOM_MOVIE_DONE, 'mom');
        await sleep(test ? 1500 : 4500);
        if (alive.current) setScreen({ kind: 'hub' });
      } else {
        setPhase('cheer');
        void narrate(MOM_MOVIE_CHEER, 'mom');
      }
    } else {
      setPhase('silly');
      sfx('oops');
      void narrate(MOM_MOVIE_SILLY, 'mom');
      for (let i = 0; i < lines.length; i++) {
        if (!alive.current) return;
        setScene(i);
        await narrate(lines[i]);
        await sleep(test ? 250 : 600);
      }
      if (!alive.current) return;
      await sleep(test ? 300 : 800);
      if (!alive.current) return;
      setScene(-1);
      setSlots(Array(SCENE_COUNT).fill(null));
      setPool(shuffleOrder(randomSeed()));
      setPhase('arrange');
      void narrate(MOM_MOVIE_RETRY, 'mom');
    }
  };

  const nextStory = () => {
    setStoryIdx((i) => i + 1);
    setSlots(Array(SCENE_COUNT).fill(null));
    setPool(shuffleOrder(randomSeed()));
    setScene(-1);
    setPhase('arrange');
    void narrate(MOM_MOVIE_NEXT, 'mom');
  };

  const leave = () => {
    alive.current = false;
    stopSpeaking();
    setScreen({ kind: 'hub' });
  };

  const showStage = phase === 'curtains' || phase === 'silly' || phase === 'cheer' || phase === 'finished';
  const current = scene >= 0 ? story.scenes[(slots as number[])[scene]] : null;

  return (
    <Backdrop testId="challenge-screen-story">
      <TheaterCanvas icon={current?.icon ?? '🎬'} curtainsOpen={phase === 'curtains' ? curtainsOpen : true} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '16px 28px 20px', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <MomPortrait />
          <div style={{ flex: 1 }}>
            <Bubble testId="movie-title">
              🎬 Movie Night: {story.title}
            </Bubble>
          </div>
          <div data-testid="movie-progress" style={progressStyle}>
            {Math.min(storyIdx + (phase === 'cheer' || phase === 'finished' ? 1 : 0), STORIES_NEEDED)}/{STORIES_NEEDED}
          </div>
          <Button testId="back-to-island" tone="cream" onClick={leave}>
            Back to island
          </Button>
        </header>

        {!showStage && (
          <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', ...softPanel, margin: '0 auto', padding: '14px 24px 20px', width: 'min(1000px, 100%)' }}>
            <div style={{ fontSize: 30, fontWeight: 800 }}>Tap the pictures in story order</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', width: '100%' }}>
              {slots.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  data-testid={`slot-${i}`}
                  aria-label={`Slot ${i + 1}`}
                  onClick={() => remove(i)}
                  style={{
                    ...cardBase,
                    background: v === null ? 'rgba(255,244,224,.55)' : '#FFF4E0',
                    borderStyle: v === null ? 'dashed' : 'solid',
                    boxShadow: v === null ? 'none' : `0 8px 0 ${palette.navy}`,
                  }}
                >
                  {v === null ? (
                    <span style={{ fontSize: 56, fontWeight: 900, opacity: 0.5 }}>{i + 1}</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 64 }}>{story.scenes[v].icon}</span>
                      <span style={lineStyle}>{story.scenes[v].line}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', width: '100%', minHeight: 230 }}>
              {pool.map((idx) =>
                slots.includes(idx) ? (
                  <div key={idx} style={{ ...cardBase, border: '4px dashed transparent', background: 'transparent', boxShadow: 'none' }} />
                ) : (
                  <button
                    key={idx}
                    type="button"
                    className="st-tile"
                    data-testid={`card-${idx}`}
                    data-order={test ? idx : undefined}
                    onClick={() => place(idx)}
                    style={{ ...cardBase, background: '#FFF4E0', boxShadow: `0 8px 0 ${palette.navy}` }}
                  >
                    <span style={{ fontSize: 64 }}>{story.scenes[idx].icon}</span>
                    <span style={lineStyle}>{story.scenes[idx].line}</span>
                  </button>
                ),
              )}
            </div>
            <Button big tone="yellow" testId="play-movie" disabled={slots.some((s) => s === null)} onClick={() => void play()}>
              🍿 Play movie!
            </Button>
          </section>
        )}

        {showStage && (
          <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {phase === 'silly' && (
              <div data-testid="silly-message" style={{ fontSize: 44, fontWeight: 900, color: palette.red, background: '#FFF4E0', border: `4px solid ${palette.navy}`, borderRadius: 28, padding: '8px 28px' }}>
                Wait… that's not right! 🤪
              </div>
            )}
            <div data-testid="movie-stage" style={{ position: 'relative', flex: 1, minHeight: 0, width: 'min(900px, 100%)' }}>
              {phase === 'cheer' && (
                <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontSize: 52, fontWeight: 900, color: '#fff', textShadow: '0 4px 0 #1D2A44' }} data-testid="cheer">
                  Bravo! 👏
                </div>
              )}
              {phase === 'finished' && (
                <div data-testid="movie-finished" style={{ position: 'absolute', inset: '10% 8%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24, ...softPanel, background: 'rgba(255,244,224,.92)', animation: 'st-pop .5s ease-out' }}>
                  <div style={{ fontSize: 80 }}>🎉🏆🎉</div>
                  <div style={{ fontSize: 46, fontWeight: 900, color: palette.red }}>You did it!</div>
                  <div style={{ fontSize: 34, fontWeight: 800 }}>Something is buried near the Story Tower…</div>
                </div>
              )}
              <div data-testid="curtains" data-open={curtainsOpen ? 'true' : 'false'} style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }} />
              {current && (
                <div key={scene} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', animation: 'st-pop .4s ease-out' }}>
                  <div data-testid="scene-line" style={{ display: 'inline-block', fontSize: 36, fontWeight: 800, maxWidth: 800, padding: '10px 26px', ...softPanel, background: 'rgba(255,244,224,.92)' }}>{current.line}</div>
                </div>
              )}
            </div>
            {phase === 'cheer' && (
              <Button big tone="mint" testId="next-story" onClick={nextStory}>
                Next story ▶
              </Button>
            )}
          </section>
        )}
      </div>
    </Backdrop>
  );
}

const cardBase: React.CSSProperties = {
  width: 200,
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 10,
  fontFamily: 'inherit',
  color: palette.navy,
  border: `5px solid ${palette.navy}`,
  borderRadius: 26,
  cursor: 'pointer',
};

const lineStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, lineHeight: 1.15 };

const progressStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 900,
  background: palette.yellow,
  border: `4px solid ${palette.navy}`,
  borderRadius: 28,
  boxShadow: `0 6px 0 ${palette.navy}`,
  padding: '6px 22px',
};
