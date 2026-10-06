import { registerAutoPlay } from '../../test/hooks';
import { autoPlayScience } from './autoplay';

export { Zone } from './Zone';
export { Challenge } from './Challenge';

registerAutoPlay('science', autoPlayScience);
