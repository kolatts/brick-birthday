import { registerAutoPlay } from '../../test/hooks';
import { autoPlayWoods } from './autoplay';

export { Zone } from './WhisperingWoods';
export { Challenge } from './TeaPartyOrders';

registerAutoPlay('woods', autoPlayWoods);
