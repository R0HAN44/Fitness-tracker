/**
 * Data Portability Domain — backup JSON validation, CSV generation,
 * Hevy & Strong CSV parsing, and routine share format.
 */

export const IRONLOG_BACKUP_SCHEMA_VERSION = 1;

export interface BackupMetadata {
  workoutsCount: number;
  routinesCount: number;
  measurementsCount: number;
  appVersion: string;
}

export interface BackupWorkoutExerciseSet {
  id: string;
  setIndex: number;
  setType: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rpe: number | null;
  isCompleted: boolean;
}

export interface BackupWorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseSlug?: string;
  exerciseName?: string;
  sortOrder: number;
  notes: string | null;
  sets: BackupWorkoutExerciseSet[];
}

export interface BackupWorkout {
  id: string;
  title: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  totalVolumeKg: number | null;
  status: string;
  routineId: string | null;
  importSource: string | null;
  importHash: string | null;
  exercises: BackupWorkoutExercise[];
}

export interface BackupRoutineSet {
  id: string;
  setIndex: number;
  setType: string;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetRpe: number | null;
}

export interface BackupRoutineExercise {
  id: string;
  exerciseId: string;
  exerciseSlug?: string;
  exerciseName?: string;
  sortOrder: number;
  restSeconds: number | null;
  notes: string | null;
  sets: BackupRoutineSet[];
}

export interface BackupRoutine {
  id: string;
  name: string;
  notes: string | null;
  folderId: string | null;
  sortOrder: number | null;
  isPreset: boolean;
  exercises: BackupRoutineExercise[];
}

export interface BackupMeasurementEntry {
  id: string;
  value: number;
  measuredAt: string;
  notes: string | null;
}

export interface BackupMeasurement {
  id: string;
  name: string;
  unit: string;
  isBuiltin: boolean;
  sortOrder?: number | null;
  entries: BackupMeasurementEntry[];
}

export interface BackupCustomExercise {
  id: string;
  slug: string;
  name: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  exerciseType: string;
}

export interface IronlogBackupData {
  schemaVersion: number;
  app: 'ironlog';
  exportedAt: string;
  metadata: BackupMetadata;
  workouts: BackupWorkout[];
  routines: BackupRoutine[];
  measurements: BackupMeasurement[];
  customExercises: BackupCustomExercise[];
  settings?: Record<string, any>;
}

export interface SharedRoutineJSON {
  schemaVersion: number;
  type: 'ironlog_routine';
  title: string;
  notes: string | null;
  exercises: Array<{
    exerciseName: string;
    exerciseSlug?: string;
    primaryMuscle?: string;
    equipment?: string;
    exerciseType?: string;
    sortOrder: number;
    notes?: string | null;
    sets: Array<{
      setIndex: number;
      setType: string;
      targetWeightKg?: number | null;
      targetReps?: number | null;
      targetRpe?: number | null;
      restSeconds?: number | null;
    }>;
  }>;
}

/**
 * Validate an Ironlog backup JSON string.
 */
export function validateBackupJSON(jsonStr: string): {
  valid: boolean;
  data?: IronlogBackupData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Backup file is not a valid JSON object.' };
    }

    if (parsed.app !== 'ironlog') {
      return { valid: false, error: 'File is not an Ironlog backup.' };
    }

    if (typeof parsed.schemaVersion !== 'number') {
      return { valid: false, error: 'Missing backup schema version.' };
    }

    if (parsed.schemaVersion > IRONLOG_BACKUP_SCHEMA_VERSION) {
      return {
        valid: false,
        error: `Backup schema version (${parsed.schemaVersion}) is newer than this app version (${IRONLOG_BACKUP_SCHEMA_VERSION}). Please update Ironlog.`,
      };
    }

    if (!Array.isArray(parsed.workouts) || !Array.isArray(parsed.routines)) {
      return { valid: false, error: 'Missing workouts or routines collection.' };
    }

    return { valid: true, data: parsed as IronlogBackupData };
  } catch (err: any) {
    return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}

/**
 * Validate a shared routine JSON string.
 */
export function validateSharedRoutineJSON(jsonStr: string): {
  valid: boolean;
  data?: SharedRoutineJSON;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Routine data is not a valid JSON object.' };
    }

    if (parsed.type !== 'ironlog_routine' || typeof parsed.title !== 'string') {
      return { valid: false, error: 'Not a valid Ironlog shared routine.' };
    }

    if (!Array.isArray(parsed.exercises)) {
      return { valid: false, error: 'Routine has no exercises array.' };
    }

    return { valid: true, data: parsed as SharedRoutineJSON };
  } catch (err: any) {
    return { valid: false, error: `Invalid routine format: ${err.message}` };
  }
}

/**
 * Standard CSV quote and comma escaping.
 */
export function escapeCsvCell(val: any): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate standard readable CSV export of completed workouts.
 */
