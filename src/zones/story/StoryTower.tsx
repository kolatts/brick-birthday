import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { say, sayFragments, stopSpeaking, isTestMode, type Fragment } from '../../audio/speech';
import { safeSfx as sfx } from './ui';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { Button, palette } from '../../ui/Button';
import { heroes, heroTile, places, powers, problems, type Picks, type Tile } from './options';
import { bonusSentence, defaultSeed, generateStory, heroById, storyFragmentsBySentence, titleFragments, type Story } from './generator';
import { finishStory } from './rewards';
import { MOM_AGAIN, MOM_GREETING, MOM_READY, MOM_STEP_LINES } from './lines';
import { Backdrop, Bubble, MomPortrait, softPanel } from './ui';
import { TowerCanvas } from './scene3d';

type StepKey = 'hero' | 'place' | 'problem' | 'power';
interface Step {
  key: StepKey;
  title: string;
  mom: string;
  tiles: Tile[];
}

const steps: Step[] = [
  { key: 'hero', title: 'Who is our hero?', mom: MOM_STEP_LINES[0], tiles: heroes.map(heroTile) },
  { key: 'place', title: 'Where does it happen?', mom: MOM_STEP_LINES[1], tiles: places },
  { key: 'problem', title: 'What silly thing happens?', mom: MOM_STEP_LINES[2], tiles: problems },
  { key: 'power', title: 'What magic power helps?', mom: MOM_STEP_LINES[3], tiles: powers },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const pause = () => sleep(isTestMode() ? 250 : 450);

type Phase = 'pick' | 'ready' | 'telling' | 'done';
interface Cursor {
  s: number;
  w: number;
}

const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);

