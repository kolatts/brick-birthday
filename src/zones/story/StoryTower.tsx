import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { say, sayFragments, stopSpeaking, isTestMode, type Fragment } from '../../audio/speech';
import { playSting } from '../../audio/engine';
import { safeSfx as sfx } from './ui';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { Button, palette } from '../../ui/Button';
import { f, u, ub } from '../../ui/scale';
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

/** Greedy pages of one or two sentences (one when the pair would be long). */
export function paginate(sentences: string[]): number[][] {
  const pages: number[][] = [];
  let i = 0;
  while (i < sentences.length) {
    const two = i + 1 < sentences.length && sentences[i].length + sentences[i + 1].length <= 150;
    pages.push(two ? [i, i + 1] : [i]);
    i += two ? 2 : 1;
  }
  return pages;
}

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
  const [paused, setPaused] = useState(false);
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

  const finish = (id: number) => {
    if (run.current !== id) return;
    const res = finishStory(heroById((picks as Picks).hero).kind);
    setEarned(res.earned);
    setCelebOpen(res.earned > 0);
    if (res.earned > 0) sfx('fanfare');
    else sfx('sparkle');
    setPaused(false);
    setPhase('done');
  };

  /** Narrates sentences `from`..`to` (default: all); auto-advances pages; finishes the story at the end. */
  const playLoop = async (from: number, id: number, to?: number) => {
    for (let i = from; i < (to ?? sentencesRef.current.length); i++) {
      if (run.current !== id) return;
      await speakSentence(fragsRef.current[i], i, id);
      if (run.current !== id) return;
      await pause();
    }
    if (to === undefined) finish(id);
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
    setPaused(false);
    setPhase('telling');
    setCursor({ s: -1, w: -1 });
    await sayFragments(titleFragments(p, defaultSeed(p) + count * 7919));
    if (run.current !== id) return;
    await playLoop(0, id);
  };

  const pages = useMemo(() => paginate(sentences), [sentences]);
  const curSentence = Math.max(0, cursor.s);
  const pageIdx = Math.max(0, pages.findIndex((pg) => pg.includes(curSentence)));
  const page = pages[pageIdx] ?? [];
  const lastPage = pageIdx >= pages.length - 1;

  const jump = (from: number, to?: number) => {
    const id = ++run.current;
    stopSpeaking();
    setPaused(false);
    void playLoop(from, id, to);
  };
  const replay = () => (phase === 'done' ? jump(page[0], page[page.length - 1] + 1) : jump(page[0]));
  const next = () => {
    if (lastPage) {
      const id = ++run.current;
      stopSpeaking();
      finish(id);
    } else jump(pages[pageIdx + 1][0]);
  };
  const togglePause = () => {
    if (paused) jump(curSentence);
    else {
      run.current++;
      stopSpeaking();
      setPaused(true);
    }
  };

  const useWand = () => {
    if (phase !== 'telling') return;
    sfx('sparkle');
    setBurst((b) => b + 1);
    setHop((h) => h + 1);
    if (wandUsed) return;
    setWandUsed(true);
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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `calc(${u(16)} + var(--sat)) calc(${u(28)} + var(--sar)) calc(${u(20)} + var(--sab)) calc(${u(28)} + var(--sal))`, gap: u(14) }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: u(18) }}>
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
          <section style={{ flex: 1, minHeight: u(0), display: 'flex', flexDirection: 'column', gap: u(12) }}>
            <Progress step={step} />
            <div
              data-testid={`step-${steps[step].key}`}
              style={{
                flex: 1,
                minHeight: u(0),
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gridAutoRows: `${u(152)}`,
                gap: u(14),
                padding: `${u(16)} ${u(16)} ${u(18)}`,
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
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u(22), ...softPanel, width: '60vw', maxHeight: u(640), alignSelf: 'flex-start', padding: u(20) }}>
            <div style={{ display: 'flex', gap: u(16), flexWrap: 'wrap', justifyContent: 'center' }}>
              {steps.map((s) => {
                const t = s.tiles.find((x) => x.id === picks[s.key]);
                return (
                  <div key={s.key} style={chip}>
                    <span style={{ fontSize: f(52) }}>{t?.icon}</span>
                    <span style={{ fontSize: f(26), fontWeight: 800 }}>{t?.label}</span>
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
          <section style={{ flex: 1, minHeight: u(0), display: 'flex', gap: u(20), alignItems: 'stretch', position: 'relative' }}>
            <div style={{ flex: '0 0 46vw', maxWidth: '46vw', display: 'flex', flexDirection: 'column', gap: u(16), minHeight: u(0) }}>
              <div
                data-testid="story-page"
                data-sentences={sentences.length}
                style={{
                  minHeight: u(230),
                  background: '#FFF9EC',
                  border: `${u(5)} solid ${palette.navy}`,
                  borderRadius: u(32),
                  boxShadow: `0 ${u(10)} 0 ${palette.navy}`,
                  padding: `${u(22)} ${u(28)}`,
                  fontSize: f(36),
                  lineHeight: 1.5,
                  fontWeight: 700,
                  textAlign: 'left',
                  color: palette.navy,
                }}
              >
                <p data-testid="story-text" style={{ margin: u(0) }}>
                  {page.map((si) => (
                    <span key={si}>
                      {wordsOf(sentences[si]).map((w, wi) => {
                        const current = cursor.s === si && cursor.w === wi;
                        return (
                          <span
                            key={wi}
                            data-current={current ? 'true' : undefined}
                            style={{
                              background: current ? '#FFE98A' : 'transparent',
                              borderRadius: u(8),
                              boxShadow: current ? `0 ${u(5)} 0 ${palette.red}` : undefined,
                            }}
                          >
                            {w}{' '}
                          </span>
                        );
                      })}
                    </span>
                  ))}
                </p>
                <p data-testid="story-full" aria-hidden style={{ display: 'none' }}>
                  {sentences.join(' ')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: u(14) }}>
                <Button tone="cream" testId="story-replay" ariaLabel="Replay this page" onClick={replay} style={ctl}>
                  🔁 Replay
                </Button>
                {phase === 'telling' && (
                  <>
                    <Button tone="cream" testId="story-pause" ariaLabel={paused ? 'Resume' : 'Pause'} onClick={togglePause} style={ctl}>
                      {paused ? '▶ Resume' : '⏸ Pause'}
                    </Button>
                    <Button tone="yellow" testId="story-next" ariaLabel="Next page" onClick={next} style={{ ...ctl, marginLeft: 'auto' }}>
                      Next ▶
                    </Button>
                  </>
                )}
                {phase === 'done' && (
                  <div aria-label={`Page ${pageIdx + 1} of ${pages.length}`} style={{ display: 'flex', gap: u(6), marginLeft: 'auto' }}>
                    {pages.map((_, i) => (
                      <span key={i} style={{ width: u(14), height: u(14), borderRadius: '50%', border: `${u(2)} solid ${palette.navy}`, background: i <= pageIdx ? palette.navy : 'transparent' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ position: 'absolute', right: u(0), bottom: u(0), width: u(230), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(12) }}>
              {phase === 'telling' && (
                <>
                  <button
                    type="button"
                    data-testid="wand-button"
                    aria-label="Make magic"
                    onClick={useWand}
                    style={{
                      width: u(120),
                      height: u(120),
                      minWidth: 'var(--btn-min)',
                      minHeight: 'var(--btn-min)',
                      fontSize: f(64),
                      borderRadius: '50%',
                      border: `${u(5)} solid ${palette.navy}`,
                      background: palette.yellow,
                      boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
                      cursor: 'pointer',
                      animation: wandUsed ? undefined : 'st-glow 1.4s ease-in-out infinite',
                    }}
                  >
                    🌟
                  </button>
                  <div style={{ fontSize: f(28), fontWeight: 900, textAlign: 'center', background: '#FFF4E0', border: `${u(3)} solid ${palette.navy}`, borderRadius: u(20), padding: `${u(2)} ${u(14)}` }}>Make magic!</div>
                </>
              )}
              {phase === 'done' && (
                <>
                  <Button big tone="mint" onClick={again} testId="again" style={{ padding: `${u(12)} ${u(28)}`, fontSize: f(42) }}>
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
        <div style={{ position: 'absolute', right: u(28), bottom: u(24) }}>
          <Button tone="blue" onClick={movieNight} testId="movie-night-button">
            🎬 Movie Night challenge
          </Button>
        </div>
      )}
    </Backdrop>
  );
}

const ctl: React.CSSProperties = { minWidth: u(170), minHeight: ub(72), fontSize: f(26), whiteSpace: 'nowrap', padding: `${u(8)} ${u(18)}` };

const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: u(4),
  background: '#FFF4E0',
  border: `${u(4)} solid ${palette.navy}`,
  borderRadius: u(28),
  boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
  padding: `${u(14)} ${u(20)}`,
  minWidth: u(160),
};

function Progress({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: u(10) }} aria-label={`Step ${step + 1} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: u(56),
            height: u(18),
            borderRadius: u(9),
            border: `${u(3)} solid ${palette.navy}`,
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
        minHeight: u(132),
        minWidth: u(64),
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: u(6),
        padding: `${u(10)} ${u(8)}`,
        fontFamily: 'inherit',
        color: palette.navy,
        background: selected ? palette.yellow : tone,
        border: `${u(5)} solid ${palette.navy}`,
        borderRadius: u(30),
        boxShadow: `0 ${u(8)} 0 ${palette.navy}`,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: f(60), lineHeight: 1 }}>{tile.icon}</span>
      <span style={{ fontSize: f(26), fontWeight: 800, lineHeight: 1.1 }}>{tile.label}</span>
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
    <div key={burst} data-testid="sparkle-burst" aria-hidden style={{ position: 'absolute', left: '50%', top: u(60), pointerEvents: 'none' }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            fontSize: f(44),
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
  useEffect(() => {
    void playSting('celebrate');
  }, []);
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
        border: `${u(6)} solid ${palette.navy}`,
        borderRadius: u(40),
        boxShadow: `0 ${u(12)} 0 ${palette.navy}, 0 0 0 100vmax rgba(29,42,68,.35)`,
        padding: `${u(28)} ${u(48)}`,
        textAlign: 'center',
        animation: 'st-pop .5s ease-out',
      }}
    >
      <div style={{ display: 'flex', gap: u(20), justifyContent: 'center' }}>
        {Array.from({ length: count }).map((_, i) => (
          <svg key={i} viewBox="0 0 120 90" width="150" style={{ animation: `st-bounce ${0.9 + i * 0.2}s ease-in-out infinite` }}>
            <rect x="8" y="26" width="104" height="58" rx="8" fill={palette.red} stroke={palette.navy} strokeWidth="5" />
            <rect x="22" y="8" width="24" height="20" rx="5" fill="#FF6B76" stroke={palette.navy} strokeWidth="4" />
            <rect x="74" y="8" width="24" height="20" rx="5" fill="#FF6B76" stroke={palette.navy} strokeWidth="4" />
            <path d="M18 40 Q28 34 40 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
          </svg>
        ))}
      </div>
      <div style={{ fontSize: f(46), fontWeight: 900, color: palette.red, marginTop: u(8) }}>You earned a Birthday Brick!{count > 1 ? ' (2!)' : ''}</div>
      <div style={{ fontSize: f(28), fontWeight: 700 }}>Tap anywhere to keep going</div>
    </div>
  );
}
