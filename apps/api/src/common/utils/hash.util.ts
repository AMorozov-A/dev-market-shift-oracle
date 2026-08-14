import { createHash } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(value);
}
