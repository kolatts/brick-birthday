import { useEffect, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '../../state/progress';
import { sfx } from '../../audio/engine';
import { isTestMode } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { BrickIcon, CheckIcon } from '../../ui/Icons';
import { f, inset, maxDpr, u } from '../../ui/scale';
import { FitFov } from '../../three/FitFov';
import { InstrumentIcon } from './InstrumentIcons';
import { MusicScene } from './MusicScene';
import { GOAL } from './lines';
import {
  backToIsland, disposeMusic, initMusic, restartSong, selectSong, setInstrument, setMode, tapPad, useMusic,
} from './musicState';
import { FOLLOW_INSTRUMENTS, INSTRUMENT_IDS, INSTRUMENT_NAMES, SONGS, padsFor, songById, type InstrumentId } from './songs';

const BG = 'linear-gradient(180deg, #1B1450 0%, #4B2A8A 42%, #C2559F 78%, #FF9CB8 100%)';

const CSS = `
@keyframes mus-lit { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,.0), 0 6px 0 #1D2A44, 0 0 26px 10px rgba(255,255,255,.9); } 50% { transform: scale(1.06); box-shadow: 0 0 0 0 rgba(255,255,255,.0), 0 6px 0 #1D2A44, 0 0 46px 20px rgba(255,255,255,1); } }
@keyframes mus-bubble { 0% { transform: translate(-50%,-12px) scale(.9); opacity: 0; } 100% { transform: translate(-50%,0); opacity: 1; } }
@keyframes mus-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes mus-arrow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
.mus-pad { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
`;

function Pad({ inst, i, color, label, lit, dim }: { inst: InstrumentId; i: number; color: string; label: string; lit: boolean; dim: boolean }) {
  const [down, setDown] = useState(false);
  const up = () => setDown(false);
  return (
    <button
      type="button"
      className="mus-pad"
      data-testid={`pad-${inst}-${i}`}
      data-pad-lit={lit ? 'true' : undefined}
      pad-lit={lit ? 'true' : undefined}
      aria-label={`${INSTRUMENT_NAMES[inst]} ${label}`}
      onPointerDown={(e) => {
        e.preventDefault();
        setDown(true);
        tapPad(i);
      }}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      style={{
        flex: 1,
        minWidth: 'var(--btn-min)',
        height: `max(calc(var(--btn-min) * 1.5), ${u(124)})`,
        position: 'relative',
        background: color,
        color: palette.navy,
        border: `${u(4)} solid ${lit ? '#FFFFFF' : palette.navy}`,
        borderRadius: u(22),
        boxShadow: down ? `0 ${u(1)} 0 ${palette.navy}` : `0 ${u(7)} 0 ${palette.navy}`,
        transform: down ? `translateY(${u(6)}) scale(.96)` : undefined,
        filter: down ? 'brightness(1.25)' : dim ? 'saturate(.55) brightness(.85)' : undefined,
        fontFamily: 'inherit',
        fontWeight: 900,
        fontSize: f(inst === 'guitar' || inst === 'drums' ? 26 : 32),
        cursor: 'pointer',
        padding: 0,
        animation: lit && !isTestMode() ? 'mus-lit .7s ease-in-out infinite' : undefined,
        ...(lit && isTestMode() ? { boxShadow: `0 ${u(7)} 0 ${palette.navy}, 0 0 30px 12px rgba(255,255,255,.9)` } : {}),
        zIndex: lit ? 2 : 1,
        transition: 'transform .05s, box-shadow .05s',
      }}
    >
      {lit && <span aria-hidden style={{ position: 'absolute', top: u(-30), left: '50%', marginLeft: u(-14), width: 0, height: 0, borderLeft: `${u(14)} solid transparent`, borderRight: `${u(14)} solid transparent`, borderTop: `${u(22)} solid #FFFFFF`, filter: `drop-shadow(0 ${u(3)} 0 ${palette.navy})`, animation: isTestMode() ? undefined : 'mus-arrow .7s ease-in-out infinite' }} />}
      {label}
    </button>
  );
}

function Tabs() {
  const instrument = useMusic((s) => s.instrument);
  const played = useProgress((s) => s.instrumentsPlayed);
  return (
    <div style={{ display: 'flex', gap: u(10), justifyContent: 'center' }}>
      {INSTRUMENT_IDS.map((id) => {
        const on = id === instrument;
        return (
          <button
            key={id}
            type="button"
            data-testid={`instrument-${id}`}
            aria-pressed={on}
            onClick={() => setInstrument(id)}
            style={{
              minHeight: 'var(--btn-min)', minWidth: 'var(--btn-min)', display: 'flex', alignItems: 'center', gap: u(8), padding: `${u(6)} ${u(20)}`,
              background: on ? palette.yellow : palette.cream, color: palette.navy, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(26),
              boxShadow: `0 ${u(on ? 3 : 6)} 0 ${palette.navy}`, transform: on ? `translateY(${u(3)})` : undefined,
              fontFamily: 'inherit', fontWeight: 900, fontSize: f(22), cursor: 'pointer',
            }}
          >
            <InstrumentIcon id={id} size={`max(26px, ${u(38)})`} />
            <span>{INSTRUMENT_NAMES[id]}</span>
            {played.includes(id) && <span data-testid={`played-${id}`} style={{ display: 'inline-flex' }}><CheckIcon size={22} /></span>}
          </button>
        );
      })}
    </div>
  );
}

function PadRow() {
  const instrument = useMusic((s) => s.instrument);
  const mode = useMusic((s) => s.mode);
  const songId = useMusic((s) => s.songId);
  const step = useMusic((s) => s.step);
  const songDone = useMusic((s) => s.songDone);
  const follow = mode === 'follow' && FOLLOW_INSTRUMENTS.includes(instrument);
  const song = songById(songId);
  const pads = padsFor(instrument, follow ? song.base : 0);
  const litPad = follow && !songDone ? song.notes[step]?.pad : undefined;
  return (
    <div data-testid="pad-row" style={{ display: 'flex', gap: u(follow ? 10 : 12), alignItems: 'stretch', paddingTop: u(30) }}>
      {pads.map((p, i) => (
        <Pad key={`${instrument}-${i}`} inst={instrument} i={i} color={p.color} label={p.label} lit={litPad === i} dim={litPad !== undefined && litPad !== i} />
      ))}
    </div>
  );
}

function Goal() {
  const played = useProgress((s) => s.instrumentsPlayed);
  const have = INSTRUMENT_IDS.filter((i) => played.includes(i)).length;
  const bricks = useProgress((s) => s.bricks.music);
  return (
    <div
      data-testid="goal"
      style={{ background: palette.cream, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(24), boxShadow: `0 ${u(5)} 0 ${palette.navy}`, padding: `${u(8)} ${u(16)}`, color: palette.navy, maxWidth: u(430), display: 'flex', gap: u(12), alignItems: 'center' }}
    >
      <BrickIcon size={36} color={bricks >= 1 ? '#7AE582' : '#E63946'} />
      <div>
        <div style={{ fontSize: f(19), fontWeight: 900, lineHeight: 1.15 }}>{GOAL}</div>
        <div data-testid="goal-count" style={{ fontSize: f(17), fontWeight: 800, opacity: 0.8 }}>{bricks >= 1 ? 'Brick earned! Keep jamming.' : `${have} of 4 played`}</div>
      </div>
    </div>
  );
}

function ModeBar() {
  const mode = useMusic((s) => s.mode);
  const songId = useMusic((s) => s.songId);
  const instrument = useMusic((s) => s.instrument);
  const step = useMusic((s) => s.step);
  const total = songById(songId).notes.length;
  const tone = (on: boolean) => (on ? 'yellow' : 'cream');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(8) }}>
      <div style={{ display: 'flex', gap: u(8) }}>
        <Button testId="mode-jam" tone={tone(mode === 'jam')} onClick={() => setMode('jam')}>Jam</Button>
        <Button testId="mode-follow" tone={tone(mode === 'follow')} onClick={() => setMode('follow')}>Follow</Button>
      </div>
      {mode === 'follow' && (
        <>
          <div style={{ display: 'flex', gap: u(8) }}>
            {SONGS.map((s) => (
              <Button key={s.id} testId={`song-${s.id}`} tone={songId === s.id ? 'mint' : 'cream'} onClick={() => selectSong(s.id)} style={{ fontSize: f(19), padding: `${u(6)} ${u(14)}`, whiteSpace: 'nowrap' }}>
                {s.title}
              </Button>
            ))}
          </div>
          <div data-testid="follow-progress" style={{ background: palette.cream, border: `${u(3)} solid ${palette.navy}`, borderRadius: u(18), padding: `${u(2)} ${u(14)}`, fontWeight: 900, fontSize: f(18), color: palette.navy }}>
            {FOLLOW_INSTRUMENTS.includes(instrument) ? `Note ${Math.min(step + 1, total)} of ${total}` : ''}
          </div>
        </>
      )}
    </div>
  );
}