export function Zone() {
  const setScreen = useUi((s) => s.setScreen);
  const storyBricks = useProgress((s) => s.bricks.story);
  const [phase, setPhase] = useState<Phase>('pick');
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<Partial<Picks>>({});
  const [tellCount, setTellCount] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [sentences, setSentences] = useState<string[]>([]);
  const [cursor, setCursor] = useState<Cursor>({ s: -1, w: -1 });
  const [earned, setEarned] = useState(0);
  const [wandUsed, setWandUsed] = useState(false);
  const [celebOpen, setCelebOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [hop, setHop] = useState(0);
  const run = useRef(0);
  const sentencesRef = useRef<string[]>([]);
  const fragsRef = useRef<Fragment[][]>([]);

  const momSay = useCallback((text: string) => void say(text, { speaker: 'mom' }), []);

  const cancelRun = useCallback(() => {
    run.current++;
  }, []);

  useEffect(() => {
    momSay(`${MOM_GREETING} ${steps[0].mom}`);
    return () => {
      cancelRun();
      stopSpeaking();
    };
  }, [momSay, cancelRun]);

  const choose = (key: StepKey, id: string) => {
    sfx('pop');
    const next = { ...picks, [key]: id };
    setPicks(next);
    if (step < steps.length - 1) {
      setStep(step + 1);
      momSay(steps[step + 1].mom);
    } else {
      setPhase('ready');
      momSay(MOM_READY);
    }
  };

  const goBackStep = () => {
    if (phase === 'ready') {
      setPhase('pick');
      setStep(steps.length - 1);
    } else if (step > 0) setStep(step - 1);
  };

  const speakSentence = async (frags: Fragment[], s: number, id: number) => {
    const words = wordsOf(sentencesRef.current[s]);
    const started = Date.now();
    let gotWord = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const fallback = setTimeout(() => {
      if (gotWord || run.current !== id) return;
      let k = 0;
      timer = setInterval(() => {
        if (gotWord || run.current !== id) return clearInterval(timer);
        setCursor({ s, w: k });
        k++;
        if (k >= words.length) clearInterval(timer);
      }, 330);
    }, 1000);
    setCursor({ s, w: 0 });
    setHop((h) => h + 1);
    await sayFragments(frags, {
      onWord: (i) => {
        if (run.current !== id) return;
        gotWord = true;
        setCursor({ s, w: i });
      },
    });
    clearTimeout(fallback);
    if (timer) clearInterval(timer);
    // Speech ended instantly with no boundary events (muted/unsupported): keep a readable pace.
    if (!gotWord && run.current === id) {
      const wanted = words.length * 300 - (Date.now() - started);
      if (wanted > 0) await sleep(wanted);
    }
    if (run.current === id) setCursor({ s, w: words.length });
  };

  const tell = async (count = tellCount) => {
    const id = ++run.current;
    const p = picks as Picks;
    const st = generateStory(p, defaultSeed(p) + count * 7919);
    setStory(st);
    sentencesRef.current = [...st.sentences];
    fragsRef.current = storyFragmentsBySentence(p, defaultSeed(p) + count * 7919);
    setSentences(sentencesRef.current);
    setWandUsed(false);
    setEarned(0);
    setPhase('telling');
    setCursor({ s: -1, w: -1 });
    await sayFragments(titleFragments(p, defaultSeed(p) + count * 7919));
    for (let i = 0; i < sentencesRef.current.length; i++) {
      if (run.current !== id) return;
      await speakSentence(fragsRef.current[i], i, id);
      if (run.current !== id) return;
      await pause();
    }
    if (run.current !== id) return;
    const res = finishStory(heroById(p.hero).kind);
    setEarned(res.earned);
    setCelebOpen(res.earned > 0);
    if (res.earned > 0) sfx('fanfare');
    else sfx('sparkle');
    setPhase('done');
  };

  const useWand = () => {
    if (wandUsed || phase !== 'telling') return;
    sfx('sparkle');
    setWandUsed(true);
    setBurst((b) => b + 1);
    const extra = bonusSentence(defaultSeed(picks as Picks) + tellCount);
    sentencesRef.current = [...sentencesRef.current, extra];
    fragsRef.current = [...fragsRef.current, [{ speaker: 'narrator', text: extra }]];
    setSentences(sentencesRef.current);
  };

  const again = () => {
    run.current++;
    stopSpeaking();
    setTellCount((c) => c + 1);
    setPicks({});
    setStep(0);
    setPhase('pick');
    setStory(null);
    momSay(MOM_AGAIN);
  };

  const leave = () => {
    run.current++;
    stopSpeaking();
    setScreen({ kind: 'hub' });
  };

  const movieNight = () => {
    run.current++;
    stopSpeaking();
    setScreen({ kind: 'challenge', zone: 'story' });
  };

  return (
    <Backdrop testId="zone-screen-story">
      <TowerCanvas picks={picks} hop={hop} burst={burst} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '16px 28px 20px', gap: 14 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <MomPortrait />
          <div style={{ flex: 1 }}>
            <Bubble testId="mom-line">
              {phase === 'pick' && steps[step].title}
              {phase === 'ready' && 'Ready to hear your story?'}
              {phase === 'telling' && (story?.title ?? 'Once upon a time…')}
              {phase === 'done' && (earned > 0 ? 'You did it, Luna!' : 'What a story! Want another?')}
            </Bubble>
          </div>
          <Button testId="back-to-island" tone="cream" onClick={leave}>
            Back to island
          </Button>
        </header>

        {phase === 'pick' && (
          <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Progress step={step} />
            <div
              data-testid={`step-${steps[step].key}`}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gridAutoRows: '152px',
                gap: 14,
                padding: '16px 16px 18px',
                alignContent: 'start',
                maxWidth: '60vw',
                ...softPanel,
              }}
            >
              {steps[step].tiles.map((t) => (
                <TileButton key={t.id} tile={t} step={steps[step].key} selected={picks[steps[step].key] === t.id} onPick={() => choose(steps[step].key, t.id)} />
              ))}
            </div>
            {step > 0 && (
              <div>
                <Button tone="cream" onClick={goBackStep} testId="step-back">
                  ◀ Back
                </Button>
              </div>
            )}
          </section>
        )}

        {phase === 'ready' && (
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, ...softPanel, width: '60vw', maxHeight: 640, alignSelf: 'flex-start', padding: 20 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {steps.map((s) => {
                const t = s.tiles.find((x) => x.id === picks[s.key]);
                return (
                  <div key={s.key} style={chip}>
                    <span style={{ fontSize: 52 }}>{t?.icon}</span>
                    <span style={{ fontSize: 26, fontWeight: 800 }}>{t?.label}</span>
                  </div>
                );
              })}
            </div>
            <Button big tone="yellow" onClick={() => void tell()} testId="tell-story">
              ✨ Tell my story! ✨
            </Button>
            <Button tone="cream" onClick={goBackStep}>
              ◀ Change a pick
            </Button>
          </section>
        )}

        {(phase === 'telling' || phase === 'done') && (
          <section style={{ flex: 1, minHeight: 0, display: 'flex', gap: 20, alignItems: 'stretch', position: 'relative' }}>
            <div
              data-testid="story-page"
              style={{
                flex: 1,
                minHeight: 0,
                alignSelf: 'flex-start',
                maxHeight: '100%',
                overflowY: 'auto',
                background: '#FFF9EC',
                border: `5px solid ${palette.navy}`,
                borderRadius: 32,
                boxShadow: `0 10px 0 ${palette.navy}`,
                padding: '22px 30px',
                fontSize: 34,
                lineHeight: 1.45,
                fontWeight: 700,
                maxWidth: '54vw',
              }}
            >
              <h2 style={{ margin: '0 0 12px', fontSize: 44, color: palette.red }}>{story?.title}</h2>
              <p data-testid="story-text" style={{ margin: 0 }}>
                {sentences.map((sent, si) => (
                  <span key={si} style={{ display: 'inline' }}>
                    {wordsOf(sent).map((w, wi) => {
                      const current = cursor.s === si && cursor.w === wi;
                      const read = si < cursor.s || (si === cursor.s && wi < cursor.w);
                      const hidden = si > cursor.s && phase === 'telling';
                      return (
                        <span
                          key={wi}
                          data-current={current ? 'true' : undefined}
                          style={{
                            background: current ? palette.yellow : 'transparent',
                            borderRadius: 10,
                            padding: '0 4px',
                            color: hidden ? '#C9BFB0' : read ? '#5A6A8A' : palette.navy,
                            transition: 'background .1s',
                          }}
                        >
                          {w}{' '}
                        </span>
                      );
                    })}
                  </span>
                ))}
              </p>
            </div>
            <div style={{ position: 'absolute', right: 0, top: 0, width: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              {phase === 'telling' && (
                <button
                  type="button"
                  data-testid="wand-button"
                  aria-label="Wand moment"
                  disabled={wandUsed}
                  onClick={useWand}
                  style={{
                    width: 150,
                    height: 150,
                    fontSize: 80,
                    borderRadius: '50%',
                    border: `5px solid ${palette.navy}`,
                    background: wandUsed ? '#E8DCC0' : palette.yellow,
                    cursor: 'pointer',
                    animation: wandUsed ? undefined : 'st-glow 1.4s ease-in-out infinite',
                  }}
                >
                  🌟
                </button>
              )}
              {phase === 'telling' && <div style={{ fontSize: 26, fontWeight: 800, textAlign: 'center' }}>{wandUsed ? 'Sparkle!' : 'Tap the star for magic!'}</div>}
              {phase === 'done' && (
                <>
                  <Button big tone="mint" onClick={again} testId="again" style={{ padding: '12px 28px', fontSize: 42 }}>
                    Again!
                  </Button>
                  {storyBricks >= 2 && (
                    <Button tone="blue" onClick={movieNight} testId="movie-night-button">
                      🎬 Movie Night challenge
                    </Button>
                  )}
                </>
              )}
              <Sparkles burst={burst} />
            </div>
          </section>
        )}
      </div>
      {phase === 'done' && celebOpen && <BrickCelebration count={earned} onClose={() => setCelebOpen(false)} />}
      {phase !== 'done' && storyBricks >= 2 && phase === 'pick' && step === 0 && (
        <div style={{ position: 'absolute', right: 28, bottom: 24 }}>
          <Button tone="blue" onClick={movieNight} testId="movie-night-button">
            🎬 Movie Night challenge
          </Button>
        </div>
      )}
    </Backdrop>
  );
}

const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: '#FFF4E0',
  border: `4px solid ${palette.navy}`,
  borderRadius: 28,
  boxShadow: `0 6px 0 ${palette.navy}`,
  padding: '14px 20px',
  minWidth: 160,
};

