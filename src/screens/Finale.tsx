import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { say, stopSpeaking } from '../audio/speech';
import { Button, palette } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { f, inset, maxDpr, u } from '../ui/scale';
import { FitFov } from '../three/FitFov';
import { family, finaleMessage } from '../config/family';
import { Scene } from './finale/Scene';
import { TABLE_CAM, finaleDateLabel } from './finale/layout';
import { HAPPY_BIRTHDAY_BPM } from '../audio/happyBirthday';
import { backToIsland, blowCandles, goAlbum, goMessage, sayCheese, skipToEnd, startFinale, stopFinale, useFinale } from './finale/state';
import { registerFinale } from '../test/hooks';

const SKY = 'linear-gradient(180deg, #232E7A 0%, #5B4FC4 32%, #E87BB5 70%, #FFC59A 100%)';
const TITLE = "Luna's Brick Birthday Island";

const CSS = `
@keyframes fin-pop { 0% { transform: translateX(-50%) scale(.6); opacity: 0; } 70% { transform: translateX(-50%) scale(1.06); opacity: 1; } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
@keyframes fin-bob { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes fin-flash { 0% { opacity: .95; } 100% { opacity: 0; } }
@keyframes fin-rise { 0% { transform: translateY(30px) scale(.94); opacity: 0; } 100% { transform: none; opacity: 1; } }
`;

const banner: CSSProperties = {
  position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 60, textAlign: 'center', pointerEvents: 'none', maxWidth: '86vw',
  background: '#fff', color: palette.navy, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(40), boxShadow: `0 ${u(8)} 0 ${palette.navy}`,
  padding: `${u(10)} ${u(34)}`, fontWeight: 900, lineHeight: 1.15, animation: 'fin-pop .35s ease-out',
};

/** Which lyric line the band is on, from the time since the party began. */
const LYRICS = ['Happy birthday to you!', 'Happy birthday to you!', `Happy birthday dear ${family.luna.displayName}!`, 'Happy birthday to you!'];
const LYRIC_BEATS = [0, 6, 12, 18];
function lyricAt(seconds: number): string {
  const beat = (seconds * HAPPY_BIRTHDAY_BPM) / 60;
  let idx = 0;
  LYRIC_BEATS.forEach((b, i) => { if (beat >= b) idx = i; });
  return LYRICS[idx];
}

function Lyrics() {
  const partyAt = useFinale((s) => s.partyAt);
  const [text, setText] = useState(LYRICS[0]);
  useEffect(() => {
    const id = window.setInterval(() => setText(lyricAt((performance.now() - partyAt) / 1000)), 200);
    return () => window.clearInterval(id);
  }, [partyAt]);
  return <div data-testid="lyrics" key={text} style={{ ...banner, top: inset('top', 14), fontSize: f(46), animation: 'fin-pop .3s ease-out' }}>{text}</div>;
}

function Caption({ children, testId }: { children: ReactNode; testId?: string }) {
  return <div data-testid={testId} style={{ ...banner, top: inset('top', 14), fontSize: f(56) }}>{children}</div>;
}

/** Brick picture frame around the posed group shot, with a title plaque and the date. */
function AlbumFrame() {
  const studs = Array.from({ length: 12 });
  const red = '#E63946';
  return (
    <div data-testid="album" style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute', left: '12%', right: '12%', top: '19%', bottom: '19%', border: `${u(24)} solid ${red}`, borderRadius: u(10),
          boxShadow: `0 0 0 100vmax rgba(29,42,68,.55), inset 0 0 0 ${u(5)} #FFD60A, inset 0 ${u(8)} ${u(24)} rgba(0,0,0,.3), 0 ${u(10)} 0 ${palette.navy}`,
        }}
      >
        <div style={{ position: 'absolute', left: u(-24), right: u(-24), top: `calc(${u(-24)} - ${u(13)})`, display: 'flex', justifyContent: 'space-around', padding: `0 ${u(16)}` }}>
          {studs.map((_, i) => <span key={i} style={{ width: u(34), height: u(14), borderRadius: `${u(8)} ${u(8)} 0 0`, background: red, border: `${u(3)} solid ${palette.navy}`, borderBottom: 'none' }} />)}
        </div>
        <div style={{ position: 'absolute', left: u(-24), right: u(-24), bottom: u(-24), display: 'flex', justifyContent: 'space-around', padding: `0 ${u(16)}` }} />
      </div>
      <div style={{ ...banner, top: inset('top', 12), fontSize: f(46), animation: 'none' }}>{TITLE}</div>
      <div
        data-testid="album-date"
        style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 'calc(81% - ' + u(8) + ')', background: palette.yellow, color: palette.navy,
          border: `${u(4)} solid ${palette.navy}`, borderRadius: u(16), padding: `${u(2)} ${u(26)}`, fontWeight: 900, fontSize: f(30), boxShadow: `0 ${u(5)} 0 ${palette.navy}`,
        }}
      >
        {finaleDateLabel()}
      </div>
    </div>
  );
}

