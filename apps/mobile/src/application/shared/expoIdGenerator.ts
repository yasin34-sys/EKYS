import * as Crypto from 'expo-crypto';
import type { IdGenerator } from './IdGenerator';

export const expoIdGenerator: IdGenerator = () => Crypto.randomUUID();
