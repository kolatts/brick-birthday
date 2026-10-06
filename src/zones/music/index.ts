import { registerAutoPlay } from '../../test/hooks';
import { completeBand } from './musicState';

export { Zone } from './MusicStage';
export { Challenge } from './Challenge';

/** Test auto-play: plays all four instruments (earns the brick; the celebration shows if the stage is open). */
registerAutoPlay('music', completeBand);