export function generateWorkoutsCSV(
  workoutsList: Array<{
    startedAt: string;
    title: string | null;
    durationSeconds: number | null;
    workoutNotes: string | null;
    exerciseName: string;
    setOrder: number;
    setType: string;
    weightKg: number | null;
    reps: number | null;
    distanceMeters: number | null;
    setDurationSeconds: number | null;
    rpe: number | null;
    setNotes: string | null;
  }>,
): string {
  const headers = [
    'Date',
    'Workout Name',
    'Duration (seconds)',
    'Workout Notes',
    'Exercise Name',
    'Set Order',
    'Set Type',
    'Weight (kg)',
    'Reps',
    'Distance (m)',
    'Set Duration (s)',
    'RPE',
    'Set Notes',
  ];

  const rows = [headers.join(',')];

  for (const w of workoutsList) {
    rows.push(
      [
        escapeCsvCell(w.startedAt),
        escapeCsvCell(w.title ?? 'Workout'),
        escapeCsvCell(w.durationSeconds ?? ''),
        escapeCsvCell(w.workoutNotes ?? ''),
        escapeCsvCell(w.exerciseName),
        escapeCsvCell(w.setOrder),
        escapeCsvCell(w.setType),
        escapeCsvCell(w.weightKg ?? ''),
        escapeCsvCell(w.reps ?? ''),
        escapeCsvCell(w.distanceMeters ?? ''),
        escapeCsvCell(w.setDurationSeconds ?? ''),
        escapeCsvCell(w.rpe ?? ''),
        escapeCsvCell(w.setNotes ?? ''),
      ].join(','),
    );
  }

  return rows.join('\n');
}

/**
 * Robust CSV parser that correctly handles escaped quotes, commas, and newlines.
 */
