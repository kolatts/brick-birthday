import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrdersScene, markBorn, type Leaving } from './OrdersScene';
import { emit } from './fx';
import { useUi } from '../../state/ui';
import { useCoupons } from '../../state/coupons';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { GUEST_EMOJI, GUEST_NAMES, type GuestId } from './facts';
import {
  CHALLENGE_DONE_LINE, HAPPY_LINES, ITEMS, ORDERS, SCOOPS, checkPlate, checkSundae, itemById, scoopById, wrongLine,
  type ItemId, type Scoop,
} from './logic';
import { faceUrl } from './models';
import { SKY, WOODS_CSS, hudButton } from './ui';

function GuestFace({ id }: { id: GuestId }) {
  const [bad, setBad] = useState(false);
  const emoji = GUEST_EMOJI[id];
  return (
    <div style={{ width: 132, height: 132, borderRadius: 66, background: '#fff', border: `5px solid ${palette.navy}`, boxShadow: `0 6px 0 ${palette.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: '0 0 auto' }}>
      {emoji || bad ? <span style={{ fontSize: 70 }}>{emoji ?? GUEST_NAMES[id][0]}</span> : <img src={faceUrl(id)} alt={GUEST_NAMES[id]} width={120} height={120} style={{ objectFit: 'cover' }} onError={() => setBad(true)} />}
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
        <div style={{ fontSize: 84, animation: 'woods-bounce 1s ease-in-out infinite' }}>🧰</div>
        <div style={{ background: '#fff', border: `5px solid ${palette.navy}`, borderRadius: 40, boxShadow: `0 8px 0 ${palette.navy}`, padding: '20px 36px', fontSize: 40, fontWeight: 900, maxWidth: 800, color: palette.navy }}>
          {CHALLENGE_DONE_LINE}
        </div>
        <Button testId="to-island" tone="mint" big onClick={() => setScreen({ kind: 'hub' })}>To the island!</Button>
      </div>
    );
  }

  return (
    <div className="screen" data-testid="challenge-screen-woods" style={{ background: BG, overflow: 'hidden' }}>
      <style>{WOODS_CSS}</style>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 3.6, 6.2], fov: 45, near: 0.1, far: 80 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <OrdersScene guest={guest} kind={order.kind} items={plate} born={born} scoops={scoops} cherry={cherry} leaving={leaving} good={!!reaction?.good} />
      </Canvas>
      <div style={{ position: 'absolute', top: 14, left: 18, zIndex: 20, background: palette.cream, border: `4px solid ${palette.navy}`, borderRadius: 28, boxShadow: `0 5px 0 ${palette.navy}`, padding: '8px 22px', fontSize: 28, fontWeight: 900, minHeight: 64, display: 'flex', alignItems: 'center' }} data-testid="order-progress">
        Order {idx + 1} of {ORDERS.length}
      </div>
      <div style={{ position: 'absolute', top: 14, right: 18, zIndex: 20 }}>
        <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
      </div>

      {/* guest + order */}
      <div style={{ position: 'absolute', top: 92, left: 24, right: 24, zIndex: 10, display: 'flex', gap: 20, alignItems: 'center' }}>
        <GuestFace id={guest} />
        <div data-testid="order-bubble" style={{ background: '#fff', border: `5px solid ${palette.navy}`, borderRadius: 36, boxShadow: `0 8px 0 ${palette.navy}`, padding: '12px 24px', color: palette.navy, flex: 1, maxWidth: 700 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#E6007A', textTransform: 'uppercase' }}>{GUEST_NAMES[guest]} orders</div>
          <div data-testid="order-text" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.2 }}>{order.line}</div>
          <div data-testid="order-pictogram" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {order.kind === 'plate'
              ? order.items.map((id, i) => <span key={i} title={itemById(id).label} style={{ fontSize: 52, lineHeight: 1 }}>{itemById(id).emoji}</span>)
              : (
                <>
                  {order.scoops.map((s, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 24, fontWeight: 800 }}><span style={{ width: 44, height: 44, borderRadius: 22, background: scoopById(s).color, border: `3px solid ${palette.navy}` }} />{i + 1}</span>)}
                  <span style={{ fontSize: 48 }}>🍒</span>
                </>
              )}
          </div>
        </div>
        {reaction && (
          <div data-testid="order-reaction" key={reaction.text + attempt} style={{ position: 'absolute', left: 170, top: 232, background: reaction.good ? '#C9F7D0' : '#FFE3EC', border: `5px solid ${palette.navy}`, borderRadius: 32, boxShadow: `0 6px 0 ${palette.navy}`, padding: '10px 24px', fontSize: 30, fontWeight: 900, maxWidth: 340, color: palette.navy, animation: 'woods-bubble .25s ease-out' }}>
            {reaction.text}
          </div>
        )}
      </div>

      {/* tray + buttons */}
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 18, zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14 }}>
        <Button testId="clear-plate" tone="cream" onClick={() => { sfx('tap'); reset(); }}>Start over</Button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'rgba(255,255,255,0.7)', border: `4px solid ${palette.navy}`, borderRadius: 32, padding: '10px 14px' }}>
          {order.kind === 'plate'
            ? ITEMS.map((it) => (
              <button key={it.id} type="button" data-testid={`item-${it.id}`} aria-label={it.label} onClick={() => addItem(it.id)} style={{ ...hudButton('#FFF4E0'), width: 84, height: 96, borderRadius: 24, flexDirection: 'column', fontSize: 42, gap: 0 }}>
                {it.emoji}
                <span style={{ fontSize: 13, fontWeight: 800 }}>{it.label}</span>
              </button>
            ))
            : (
              <>
                {SCOOPS.map((s) => (
                  <button key={s.id} type="button" data-testid={`scoop-${s.id}`} aria-label={`${s.label} scoop`} onClick={() => addScoop(s.id)} disabled={scoops.length >= 3} style={{ ...hudButton('#FFF4E0'), width: 96, height: 96, borderRadius: 24, flexDirection: 'column', gap: 2, opacity: scoops.length >= 3 ? 0.5 : 1 }}>
                    <span style={{ width: 46, height: 46, borderRadius: 23, background: s.color, border: `3px solid ${palette.navy}` }} />
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{s.label}</span>
                  </button>
                ))}
                <button type="button" data-testid="cherry-btn" aria-label="Cherry on top" onClick={() => { sfx('pop'); markBorn(10); setCherry(true); }} disabled={cherry} style={{ ...hudButton('#FFE3EC'), width: 96, height: 96, borderRadius: 24, flexDirection: 'column', fontSize: 44, opacity: cherry ? 0.5 : 1 }}>
                  🍒<span style={{ fontSize: 15 }}>Cherry</span>
                </button>
              </>
            )}
        </div>
        <Button testId="serve-btn" tone="mint" big onClick={serve}>Serve!</Button>
      </div>
    </div>
  );
}
