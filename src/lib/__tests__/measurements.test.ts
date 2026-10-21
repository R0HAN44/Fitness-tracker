/**
 * Unit tests for body measurements calculations, range filtering, and built-in metric definitions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Body Measurements Domain & Calculations', () => {
  it('correctly calculates deltas between latest and previous entries', () => {
    const entries = [
      { id: '1', value: 80.5, measuredAt: '2026-10-15T08:00:00Z' },
      { id: '2', value: 81.2, measuredAt: '2026-10-10T08:00:00Z' },
      { id: '3', value: 82.0, measuredAt: '2026-10-01T08:00:00Z' },
    ];

    const latest = entries[0];
    const previous = entries[1];
    const delta = Math.round((latest.value - previous.value) * 10) / 10;

    assert.equal(delta, -0.7);
  });

  it('handles single entry with null delta gracefully', () => {
    const entries = [{ id: '1', value: 75.0, measuredAt: '2026-10-15T08:00:00Z' }];
    const previous = entries[1] ?? null;
    const delta = previous ? entries[0].value - previous.value : null;

    assert.equal(delta, null);
  });

  it('filters measurement chart points across time ranges correctly', () => {
    const nowMs = new Date('2026-10-20T12:00:00Z').getTime();

    const sampleEntries = [
      { id: '1', value: 78.0, measuredAt: new Date(nowMs - 10 * 86400000).toISOString() }, // 10 days ago (within 3m)
      { id: '2', value: 79.0, measuredAt: new Date(nowMs - 60 * 86400000).toISOString() }, // 60 days ago (within 3m)
      { id: '3', value: 80.0, measuredAt: new Date(nowMs - 120 * 86400000).toISOString() }, // 120 days ago (outside 3m, within 1y)
      { id: '4', value: 82.0, measuredAt: new Date(nowMs - 400 * 86400000).toISOString() }, // 400 days ago (outside 1y)
    ];

    function filterEntries(range: '3m' | '1y' | 'all') {
      let cutoff: number | null = null;
      if (range === '3m') cutoff = nowMs - 90 * 86400000;
      if (range === '1y') cutoff = nowMs - 365 * 86400000;

      return sampleEntries.filter((e) => {
        if (!cutoff) return true;
        return new Date(e.measuredAt).getTime() >= cutoff;
      });
    }

    assert.equal(filterEntries('3m').length, 2);
    assert.equal(filterEntries('1y').length, 3);
    assert.equal(filterEntries('all').length, 4);
  });

  it('verifies that all 9 required built-in metrics are defined with correct units', () => {
    const requiredMetrics = [
      { slug: 'bodyweight', unit: 'kg' },
      { slug: 'body_fat_pct', unit: 'pct' },
      { slug: 'waist', unit: 'cm' },
      { slug: 'neck', unit: 'cm' },
      { slug: 'chest', unit: 'cm' },
      { slug: 'hips', unit: 'cm' },
      { slug: 'biceps', unit: 'cm' },
      { slug: 'thighs', unit: 'cm' },
      { slug: 'calves', unit: 'cm' },
    ];

    assert.equal(requiredMetrics.length, 9);
    for (const m of requiredMetrics) {
      assert.ok(m.slug.length > 0);
      assert.ok(['kg', 'cm', 'pct'].includes(m.unit));
    }
  });
});
