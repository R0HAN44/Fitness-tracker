/**
 * Plate calculator domain logic — calculates plates needed per side of a barbell.
 *
 * Supports configurable barbell weight and available plate denominations.
 * Uses a greedy algorithm to find the closest match.
 */

export interface PlateCount {
  weight: number;
  count: number;
}

export interface PlateCalculationResult {
  targetWeight: number;
  barbellWeight: number;
  platesPerSide: PlateCount[];
  /** Flat array of plate weights on one side, from inner (closest to collar) to outer */
  plateSequence: number[];
  totalWeight: number;
  weightPerSide: number;
  remainingWeight: number;
  isExact: boolean;
}

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const DEFAULT_BARBELL_KG = 20;
export const DEFAULT_BARBELL_LB = 45;

export interface PlateCalculatorOptions {
  barbellWeight?: number;
  availablePlates?: number[];
  /** Optional max pairs available per plate weight (defaults to unlimited) */
  plateLimits?: Record<number, number>;
}

/**
 * Calculate the plates required per side to reach a target weight.
 */
export function calculatePlates(
  targetWeight: number,
  options: PlateCalculatorOptions = {},
): PlateCalculationResult {
  const barbellWeight = options.barbellWeight ?? DEFAULT_BARBELL_KG;
  const availablePlates = [...(options.availablePlates ?? DEFAULT_PLATES_KG)].sort(
    (a, b) => b - a,
  );
  const plateLimits = options.plateLimits ?? {};

  // If target weight is less than or equal to empty barbell
  if (targetWeight <= barbellWeight) {
    return {
      targetWeight,
      barbellWeight,
      platesPerSide: [],
      plateSequence: [],
      totalWeight: barbellWeight,
      weightPerSide: 0,
      remainingWeight: Math.max(0, targetWeight - barbellWeight),
      isExact: targetWeight === barbellWeight,
    };
  }

  const weightNeededTotal = targetWeight - barbellWeight;
  let remainingPerSide = weightNeededTotal / 2;

  const platesPerSide: PlateCount[] = [];
  const plateSequence: number[] = [];

  for (const plate of availablePlates) {
    if (plate <= 0) continue;

    const maxAllowed = plateLimits[plate] ?? Infinity;
    let count = 0;

    // Use epsilon to avoid floating-point inaccuracies
    while (remainingPerSide >= plate - 0.001 && count < maxAllowed) {
      count++;
      remainingPerSide -= plate;
      plateSequence.push(plate);
    }

    if (count > 0) {
      platesPerSide.push({ weight: plate, count });
    }
  }

  const weightPerSide = plateSequence.reduce((sum, p) => sum + p, 0);
  const totalWeight = barbellWeight + weightPerSide * 2;
  const remainingWeight = Math.round((targetWeight - totalWeight) * 100) / 100;
  const isExact = Math.abs(remainingWeight) < 0.01;

  return {
    targetWeight,
    barbellWeight,
    platesPerSide,
    plateSequence,
    totalWeight: Math.round(totalWeight * 100) / 100,
    weightPerSide: Math.round(weightPerSide * 100) / 100,
    remainingWeight,
    isExact,
  };
}
