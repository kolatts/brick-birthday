import { ZonePlaceholder } from '../../screens/ZonePlaceholder';
import { registerAutoPlay } from '../../test/hooks';

// STUB: replaced by the real zone implementation.
export function Zone() { return ZonePlaceholder({ zone: 'woods' }); }
export function Challenge() { return ZonePlaceholder({ zone: 'woods', challenge: true }); }
registerAutoPlay('woods', () => {});
