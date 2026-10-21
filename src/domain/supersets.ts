/**
 * Superset domain logic — managing paired/grouped exercises in workouts & routines.
 *
 * Supersets allow 2 or more exercises to be performed back-to-back with visual grouping
 * and labels (A, B, C...).
 */

export interface SupersetGroupData {
  id: string;
  label?: string | null;
}

export interface SupersetExerciseItem {
  id: string;
  supersetGroupId?: string | null;
  sortOrder: number;
}

/**
 * Determine the next alphabetical superset label: A, B, C, ... Z, AA, AB...
 */
export function getNextSupersetLabel(existingLabels: (string | null | undefined)[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const cleanLabels = new Set(existingLabels.filter(Boolean));

  for (let i = 0; i < 26; i++) {
    const candidate = letters[i];
    if (!cleanLabels.has(candidate)) {
      return candidate;
    }
  }

  // Fallback for > 26 superset groups in one session
  return `S${cleanLabels.size + 1}`;
}

/**
 * Group a sequence of exercises into supersets and standalone exercises for UI display.
 */
export function groupExercisesForDisplay<T extends SupersetExerciseItem>(
  exercises: T[],
  groups: SupersetGroupData[] = [],
): Array<{
  isSuperset: boolean;
  groupId: string | null;
  label: string | null;
  items: T[];
}> {
  const groupMap = new Map<string, SupersetGroupData>();
  groups.forEach((g) => groupMap.set(g.id, g));

  const result: Array<{
    isSuperset: boolean;
    groupId: string | null;
    label: string | null;
    items: T[];
  }> = [];

  const processed = new Set<string>();

  for (const item of exercises) {
    if (processed.has(item.id)) continue;

    if (item.supersetGroupId) {
      const gId = item.supersetGroupId;
      const groupInfo = groupMap.get(gId);
      const itemsInGroup = exercises.filter((e) => e.supersetGroupId === gId);

      itemsInGroup.forEach((e) => processed.add(e.id));

      result.push({
        isSuperset: true,
        groupId: gId,
        label: groupInfo?.label ?? 'A',
        items: itemsInGroup,
      });
    } else {
      processed.add(item.id);
      result.push({
        isSuperset: false,
        groupId: null,
        label: null,
        items: [item],
      });
    }
  }

  return result;
}
