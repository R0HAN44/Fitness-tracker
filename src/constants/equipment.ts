/**
 * Equipment constants used across exercises and filters.
 */

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'kettlebell',
  'other',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

/** Human-readable labels for equipment types. */
export const equipmentLabels: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  band: 'Band',
  kettlebell: 'Kettlebell',
  other: 'Other',
};
