import { useEffect, useState } from 'react';
import { celebrationAge, ordinal } from '../config/age';
import { family, welcomeMessage } from '../config/family';
import { COUPON_IDS } from '../types';
import { Button, palette } from '../ui/Button';
import { CouponArt } from '../ui/CouponArt';
import { Icon } from '../ui/Icons';
import { f, u, useIsPhone } from '../ui/scale';
import { useUi } from '../state/ui';
import { useCoupons } from '../state/coupons';
import { sayFragments, stopSpeaking } from '../audio/speech';
import { sfx } from '../audio/engine';
import { Canvas } from '@react-three/fiber';
import { Avatar } from '../three/Avatar';
import { Lights } from '../three/Lights';
import { canvasProps } from '../three/Brick';

/** The four date coupons: greyed and locked until dug up, in colour once earned. */
function CouponRow({ size }: { size: number }) {
  const dug = useCoupons((s) => s.dug);
  return (
    <div data-testid="coupon-row" style={{ display: 'flex', gap: u(8), justifyContent: 'center' }}>
      {COUPON_IDS.map((id) => {
        const earned = dug.includes(id);
        return (
          <div
            key={id}
            data-testid={`title-coupon-${id}`}
            data-earned={earned}
            title={earned ? undefined : 'Locked'}
            style={{
              position: 'relative', borderRadius: u(16), padding: u(3), background: earned ? palette.cream : 'transparent',
              border: earned ? `${u(3)} solid ${palette.navy}` : `${u(3)} solid transparent`, filter: earned ? 'none' : 'grayscale(1)', opacity: earned ? 1 : 0.6,
            }}
          >
            <CouponArt id={id} size={size} />
            {!earned && <span aria-hidden style={{ position: 'absolute', right: 0, bottom: 0, filter: 'none', lineHeight: 1 }}><Icon id="lock" size={f(24)} /></span>}
          </div>
        );
      })}
    </div>
  );
}

/** Daddy's note: cream card, soft pink border, cartoon of Daddy and Luna, and a "Read it to me" button. */
function NoteCard({ compact }: { compact: boolean }) {
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => () => stopSpeaking(), []);
  const read = () => {
    sfx('tap');
    stopSpeaking();
    void sayFragments([
      { speaker: 'dad', text: welcomeMessage.body },
      { speaker: 'dad', text: welcomeMessage.signoff },
    ]);
  };
  const body = compact ? 'max(16px, 2.9vh)' : 'clamp(18px, 2.4vh, 24px)';
  return (
    <div
      data-testid="note-card"
      style={{
        background: palette.cream, border: `${u(5)} solid #FFB3D6`, borderRadius: u(28), boxShadow: `0 ${u(6)} 0 #F7A1C8`,
        padding: u(compact ? 14 : 18), display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', gap: u(12),
        color: palette.navy, maxWidth: compact ? 'min(640px, 80vw)' : 'min(27vw, 330px)', flex: compact ? undefined : '0 1 auto', textAlign: 'center', boxSizing: 'border-box',
      }}
    >
      {imgOk && (
        <img
          src={`${import.meta.env.BASE_URL}art/daddy-luna.webp`}
          alt="Daddy and Luna"
          data-testid="daddy-luna"
          draggable={false}
          onError={() => setImgOk(false)}
          style={{ width: compact ? u(150) : 'min(70%, 190px)', height: compact ? u(150) : 'auto', aspectRatio: '1 / 1', objectFit: 'contain', flex: '0 0 auto' }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: u(8), alignItems: 'center', minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: f(26), color: '#E63946' }}>
          <Icon id="heart" size={f(28)} gap={u(6)} />{welcomeMessage.heading}
        </div>
        <div data-testid="note-body" style={{ fontSize: body, fontWeight: 700, lineHeight: 1.3 }}>{welcomeMessage.body}</div>
        <div style={{ fontSize: f(22), fontWeight: 900, fontStyle: 'italic' }}>{welcomeMessage.signoff} <Icon id="heart" size={f(24)} /></div>
        <Button tone="pink" testId="read-note" onClick={read} style={{ fontSize: f(20) }}><Icon id="speaker-on" size={f(28)} gap={u(8)} />Read it to me</Button>
      </div>
    </div>
  );
}

export function Title() {
  const setScreen = useUi((s) => s.setScreen);
  const phone = useIsPhone();
  const [noteOpen, setNoteOpen] = useState(false);
  const age = celebrationAge(family.luna.birthDate!);

  return (
    <div className="screen center-col" style={{ background: 'linear-gradient(#FFB3D6, #FFF4E0)', padding: `var(--sat) var(--sar) var(--sab) var(--sal)` }} data-testid="title-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(8), width: '100%', padding: '0 2vw', boxSizing: 'border-box' }}>
        <div data-testid="title-avatar" style={{ width: 'min(30vw, 420px)', height: 'min(70vh, 620px)', flex: '0 0 auto', marginRight: '-4vw' }}>
          <Canvas {...canvasProps} camera={{ position: [0.3, 2.1, 10.2], fov: 34 }} onCreated={({ camera }) => camera.lookAt(0.2, 1.55, 0)}>
            <Lights />
            <Avatar id="luna" wave wand scale={1.3} rotationY={0.3} />
          </Canvas>
        </div>
        <div className="center-col" style={{ flex: '0 1 auto', gap: u(14), minWidth: 0 }}>
          <h1
            data-testid="title-heading"
            style={{ margin: 0, fontSize: phone ? 'clamp(24px, 9vh, 40px)' : 'clamp(28px, min(3.7vw, 6.4vh), 56px)', color: '#E63946', textShadow: '0 3px 0 rgba(255,255,255,0.85)', padding: `0 ${u(12)}`, lineHeight: 1.05 }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>Happy {ordinal(age)} Birthday,</span>{' '}
            <span style={{ display: 'block' }}>Luna!</span>
          </h1>
          <Button
            big
            tone="blue"
            testId="play-button"
            style={{ fontSize: f(60), minHeight: `max(calc(var(--btn-min) * 1.4), ${u(112)})`, padding: `${u(12)} ${phone ? u(72) : 'min(4.5vw, 72px)'}` }}
            onClick={() => {
              sfx('pop');
              setScreen({ kind: 'hub' });
            }}
          >
            Play
          </Button>
          <div data-testid="explainer" style={{ fontSize: phone ? 'max(15px, 4.4vh)' : 'clamp(16px, 2.4vh, 22px)', fontWeight: 800, maxWidth: phone ? 'min(62vw, 520px)' : 'min(34vw, 520px)', padding: `0 ${u(8)}` }}>
            {welcomeMessage.explainer}
          </div>
          <CouponRow size={Math.round(phone ? 46 : Math.min(84, window.innerHeight * 0.1))} />
          {phone && (
            <Button tone="cream" testId="note-open" onClick={() => setNoteOpen(true)} style={{ borderColor: '#FFB3D6' }}>
              <Icon id="love-letter" size={f(30)} gap={u(8)} />A note from Daddy
            </Button>
          )}
        </div>
        {!phone && <NoteCard compact={false} />}
      </div>
      {phone && noteOpen && (
        <div
          data-testid="note-overlay"
          className="center-col"
          onClick={() => { stopSpeaking(); setNoteOpen(false); }}
          style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(29,42,68,0.45)', padding: 'var(--sat) var(--sar) var(--sab) var(--sal)' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: u(10), alignItems: 'center' }}>
            <NoteCard compact />
            <Button tone="mint" testId="note-close" onClick={() => { stopSpeaking(); setNoteOpen(false); }}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