function MessageCard() {
  const [reading, setReading] = useState(false);
  const read = async () => {
    if (reading) return;
    setReading(true);
    try {
      await say(finaleMessage.dad, { speaker: 'dad' });
      await say(finaleMessage.mom, { speaker: 'mom' });
    } finally {
      setReading(false);
    }
  };
  useEffect(() => () => stopSpeaking(), []);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,.5)', padding: `${inset('top', 10)} ${inset('right', 16)} ${inset('bottom', 10)} ${inset('left', 16)}` }}>
      <div
        data-testid="finale-message"
        className="scroll"
        style={{
          background: palette.cream, color: palette.navy, border: `${u(6)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`,
          width: 'min(820px, 100%)', maxHeight: '100%', padding: `${u(24)} ${u(36)}`, textAlign: 'center', animation: 'fin-rise .45s ease-out',
        }}
      >
        <div style={{ fontSize: f(34), fontWeight: 900, color: '#E6007A', marginBottom: u(8) }}>{finaleMessage.heading}</div>
        <p style={{ fontSize: f(30), fontWeight: 700, lineHeight: 1.35, margin: `${u(6)} 0` }}>{finaleMessage.dad}</p>
        <p style={{ fontSize: f(30), fontWeight: 700, lineHeight: 1.35, margin: `${u(6)} 0` }}>{finaleMessage.mom}</p>
        <div style={{ fontSize: f(36), fontWeight: 900, margin: `${u(10)} 0 ${u(16)}` }}>{finaleMessage.signoff}</div>
        <div style={{ display: 'flex', gap: u(14), justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button tone="blue" testId="finale-read" disabled={reading} onClick={() => void read()}>Read it to me</Button>
          <Button tone="mint" testId="finale-back" onClick={backToIsland}>Back to the island</Button>
          <Button tone="yellow" testId="finale-replay" onClick={startFinale}>Play it again</Button>
        </div>
      </div>
    </div>
  );
}

export function Finale() {
  const phase = useFinale((s) => s.phase);
  const runId = useFinale((s) => s.runId);
  const lit = useFinale((s) => s.lit);
  const flashKey = useFinale((s) => s.flashKey);
  const frozen = useFinale((s) => s.frozen);

  useEffect(() => {
    startFinale();
    const unregister = registerFinale({ skipToEnd });
    return () => {
      unregister();
      stopFinale();
    };
  }, []);

  const bottom: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: inset('bottom', 18), display: 'flex', justifyContent: 'center', gap: u(16), zIndex: 60, pointerEvents: 'none' };
  const live: CSSProperties = { pointerEvents: 'auto' };

  return (
    <div className="screen" data-testid="finale-screen" data-phase={phase} style={{ background: SKY, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <Canvas dpr={[1, maxDpr()]} camera={{ position: TABLE_CAM.pos, fov: 46, near: 0.1, far: 90 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <FitFov base={46} />
        <Scene />
      </Canvas>

      {phase === 'party' && <div data-testid="fireworks" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }} />}
      {phase === 'party' && <Confetti key={`c${runId}`} count={90} />}

      {phase === 'build' && <Caption testId="finale-caption">Here come your Birthday Bricks!</Caption>}
      {phase === 'candles' && <Caption testId="finale-caption">Tap to blow out the candles!</Caption>}
      {phase === 'party' && <Lyrics />}

      {(phase === 'build' || phase === 'candles' || phase === 'party') && (
        <div style={{ position: 'absolute', bottom: inset('bottom', 18), left: inset('left', 16), zIndex: 61 }}>
          <Button testId="finale-home" tone="cream" onClick={backToIsland} ariaLabel="Back to the island">Island</Button>
        </div>
      )}

      {phase === 'candles' && (
        <div style={bottom}>
          <Button big tone="pink" testId="blow-candles" style={{ ...live, minWidth: 'max(64px, 360px)', animation: 'fin-bob 1s ease-in-out infinite' }} onClick={blowCandles}>
            Blow! {lit > 0 ? `(${lit} left)` : ''}
          </Button>
        </div>
      )}

      {phase === 'party' && (
        <div style={bottom}>
          <Button tone="yellow" testId="finale-next" style={live} onClick={goAlbum}>See our memories</Button>
        </div>
      )}

      {phase === 'album' && <AlbumFrame />}
      {phase === 'album' && (
        <div style={bottom}>
          <Button tone="yellow" testId="say-cheese" style={live} onClick={sayCheese} disabled={frozen}>📸 Say cheese!</Button>
          <Button tone="mint" testId="finale-next" style={live} onClick={goMessage}>Next</Button>
        </div>
      )}
      {flashKey > 0 && <div key={flashKey} data-testid="flash" style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 80, pointerEvents: 'none', animation: 'fin-flash .55s ease-out forwards' }} />}
      {phase === 'message' && <MessageCard />}
    </div>
  );
}
