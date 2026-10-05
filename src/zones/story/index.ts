import { ZonePlaceholder } from '../../screens/ZonePlaceholder';
import { registerAutoPlay } from '../../test/hooks';

// STUB: replaced by the real zone implementation.
export function Zone() { return ZonePlaceholder({ zone: 'story' }); }
export function Challenge() { return ZonePlaceholder({ zone: 'story', challenge: true }); }
registerAutoPlay('story', () => {});
