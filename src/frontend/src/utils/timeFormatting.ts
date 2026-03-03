/**
 * Time formatting utilities.
 *
 * STORAGE UNIT: The backend stores time values as MINUTES (bigint).
 * e.g., startMorning=480 (8h00), endMorning=720 (12h00) → 240 min = 4h work.
 * heuresRepas=60 → 1h meal break.
 * heuresTrajet=30 → 30 min travel.
 *
 * Intervention slots use startHour/startMinute/endHour/endMinute fields separately (bigint).
 *
 * NOTE: older entries saved with hourly values (e.g. 8, 12) will display as 0h08 / 0h12.
 * New entries saved from the updated form use minutes.
 */

/**
 * Format a duration in MINUTES (number) to "XhMM" format.
 * e.g., 450 → "7h30", 480 → "8h00", 15 → "0h15", 0 → "0h00"
 */
export function formatMinutes(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Format a duration in hours (number) to "XhMM" format with zero-padded minutes.
 * e.g., 7.5 → "7h30", 8 → "8h00", 0.25 → "0h15", 0 → "0h00"
 */
export function formatHours(hours: number): string {
  return formatMinutes(hours * 60);
}

/**
 * Format a bigint MINUTES value to "XhMM" format.
 */
export function formatBigIntHours(value: bigint): string {
  return formatMinutes(Number(value));
}

/**
 * Format an intervention slot duration (in hours and minutes separately) to "XhMM".
 * e.g., startHour=8, startMinute=30, endHour=12, endMinute=0 → "3h30"
 */
export function formatInterventionDuration(
  startHour: bigint,
  startMinute: bigint,
  endHour: bigint,
  endMinute: bigint,
): string {
  const startTotal = Number(startHour) * 60 + Number(startMinute);
  const endTotal = Number(endHour) * 60 + Number(endMinute);
  const diffMinutes = endTotal - startTotal;
  if (diffMinutes <= 0) return "0h00";
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Format an intervention slot as a time range string.
 * e.g., startHour=8, startMinute=30, endHour=12, endMinute=0 → "8h30 - 12h00"
 */
export function formatInterventionRange(
  startHour: bigint,
  startMinute: bigint,
  endHour: bigint,
  endMinute: bigint,
): string {
  const start = `${Number(startHour)}h${String(Number(startMinute)).padStart(2, "0")}`;
  const end = `${Number(endHour)}h${String(Number(endMinute)).padStart(2, "0")}`;
  return `${start} - ${end}`;
}

/**
 * Compute normal work hours (in minutes) from a TimeEntry.
 * Values are stored as MINUTES (bigint): end - start.
 * Returns minutes as a number.
 */
export function computeNormalHours(entry: {
  startMorning: bigint;
  endMorning: bigint;
  startAfternoon: bigint;
  endAfternoon: bigint;
}): number {
  const morning = Math.max(
    0,
    Number(entry.endMorning) - Number(entry.startMorning),
  );
  const afternoon = Math.max(
    0,
    Number(entry.endAfternoon) - Number(entry.startAfternoon),
  );
  return morning + afternoon; // minutes
}

/**
 * Compute on-call (astreinte) hours (in minutes) from a TimeEntry.
 * Returns minutes as a number.
 */
export function computeAstreinteHours(entry: {
  startAstreinte?: bigint;
  endAstreinte?: bigint;
}): number {
  if (entry.startAstreinte == null || entry.endAstreinte == null) return 0;
  return Math.max(0, Number(entry.endAstreinte) - Number(entry.startAstreinte)); // minutes
}

/**
 * Compute total intervention hours from intervention slots.
 * Each slot uses hour/minute fields (bigint).
 * Returns minutes as a number.
 */
export function computeInterventionHours(
  slots: Array<{
    startHour: bigint;
    startMinute: bigint;
    endHour: bigint;
    endMinute: bigint;
  }>,
): number {
  let totalMinutes = 0;
  for (const slot of slots) {
    const startTotal = Number(slot.startHour) * 60 + Number(slot.startMinute);
    const endTotal = Number(slot.endHour) * 60 + Number(slot.endMinute);
    if (endTotal > startTotal) totalMinutes += endTotal - startTotal;
  }
  return totalMinutes; // minutes
}
