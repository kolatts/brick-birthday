import { useEffect } from 'react';
import { useUi } from '../../state/ui';
import { Button, palette } from '../../ui/Button';
import { Icon } from '../../ui/Icons';
import { f, inset, u, ub } from '../../ui/scale';
import { ChallengeScene } from './challengeScene';
import { Particles } from './fx';
import { SciIcon, type SciIconId } from './icons';
import { INGREDIENTS, ROUNDS, mix, targetResult, type Ingredient } from './logic';
import { CHALLENGE_TITLE, DONE_BANNER } from './lines';
import { CameraRig, JulianFigure, LabCanvas, LabLights } from './Zone';
import { LabRoom } from './props';
import { brew, clearPicks, completeChallengeNow, disposeLab, initLab, julianSay, startChallenge, togglePick, useLab } from './store';
import { Caption, CouponBadge, HudPanel, LAB_SKY, Row, SCI_CSS, Tile } from './ui';
import { CHALLENGE_INTRO } from './lines';

const ING_ICON: Record<Ingredient, SciIconId | 'lemon'> = { red: 'berry', blue: 'flower', yellow: 'lemon', white: 'salt', glitter: 'glitter' };
const ING_BG: Record<Ingredient, string> = { red: '#FFD5D8', blue: '#D3E4FF', yellow: '#FFF3A0', white: '#FFFFFF', glitter: '#FFD9F0' };

function Scene() {
  return (
    <>
      <LabLights />
      <CameraRig />
      <LabRoom />
      <JulianFigure />
      <ChallengeScene />
      <Particles />
    </>
  );
}

function TargetChip() {
  const ch = useLab((s) => s.ch);
  const target = ch.targets[Math.min(ch.round, ROUNDS - 1)];
  const res = targetResult(target);
  return (
    <div data-testid="target-swatch" data-target={target.id} data-recipe={target.recipe.join(',')} style={{ display: 'flex', alignItems: 'center', gap: u(12), background: palette.cream, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(5)} 0 ${palette.navy}`, padding: `${u(6)} ${u(18)} ${u(6)} ${u(8)}`, minHeight: 'var(--btn-min)' }}>
      <span style={{ width: u(46), height: u(46), borderRadius: '50%', background: res.color, border: `${u(4)} solid ${palette.navy}`, boxShadow: res.sparkly ? '0 0 14px 4px #FFE066' : undefined, flex: '0 0 auto' }} />
      <span style={{ fontSize: f(24), fontWeight: 900, color: palette.navy }}>
        <span data-testid="round-progress">Potion {Math.min(ch.round + 1, ROUNDS)} of {ROUNDS}</span>
        <span style={{ display: 'block', fontSize: f(18), fontWeight: 800 }}>Make: {target.name}</span>
      </span>
    </div>
  );
}

function Tray() {
  const ch = useLab((s) => s.ch);
  const target = ch.targets[Math.min(ch.round, ROUNDS - 1)];
  const hint = ch.wrongs >= 2;
  const m = mix(ch.picked);
  return (
    <HudPanel testId="mix-tray">
      <Row gap={10}>
        {INGREDIENTS.map((ing) => {
          const icon = ING_ICON[ing.id];
          return (
            <Tile
              key={ing.id}
              small
              testId={`mix-${ing.id}`}
              label={ing.label}
              icon={icon === 'lemon' ? <Icon id="lemon" size={u(46)} /> : <SciIcon id={icon} size={u(46)} />}
              bg={ING_BG[ing.id]}
              selected={ch.picked.includes(ing.id)}
              pulse={hint && target.recipe.includes(ing.id)}
              onClick={() => togglePick(ing.id)}
            />
          );
        })}
      </Row>
      <Row gap={14}>
        <Button testId="clear-btn" tone="cream" onClick={clearPicks} style={{ minHeight: ub(64) }}>Clear</Button>
        <div data-testid="mix-preview" data-key={m.key} style={{ width: u(40), height: u(40), borderRadius: '50%', background: m.color, border: `${u(4)} solid ${palette.navy}`, boxShadow: m.sparkly ? '0 0 12px 4px #FFE066' : undefined }} />
        <Button testId="brew-btn" tone="pink" big onClick={brew} style={{ minHeight: ub(78), fontSize: f(36), padding: `${u(6)} ${u(40)}` }}>Brew!</Button>
      </Row>
    </HudPanel>
  );
}

function Intro() {
  return (
    <div data-testid="challenge-intro" style={{ position: 'absolute', inset: 0, zIndex: 85, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
      <div style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`, padding: `${u(22)} ${u(38)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(12), maxWidth: u(760), textAlign: 'center', animation: 'sci-pop .4s ease-out' }}>
        <CouponBadge size={78} />
        <div style={{ fontSize: f(40), fontWeight: 900, color: '#C9304A', lineHeight: 1.1 }}>{CHALLENGE_TITLE}</div>
        <div style={{ fontSize: f(26), fontWeight: 700, color: palette.navy }}>Julian shows a mystery potion color. Mix ingredients to match it, three times! Wrong mixes are just silly.</div>
        <Button testId="challenge-start" tone="mint" big onClick={() => { startChallenge(); }} style={{ fontSize: f(38) }}>Let's brew!</Button>
      </div>
    </div>
  );
}

function Done() {
  return (
    <>
      <div style={{ position: 'absolute', top: '27%', left: '50%', zIndex: 65, transform: 'translateX(-50%)', fontSize: f(64), fontWeight: 900, letterSpacing: u(4), animation: 'sci-neon 0.8s ease-in-out infinite', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        VIDEO GAME DAY!
      </div>
      <HudPanel testId="challenge-done">
        <div style={{ display: 'flex', alignItems: 'center', gap: u(16) }}>
          <CouponBadge size={64} />
          <div style={{ fontSize: f(34), fontWeight: 900, maxWidth: u(560), lineHeight: 1.15 }}>{DONE_BANNER}</div>
        </div>
        <Button testId="to-island" tone="mint" big onClick={completeChallengeNow} style={{ fontSize: f(36) }}>To the island!</Button>
      </HudPanel>
    </>
  );
}

export function Challenge() {
  const setScreen = useUi((s) => s.setScreen);
  const ch = useLab((s) => s.ch);
  useEffect(() => {
    initLab();
    julianSay(CHALLENGE_INTRO);
    return () => disposeLab();
  }, []);
  return (
    <div className="screen" data-testid="challenge-screen-science" style={{ background: LAB_SKY, overflow: 'hidden' }}>
      <style>{SCI_CSS}</style>
      <LabCanvas><Scene /></LabCanvas>
      {ch.started && (
        <div style={{ position: 'absolute', top: inset('top', 14), left: inset('left', 18), zIndex: 60 }}>
          <TargetChip />
        </div>
      )}
      <div style={{ position: 'absolute', top: inset('top', 14), right: inset('right', 18), zIndex: 60 }}>
        <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
      </div>
      <Caption />
      {!ch.started && <Intro />}
      {ch.started && !ch.won && <Tray />}
      {ch.won && <Done />}
    </div>
  );
}
