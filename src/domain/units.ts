/**
 * Unit conversion domain utilities — kg/lb, cm/in, distance, and formatting.
 *
 * All weights in the database are stored in kilograms (kg) and lengths in centimeters (cm).
 * These pure functions handle conversion to/from user-facing display units.
 */

export const KG_TO_LB = 2.20462262185;
export const LB_TO_KG = 1 / KG_TO_LB;
export const CM_TO_IN = 0.3937007874;
export const IN_TO_CM = 2.54;
export const KM_TO_MI = 0.621371192;
export const MI_TO_KM = 1 / KM_TO_MI;

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type DistanceUnit = 'km' | 'mi';

/** Convert kilograms to pounds */
export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

/** Convert pounds to kilograms */
export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

/** Convert centimeters to inches */
export function cmToIn(cm: number): number {
  return cm * CM_TO_IN;
}

/** Convert inches to centimeters */
export function inToCm(inches: number): number {
  return inches * IN_TO_CM;
}

/** Convert meters to kilometers or miles */
export function metersToDistance(meters: number, unit: DistanceUnit): number {
  const km = meters / 1000;
  return unit === 'mi' ? km * KM_TO_MI : km;
}

/** Round a number to the nearest step (e.g., 0.5, 2.5, 1) */
export function roundToStep(value: number, step: number = 0.5): number {
  if (step <= 0) return value;
  const factor = 1 / step;
  return Math.round(value * factor) / factor;
}

/** Convert stored kg to display unit, optionally rounded */
export function toDisplayWeight(weightKg: number, unit: WeightUnit, step?: number): number {
  const converted = unit === 'lb' ? kgToLb(weightKg) : weightKg;
  return step ? roundToStep(converted, step) : converted;
}

/** Convert user-input weight in display unit to stored kg */
export function toDatabaseWeight(inputWeight: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(inputWeight) : inputWeight;
}

/** Format weight for UI display with unit label */
export function formatWeight(
  weightKg: number | null | undefined,
  unit: WeightUnit = 'kg',
  options: { includeUnit?: boolean; decimals?: number } = {},
): string {
  const { includeUnit = true, decimals } = options;
  if (weightKg == null || isNaN(weightKg)) return includeUnit ? `- ${unit}` : '-';

  const displayVal = unit === 'lb' ? kgToLb(weightKg) : weightKg;

  let formatted: string;
  if (decimals !== undefined) {
    formatted = displayVal.toFixed(decimals);
  } else {
    formatted = Number(displayVal.toFixed(2)).toString();
  }

  return includeUnit ? `${formatted} ${unit}` : formatted;
}

/** Format duration in seconds to MM:SS or HH:MM:SS */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00';

  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

/** Parse duration string like "1:30" or "90" into seconds */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => parseInt(p, 10));
    if (parts.some(isNaN)) return null;

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  const secs = parseFloat(trimmed);
  return isNaN(secs) ? null : secs;
}
