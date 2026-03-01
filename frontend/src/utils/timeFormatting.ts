/**
 * Time formatting utilities.
 * 
 * IMPORTANT: The backend stores time values in HOURS (as bigint), not minutes.
 * e.g., startMorning=8, endMorning=12 → 4 hours of work.
 * heuresRepas=1 → 1 hour meal break.
 * heuresTrajet=2 → 2 hours travel.
 * 
 * Intervention slots use startHour/startMinute/endHour/endMinute fields separately.
 */

/**
 * Format a duration in hours (number) to "XhMM" format with zero-padded minutes.
 * e.g., 7.5 → "7h30", 8 → "8h00", 0.25 → "0h15", 0 → "0h00", 2.083... → "2h05"
 */
export function formatHours(hours: number): string {
  const absHours = Math.abs(hours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  const sign = hours < 0 ? '-' : '';
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Format a bigint hour value to "XhMM" format with zero-padded minutes.
 * Used for heuresRepas, heuresTrajet, and computed normal/astreinte hours.
 */
export function formatBigIntHours(value: bigint): string {
  return formatHours(Number(value));
}

/**
 * Format an intervention slot duration (in hours and minutes separately) to "XhMM".
 * e.g., startHour=8, startMinute=30, endHour=12, endMinute=0 → "3h30"
 */
export function formatInterventionDuration(
  startHour: bigint,
  startMinute: bigint,
  endHour: bigint,
  endMinute: bigint
): string {
  const startTotal = Number(startHour) * 60 + Number(startMinute);
  const endTotal = Number(endHour) * 60 + Number(endMinute);
  const diffMinutes = endTotal - startTotal;
  if (diffMinutes <= 0) return '0h00';
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Format an intervention slot as a time range string.
 * e.g., startHour=8, startMinute=30, endHour=12, endMinute=0 → "8h30 - 12h00"
 */
export function formatInterventionRange(
  startHour: bigint,
  startMinute: bigint,
  endHour: bigint,
  endMinute: bigint
): string {
  const start = `${Number(startHour)}h${String(Number(startMinute)).padStart(2, '0')}`;
  const end = `${Number(endHour)}h${String(Number(endMinute)).padStart(2, '0')}`;
  return `${start} - ${end}`;
}

/**
 * Compute normal work hours from a TimeEntry (endMorning - startMorning + endAfternoon - startAfternoon).
 * Values are in hours (bigint).
 */
export function computeNormalHours(entry: {
  startMorning: bigint;
  endMorning: bigint;
  startAfternoon: bigint;
  endAfternoon: bigint;
}): number {
  const morning = Math.max(0, Number(entry.endMorning) - Number(entry.startMorning));
  const afternoon = Math.max(0, Number(entry.endAfternoon) - Number(entry.startAfternoon));
  return morning + afternoon;
}

/**
 * Compute on-call (astreinte) hours from a TimeEntry.
 * Values are in hours (bigint).
 */
export function computeAstreinteHours(entry: {
  startAstreinte?: bigint;
  endAstreinte?: bigint;
}): number {
  if (entry.startAstreinte == null || entry.endAstreinte == null) return 0;
  return Math.max(0, Number(entry.endAstreinte) - Number(entry.startAstreinte));
}

/**
 * Compute total intervention hours from intervention slots.
 * Each slot uses hour/minute fields.
 */
export function computeInterventionHours(slots: Array<{
  startHour: bigint;
  startMinute: bigint;
  endHour: bigint;
  endMinute: bigint;
}>): number {
  let totalMinutes = 0;
  for (const slot of slots) {
    const startTotal = Number(slot.startHour) * 60 + Number(slot.startMinute);
    const endTotal = Number(slot.endHour) * 60 + Number(slot.endMinute);
    if (endTotal > startTotal) totalMinutes += endTotal - startTotal;
  }
  return totalMinutes / 60;
}