function Progress({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 10 }} aria-label={`Step ${step + 1} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 56,
            height: 18,
            borderRadius: 9,
            border: `3px solid ${palette.navy}`,
            background: i <= step ? palette.yellow : '#FFF4E0',
          }}
        />
      ))}
    </div>
  );
}

const tileTones = ['#FFF4E0', '#FFE3F0', '#E6F0FF', '#EAFBE7'];

function TileButton({ tile, step, selected, onPick }: { tile: Tile; step: StepKey; selected: boolean; onPick: () => void }) {
  const tone = tileTones[(tile.id.length + tile.label.length) % tileTones.length];
  return (
    <button
      type="button"
      className="st-tile"
      data-testid={`tile-${step}-${tile.id}`}
      onClick={onPick}
      style={{
        minHeight: 132,
        minWidth: 64,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 8px',
        fontFamily: 'inherit',
        color: palette.navy,
        background: selected ? palette.yellow : tone,
        border: `5px solid ${palette.navy}`,
        borderRadius: 30,
        boxShadow: `0 8px 0 ${palette.navy}`,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 60, lineHeight: 1 }}>{tile.icon}</span>
      <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{tile.label}</span>
    </button>
  );
}

const SPARKS = ['✨', '⭐', '💖', '🌟', '💫', '✨', '🎀', '⭐', '✨', '💖', '🌟', '💫'];

function Sparkles({ burst }: { burst: number }) {
  const bits = useMemo(
    () => SPARKS.map((s, i) => ({ s, dx: Math.cos((i / SPARKS.length) * Math.PI * 2) * (120 + (i % 3) * 40), dy: Math.sin((i / SPARKS.length) * Math.PI * 2) * (120 + (i % 3) * 40) })),
    [],
  );
  if (!burst) return null;
  return (
    <div key={burst} data-testid="sparkle-burst" aria-hidden style={{ position: 'absolute', right: 100, top: '30%', pointerEvents: 'none' }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            fontSize: 44,
            ['--dx' as string]: `${b.dx}px`,
            ['--dy' as string]: `${b.dy}px`,
            animation: 'st-burst 1.1s ease-out forwards',
          }}
        >
          {b.s}
        </span>
      ))}
    </div>
  );
}

export function BrickCelebration({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div
      data-testid="brick-celebration"
      role="status"
      onClick={onClose}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        background: '#FFF4E0',
        border: `6px solid ${palette.navy}`,
        borderRadius: 40,
        boxShadow: `0 12px 0 ${palette.navy}, 0 0 0 100vmax rgba(29,42,68,.35)`,
        padding: '28px 48px',
        textAlign: 'center',
        animation: 'st-pop .5s ease-out',
      }}
    >
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
        {Array.from({ length: count }).map((_, i) => (
          <svg key={i} viewBox="0 0 120 90" width="150" style={{ animation: `st-bounce ${0.9 + i * 0.2}s ease-in-out infinite` }}>
            <rect x="8" y="26" width="104" height="58" rx="8" fill={palette.red} stroke={palette.navy} strokeWidth="5" />
            <rect x="22" y="8" width="24" height="20" rx="5" fill="#FF6B76" stroke={palette.navy} strokeWidth="4" />
            <rect x="74" y="8" width="24" height="20" rx="5" fill="#FF6B76" stroke={palette.navy} strokeWidth="4" />
            <path d="M18 40 Q28 34 40 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
          </svg>
        ))}
      </div>
      <div style={{ fontSize: 46, fontWeight: 900, color: palette.red, marginTop: 8 }}>You earned a Birthday Brick!{count > 1 ? ' (2!)' : ''}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>Tap anywhere to keep going</div>
    </div>
  );
}
