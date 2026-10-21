/**
 * UUID generation utilities.
 *
 * Uses expo-crypto for cryptographically secure UUIDs on-device.
 * Built-in exercises use deterministic IDs derived from their slug
 * so they remain stable across seed updates.
 */

import * as Crypto from 'expo-crypto';

/** Generate a random UUID v4 using expo-crypto. */
export function generateId(): string {
  return Crypto.randomUUID();
}

/**
 * Generate a deterministic UUID v5-like ID from a slug.
 * Used for built-in exercises so their IDs remain stable.
 *
 * This creates a consistent hash-based ID using the namespace
 * "ironlog:exercise:" + slug, producing the same ID every time
 * for the same slug.
 */
export function deterministicId(slug: string): string {
  // Simple deterministic approach: create a UUID-shaped string from slug hash.
  // We use a basic FNV-1a hash spread across UUID fields.
  const namespace = 'ironlog:exercise:' + slug;
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;

  for (let i = 0; i < namespace.length; i++) {
    const c = namespace.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x01000193);
  }

  // Spread the hash across 32 hex characters
  const hex =
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0') +
    ((h1 + h2) >>> 0).toString(16).padStart(8, '0');

  // Format as UUID: 8-4-4-4-12
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '5' + hex.slice(13, 16), // version 5
    '8' + hex.slice(17, 20), // variant
    hex.slice(20, 32),
  ].join('-');
}

/** Get the current ISO-8601 timestamp. */
export function now(): string {
  return new Date().toISOString();
}