function CaptionBubble() {
  const caption = useMusic((s) => s.caption);
  if (!caption) return null;
  return (
    <div
      key={caption.id}
      data-testid="caption"
      style={{
        position: 'absolute', top: '27%', left: '50%', transform: 'translateX(-50%)', zIndex: 70, maxWidth: 'min(760px, 78vw)',
        background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(8)} 0 ${palette.navy}`,
        padding: `${u(10)} ${u(26)}`, textAlign: 'center', color: palette.navy, animation: 'mus-bubble .25s ease-out forwards', pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: f(18), fontWeight: 900, color: '#E6007A', letterSpacing: u(1), textTransform: 'uppercase' }}>{caption.who}</div>
      <div style={{ fontSize: f(26), fontWeight: 800, lineHeight: 1.25 }}>{caption.text}</div>
    </div>
  );
}

function Overlay({ children, testId, tint = 'rgba(29,42,68,0.35)' }: { children: ReactNode; testId: string; tint?: string }) {
  return (
    <div data-testid={testId} style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint }}>
      <div style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`, padding: `${u(26)} ${u(44)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(14), maxWidth: u(760), animation: 'mus-pop .35s ease-out' }}>
        {children}
      </div>
    </div>
  );
}

function Celebrations() {
  const celebrating = useMusic((s) => s.celebrating);
  const songDone = useMusic((s) => s.songDone);
  if (celebrating) {
    return (
      <Overlay testId="brick-celebration">
        <BrickIcon size={64} />
        <div data-testid="celebration-text" style={{ fontSize: f(44), fontWeight: 900, textAlign: 'center', color: palette.navy }}>You earned a Birthday Brick!</div>
        <div style={{ fontSize: f(26), fontWeight: 700, textAlign: 'center', color: palette.navy }}>The whole band played together. Great job, Luna!</div>
        <div style={{ display: 'flex', gap: u(14), flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button testId="keep-jamming" tone="mint" onClick={() => { sfx('tap'); useMusic.setState({ celebrating: false }); }}>Keep jamming</Button>
          <Button testId="back-to-island-celebration" tone="cream" onClick={backToIsland}>Back to island</Button>
        </div>
      </Overlay>
    );
  }
  if (songDone) {
    const song = songById(songDone);
    return (
      <Overlay testId="song-celebration" tint="rgba(29,42,68,0.2)">
        <div style={{ fontSize: f(40), fontWeight: 900, textAlign: 'center', color: palette.navy }}>You played {song.title}!</div>
        <div style={{ fontSize: f(24), fontWeight: 700, color: palette.navy }}>Dad says: that was beautiful!</div>
        <div style={{ display: 'flex', gap: u(14), flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button testId="song-again" tone="mint" onClick={() => { sfx('tap'); restartSong(); }}>Play it again</Button>
          <Button testId="song-jam" tone="yellow" onClick={() => setMode('jam')}>Jam</Button>
        </div>
      </Overlay>
    );
  }
  return null;
}

export function Zone() {
  useEffect(() => {
    initMusic();
    return () => disposeMusic();
  }, []);
  return (
    <div className="screen" data-testid="zone-screen-music" style={{ background: BG, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <Canvas dpr={[1, maxDpr()]} camera={{ position: [0, 4.4, 13.5], fov: 44, near: 0.1, far: 80 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }} onCreated={({ camera }) => camera.lookAt(0, 1.2, 0)}>
        <FitFov base={44} />
        <MusicScene />
      </Canvas>
      <div style={{ position: 'absolute', top: inset('top', 12), left: inset('left', 16), right: inset('right', 16), zIndex: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: u(12), pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}><Goal /></div>
        <div style={{ pointerEvents: 'auto' }}><ModeBar /></div>
        <div style={{ pointerEvents: 'auto' }}><Button testId="back-to-island" tone="cream" onClick={backToIsland}>Back to island</Button></div>
      </div>
      <CaptionBubble />
      <div style={{ position: 'absolute', left: inset('left', 16), right: inset('right', 16), bottom: inset('bottom', 14), zIndex: 60, display: 'flex', flexDirection: 'column', gap: u(10) }}>
        <Tabs />
        <PadRow />
      </div>
      <Celebrations />
    </div>
  );
}