export function parseCSVLines(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export type CsvFormatType = 'hevy' | 'strong' | 'ironlog' | 'unknown';

export interface ParsedCsvSet {
  setOrder: number;
  setType: 'warmup' | 'normal' | 'drop' | 'failure';
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rpe: number | null;
  notes: string | null;
}

export interface ParsedCsvExercise {
  exerciseName: string;
  sets: ParsedCsvSet[];
}

export interface ParsedCsvWorkout {
  title: string;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds?: number | null;
  notes?: string | null;
  importSource: 'hevy_csv' | 'strong_csv' | 'ironlog_csv';
  importHash: string;
  exercises: ParsedCsvExercise[];
}

/**
 * Detect the CSV dialect based on header columns.
 */
export function detectCsvFormat(headerRow: string[]): CsvFormatType {
  const norm = headerRow.map((c) => c.toLowerCase().trim());

  if (norm.some((c) => c.includes('weight unit') || c.includes('exercise title') || c.includes('set order') && norm.includes('hevy'))) {
    return 'hevy';
  }

  if (norm.some((c) => c.includes('workout notes') || c.includes('seconds')) && norm.some((c) => c.includes('exercise name'))) {
    return 'strong';
  }

  if (norm.includes('set order') && norm.includes('exercise name') && norm.includes('workout name')) {
    // If it has "Set Order" and "Weight (kg)"
    if (norm.some((c) => c.includes('weight (kg)'))) {
      return 'ironlog';
    }
    // Default to Hevy if weight unit exists, else Strong
    if (norm.some((c) => c.includes('weight unit'))) {
      return 'hevy';
    }
    return 'strong';
  }

  return 'unknown';
}

/**
 * Parse Hevy or Strong CSV text into structured workouts.
 */
export function parseExternalWorkoutsCSV(csvText: string): {
  format: CsvFormatType;
  workouts: ParsedCsvWorkout[];
  error?: string;
} {
  const rows = parseCSVLines(csvText);
  if (rows.length < 2) {
    return { format: 'unknown', workouts: [], error: 'CSV file contains no data rows.' };
  }

  const header = rows[0];
  const format = detectCsvFormat(header);
  const headerMap: Record<string, number> = {};

  header.forEach((col, idx) => {
    headerMap[col.toLowerCase().trim()] = idx;
  });

  const getCol = (row: string[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headerMap[alias.toLowerCase().trim()];
      if (idx !== undefined && row[idx] !== undefined) {
        return row[idx];
      }
    }
    return '';
  };

  // Group rows by workout: key = date + title
  interface RawGroup {
    dateStr: string;
    title: string;
    durationSeconds: number | null;
    workoutNotes: string | null;
    rows: string[][];
  }

  const groups: Map<string, RawGroup> = new Map();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => c.trim().length === 0)) continue;

    const dateVal = getCol(row, 'date', 'start_time', 'start time');
    const titleVal = getCol(row, 'workout name', 'workout title', 'title') || 'Workout';
    const durationVal = parseFloat(getCol(row, 'duration (seconds)', 'duration', 'seconds')) || null;
    const workoutNotesVal = getCol(row, 'workout notes', 'workout_notes', 'notes') || null;

    if (!dateVal) continue;

    const groupKey = `${dateVal.trim()}_${titleVal.trim()}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        dateStr: dateVal,
        title: titleVal,
        durationSeconds: durationVal,
        workoutNotes: workoutNotesVal,
        rows: [],
      });
    }
    groups.get(groupKey)!.rows.push(row);
  }

  const parsedWorkouts: ParsedCsvWorkout[] = [];

  for (const [groupKey, group] of groups) {
    // Parse Date
    let parsedDate: Date;
    try {
      parsedDate = new Date(group.dateStr);
      if (isNaN(parsedDate.getTime())) {
        // Try parsing DD/MM/YYYY or YYYY-MM-DD HH:mm:ss
        parsedDate = new Date(group.dateStr.replace(' ', 'T'));
      }
    } catch {
      parsedDate = new Date();
    }

    const startedAt = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
    const durationSec = group.durationSeconds ?? 3600;
    const finishedAt = new Date(new Date(startedAt).getTime() + durationSec * 1000).toISOString();

    // Map exercises and sets
    const exerciseMap: Map<string, ParsedCsvSet[]> = new Map();

    for (const r of group.rows) {
      const exName = getCol(r, 'exercise name', 'exercise title', 'exercise');
      if (!exName) continue;

      const parsedOrder = parseInt(getCol(r, 'set order', 'set_order', 'set'), 10);
      const setOrderVal = !isNaN(parsedOrder) ? parsedOrder : (exerciseMap.get(exName)?.length ?? 0);
      const weightVal = parseFloat(getCol(r, 'weight (kg)', 'weight', 'weight_kg'));
      const unitVal = getCol(r, 'weight unit', 'unit').toLowerCase();
      const repsVal = parseInt(getCol(r, 'reps'), 10);
      const setTypeVal = getCol(r, 'set type', 'set_type', 'type').toLowerCase();
      const rpeVal = parseFloat(getCol(r, 'rpe')) || null;
      const distanceVal = parseFloat(getCol(r, 'distance (m)', 'distance', 'distance_meters')) || null;
      const setDurationVal = parseFloat(getCol(r, 'set duration (s)', 'duration', 'seconds')) || null;
      const notesVal = getCol(r, 'set notes', 'notes') || null;

      // Convert lbs to kg if needed
      let finalWeightKg: number | null = isNaN(weightVal) ? null : weightVal;
      if (finalWeightKg !== null && (unitVal.includes('lb') || unitVal === 'lbs')) {
        finalWeightKg = Math.round(finalWeightKg * 0.45359237 * 10) / 10;
      }

      // Normalize set type
      let finalSetType: 'warmup' | 'normal' | 'drop' | 'failure' = 'normal';
      if (setTypeVal.includes('warm') || setTypeVal === 'w') {
        finalSetType = 'warmup';
      } else if (setTypeVal.includes('drop') || setTypeVal === 'd') {
        finalSetType = 'drop';
      } else if (setTypeVal.includes('fail') || setTypeVal === 'f') {
        finalSetType = 'failure';
      }

      if (!exerciseMap.has(exName)) {
        exerciseMap.set(exName, []);
      }

      exerciseMap.get(exName)!.push({
        setOrder: setOrderVal,
        setType: finalSetType,
        weightKg: finalWeightKg,
        reps: isNaN(repsVal) ? null : repsVal,
        durationSeconds: setDurationVal,
        distanceMeters: distanceVal,
        rpe: rpeVal,
        notes: notesVal,
      });
    }

    const exercises: ParsedCsvExercise[] = [];
    let totalSetsInWorkout = 0;

    for (const [exName, sets] of exerciseMap) {
      exercises.push({
        exerciseName: exName,
        sets,
      });
      totalSetsInWorkout += sets.length;
    }

    // Generate unique import hash for duplicate prevention:
    // Simple deterministic string: hash(startedAt + title + totalSets)
    const rawHashInput = `${startedAt}_${group.title}_${totalSetsInWorkout}`;
    let hashVal = 0;
    for (let h = 0; h < rawHashInput.length; h++) {
      hashVal = (hashVal << 5) - hashVal + rawHashInput.charCodeAt(h);
      hashVal |= 0;
    }
    const importHash = `csv_${Math.abs(hashVal).toString(16)}`;

    parsedWorkouts.push({
      title: group.title,
      startedAt,
      finishedAt,
      durationSeconds: durationSec,
      notes: group.workoutNotes,
      importSource: format === 'hevy' ? 'hevy_csv' : format === 'strong' ? 'strong_csv' : 'ironlog_csv',
      importHash,
      exercises,
    });
  }

  return {
    format,
    workouts: parsedWorkouts,
  };
}
