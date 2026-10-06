import { registerAutoPlay } from '../../test/hooks';
import { autoPlayTennis } from './autoplay';
import { nextArrivalMs, getSim } from './game';
import { stepSim, tapSim } from './logic';

export { Zone } from './TennisCourt';
export { Challenge } from './SuperRally';

registerAutoPlay('tennis', autoPlayTennis);

/** Test hook: window.__game.tennis.nextArrivalMs() reports when the ball reaches Luna (only under ?test=1). */
if (typeof window !== 'undefined' && new URLSearchParams(location.search).get('test') === '1') {
  const hooks = { nextArrivalMs, step: (dt: number) => stepSim(getSim(), dt), tap: () => tapSim(getSim()) };
  const attach = () => {
    const g = window.__game as (typeof window.__game & { tennis?: typeof hooks }) | undefined;
    if (g) g.tennis = hooks;
  };
  attach();
  setTimeout(attach, 0);
}
