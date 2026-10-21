/**
 * Date and time formatting utilities.
 */

/**
 * Get a time-of-day based workout title.
 * "Morning Workout", "Afternoon Workout", or "Evening Workout"
 */
export function getDefaultWorkoutTitle(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Morning Workout';
  if (hour < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

/**
 * Format seconds into a human-readable duration string.
 * e.g. 3661 → "1h 1m", 125 → "2m 5s"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format seconds as mm:ss for the rest timer.
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a date as a relative string.
 * "Today", "Yesterday", "2 days ago", etc.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  // Fallback: formatted date
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format a date for display in workout cards.
 * "Mon, Oct 21" or "Mon, Oct 21, 2025"
 */
export function formatWorkoutDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Get current timezone offset in minutes. */
export function getCurrentTzOffset(): number {
  return new Date().getTimezoneOffset() * -1; // JS returns inverted
}
