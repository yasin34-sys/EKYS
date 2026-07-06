import type { Clock } from './Clock';

export const systemClock: Clock = () => new Date().toISOString();
