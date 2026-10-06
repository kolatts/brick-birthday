import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrdersScene, markBorn, type Leaving } from './OrdersScene';
import { emit } from './fx';
import { useUi } from '../../state/ui';
import { useCoupons } from '../../state/coupons';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { f, inset, maxDpr, u, ub } from '../../ui/scale';
import { Icon } from '../../ui/Icons';
import { FitFov } from '../../three/FitFov';
import { GUEST_ICON, GUEST_NAMES, type GuestId } from './facts';
import {
  CHALLENGE_DONE_LINE, HAPPY_LINES, ITEMS, ORDERS, SCOOPS, checkPlate, checkSundae, itemById, scoopById, wrongLine,
  type ItemId, type Scoop,
} from './logic';
import { faceUrl } from './models';
import { SKY, WOODS_CSS, hudButton } from './ui';

function GuestFace({ id }: { id: GuestId }) {
  const [bad, setBad] = useState(false);
  const icon = GUEST_ICON[id];
  return (
    <div style={{ width: u(132), height: u(132), borderRadius: u(66), background: '#fff', border: `${u(5)} solid ${palette.navy}`, boxShadow: `0 ${u(6)} 0 ${palette.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }}>
      {icon || bad ? (icon ? <Icon id={icon} size={f(96)} /> : <span style={{ fontSize: f(70) }}>{GUEST_NAMES[id][0]}</span>) : <img src={faceUrl(id)} alt={GUEST_NAMES[id]} width={120} height={120} style={{ objectFit: 'cover' }} onError={() => setBad(true)} />}
    </div>
  );
}

const BG = `radial-gradient(circle at 20% 15%, rgba(255,255,255,.7), transparent 40%), ${SKY}`;

export function Challenge() {
  const setScreen = useUi((s) => s.setScreen);
  const [idx, setIdx] = useState(0);
  const [plate, setPlate] = useState<ItemId[]>([]);
  const [scoops, setScoops] = useState<Scoop[]>([]);
  const [cherry, setCherry] = useState(false);
  const [reaction, setReaction] = useState<{ text: string; good: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState(false);
  const [locked, setLocked] = useState(false);
  const [born, setBorn] = useState<number[]>([]);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const order = ORDERS[Math.min(idx, ORDERS.length - 1)];
  const guest = order.guest as GuestId;

  useEffect(() => {
    if (done) return;
    void say(order.line, { speaker: guest });
  }, [idx, done, order.line, guest]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setScreen({ kind: 'hub' }), 4500);
    return () => clearTimeout(t);
  }, [done, setScreen]);

  const reset = () => { setPlate([]); setBorn([]); setScoops([]); setCherry(false); };

  const serve = () => {
    if (locked) return;
    const ok = order.kind === 'plate' ? checkPlate(order.items, plate) : checkSundae(order, { scoops, cherry });
    if (!ok) {
      sfx('oops');
      const text = wrongLine(attempt);
      setAttempt((a) => a + 1);
      setReaction({ text, good: false });
      void say(text, { speaker: guest });
      const at = performance.now();
      setLeaving({ items: plate, scoops, cherry, at });
      window.setTimeout(() => setLeaving((l) => (l && l.at === at ? null : l)), 1200);
      reset();
      return;
    }
    sfx('fanfare');
    const text = HAPPY_LINES[idx % HAPPY_LINES.length];
    setReaction({ text, good: true });
    void say(text, { speaker: guest });
    emit('sparkle', [2.4, 2.2, -2.6], 30);
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      setReaction(null);
      reset();
      setAttempt(0);
      if (idx + 1 >= ORDERS.length) {
        useCoupons.getState().markChallengeComplete('woods');
        sfx('fanfare');
        void say(CHALLENGE_DONE_LINE, { speaker: 'narrator' });
        setDone(true);
      } else {
        setIdx(idx + 1);
      }
    }, 1500);
  };

  const addItem = (id: ItemId) => {
    if (locked || plate.length >= 5) return;
    sfx('pop');
    setPlate((p) => [...p, id]);
    setBorn((b) => [...b, performance.now()]);
  };
  const addScoop = (s: Scoop) => {
    if (locked || scoops.length >= 3) return;
    sfx('pop');
    markBorn(scoops.length);
    setScoops((p) => [...p, s]);
  };

  if (done) {
    return (
      <div className="screen center-col" data-testid="challenge-done" style={{ background: BG }}>
        <style>{WOODS_CSS}</style>
        <div style={{ animation: 'woods-bounce 1s ease-in-out infinite' }}><Icon id="treasure-chest" size={f(120)} /></div>
        <div style={{ background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(40), boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: `${u(20)} ${u(36)}`, fontSize: f(40), fontWeight: 900, maxWidth: u(800), color: palette.navy }}>
          {CHALLENGE_DONE_LINE}
        </div>
        <Button testId="to-island" tone="mint" big onClick={() => setScreen({ kind: 'hub' })}>To the island!</Button>
      </div>
    );
  }

  return (
    <div className="screen" data-testid="challenge-screen-woods" style={{ background: BG, overflow: 'hidden' }}>
      <style>{WOODS_CSS}</style>
      <Canvas dpr={[1, maxDpr()]} camera={{ position: [0, 3.6, 6.2], fov: 45, near: 0.1, far: 80 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <FitFov base={45} />
        <OrdersScene guest={guest} kind={order.kind} items={plate} born={born} scoops={scoops} cherry={cherry} leaving={leaving} good={!!reaction?.good} />
      </Canvas>
      <div style={{ position: 'absolute', top: inset('top', 14), left: inset('left', 18), zIndex: 20, background: palette.cream, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(5)} 0 ${palette.navy}`, padding: `${u(8)} ${u(22)}`, fontSize: f(28), fontWeight: 900, minHeight: u(64), display: 'flex', alignItems: 'center' }} data-testid="order-progress">
        Order {idx + 1} of {ORDERS.length}
      </div>
      <div style={{ position: 'absolute', top: inset('top', 14), right: inset('right', 18), zIndex: 20 }}>
        <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
      </div>

      {/* guest + order */}
      <div style={{ position: 'absolute', top: inset('top', 92), left: inset('left', 24), right: inset('right', 24), zIndex: 10, display: 'flex', gap: u(20), alignItems: 'center' }}>
        <GuestFace id={guest} />
        <div data-testid="order-bubble" style={{ background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: `${u(12)} ${u(24)}`, color: palette.navy, flex: 1, maxWidth: u(700) }}>
          <div style={{ fontSize: f(20), fontWeight: 900, color: '#E6007A', textTransform: 'uppercase' }}>{GUEST_NAMES[guest]} orders</div>
          <div data-testid="order-text" style={{ fontSize: f(30), fontWeight: 800, lineHeight: 1.2 }}>{order.line}</div>
          <div data-testid="order-pictogram" style={{ display: 'flex', gap: u(10), alignItems: 'center', marginTop: u(8), flexWrap: 'wrap' }}>
            {order.kind === 'plate'
              ? order.items.map((id, i) => <Icon key={i} id={itemById(id).icon} size={f(56)} />)
              : (
                <>
                  {order.scoops.map((s, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: u(6), fontSize: f(24), fontWeight: 800 }}><span style={{ width: u(44), height: u(44), borderRadius: u(22), background: scoopById(s).color, border: `${u(3)} solid ${palette.navy}` }} />{i + 1}</span>)}
                  <Icon id="cherry" size={f(52)} />
                </>
              )}
          </div>
        </div>
        {reaction && (
          <div data-testid="order-reaction" key={reaction.text + attempt} style={{ position: 'absolute', left: u(170), top: u(232), background: reaction.good ? '#C9F7D0' : '#FFE3EC', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(32), boxShadow: `0 ${u(6)} 0 ${palette.navy}`, padding: `${u(10)} ${u(24)}`, fontSize: f(30), fontWeight: 900, maxWidth: u(340), color: palette.navy, animation: 'woods-bubble .25s ease-out' }}>
            {reaction.text}
          </div>
        )}
      </div>

      {/* tray + buttons */}
      <div style={{ position: 'absolute', left: inset('left', 14), right: inset('right', 14), bottom: inset('bottom', 18), zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: u(14) }}>
        <Button testId="clear-plate" tone="cream" onClick={() => { sfx('tap'); reset(); }}>Start over</Button>
        <div style={{ display: 'flex', gap: u(10), alignItems: 'flex-end', background: 'rgba(255,255,255,0.7)', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(32), padding: `${u(10)} ${u(14)}` }}>
          {order.kind === 'plate'
            ? ITEMS.map((it) => (
              <button key={it.id} type="button" data-testid={`item-${it.id}`} aria-label={it.label} onClick={() => addItem(it.id)} style={{ ...hudButton('#FFF4E0'), width: ub(84), height: ub(96), borderRadius: u(24), flexDirection: 'column', fontSize: f(42), gap: u(0) }}>
                <Icon id={it.icon} size={f(50)} />
                <span className="phone-hide" style={{ fontSize: f(13), fontWeight: 800 }}>{it.label.replace('Strawberry ', '')}</span>
              </button>
            ))
            : (
              <>
                {SCOOPS.map((s) => (
                  <button key={s.id} type="button" data-testid={`scoop-${s.id}`} aria-label={`${s.label} scoop`} onClick={() => addScoop(s.id)} disabled={scoops.length >= 3} style={{ ...hudButton('#FFF4E0'), width: ub(96), height: ub(96), borderRadius: u(24), flexDirection: 'column', gap: u(2), opacity: scoops.length >= 3 ? 0.5 : 1 }}>
                    <span style={{ width: u(46), height: u(46), borderRadius: u(23), background: s.color, border: `${u(3)} solid ${palette.navy}` }} />
                    <span className="phone-hide" style={{ fontSize: f(15), fontWeight: 800 }}>{s.label}</span>
                  </button>
                ))}
                <button type="button" data-testid="cherry-btn" aria-label="Cherry on top" onClick={() => { sfx('pop'); markBorn(10); setCherry(true); }} disabled={cherry} style={{ ...hudButton('#FFE3EC'), width: ub(96), height: ub(96), borderRadius: u(24), flexDirection: 'column', fontSize: f(44), opacity: cherry ? 0.5 : 1 }}>
                  <Icon id="cherry" size={f(48)} /><span className="phone-hide" style={{ fontSize: f(15) }}>Cherry</span>
                </button>
              </>
            )}
        </div>
        <Button testId="serve-btn" tone="mint" big onClick={serve}>Serve!</Button>
      </div>
    </div>
  );
}
