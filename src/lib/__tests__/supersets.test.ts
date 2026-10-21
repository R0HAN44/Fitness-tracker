import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getNextSupersetLabel,
  groupExercisesForDisplay,
  type SupersetExerciseItem,
  type SupersetGroupData,
} from '../../domain/supersets';

describe('Superset Grouping & Labels', () => {
  it('generates sequential alphabetical labels', () => {
    assert.strictEqual(getNextSupersetLabel([]), 'A');
    assert.strictEqual(getNextSupersetLabel(['A']), 'B');
    assert.strictEqual(getNextSupersetLabel(['A', 'B']), 'C');
    assert.strictEqual(getNextSupersetLabel(['A', 'C']), 'B'); // fills gap
  });

  it('correctly groups paired exercises into a single superset block', () => {
    const exercises: SupersetExerciseItem[] = [
      { id: 'we-1', supersetGroupId: 'group-1', sortOrder: 1 },
      { id: 'we-2', supersetGroupId: 'group-1', sortOrder: 2 },
      { id: 'we-3', supersetGroupId: null, sortOrder: 3 },
      { id: 'we-4', supersetGroupId: 'group-2', sortOrder: 4 },
      { id: 'we-5', supersetGroupId: 'group-2', sortOrder: 5 },
    ];

    const groups: SupersetGroupData[] = [
      { id: 'group-1', label: 'A' },
      { id: 'group-2', label: 'B' },
    ];

    const displayGroups = groupExercisesForDisplay(exercises, groups);

    assert.strictEqual(displayGroups.length, 3);

    // Group 1: Superset A (2 exercises)
    assert.strictEqual(displayGroups[0].isSuperset, true);
    assert.strictEqual(displayGroups[0].label, 'A');
    assert.strictEqual(displayGroups[0].items.length, 2);
    assert.strictEqual(displayGroups[0].items[0].id, 'we-1');
    assert.strictEqual(displayGroups[0].items[1].id, 'we-2');

    // Item 2: Standalone
    assert.strictEqual(displayGroups[1].isSuperset, false);
    assert.strictEqual(displayGroups[1].label, null);
    assert.strictEqual(displayGroups[1].items.length, 1);
    assert.strictEqual(displayGroups[1].items[0].id, 'we-3');

    // Group 3: Superset B (2 exercises)
    assert.strictEqual(displayGroups[2].isSuperset, true);
    assert.strictEqual(displayGroups[2].label, 'B');
    assert.strictEqual(displayGroups[2].items.length, 2);
    assert.strictEqual(displayGroups[2].items[0].id, 'we-4');
    assert.strictEqual(displayGroups[2].items[1].id, 'we-5');
  });

  it('handles empty lists and standalone-only lists gracefully', () => {
    assert.strictEqual(groupExercisesForDisplay([]).length, 0);

    const standalones: SupersetExerciseItem[] = [
      { id: 'e1', supersetGroupId: null, sortOrder: 1 },
      { id: 'e2', supersetGroupId: null, sortOrder: 2 },
    ];

    const result = groupExercisesForDisplay(standalones);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].isSuperset, false);
    assert.strictEqual(result[1].isSuperset, false);
  });
});
