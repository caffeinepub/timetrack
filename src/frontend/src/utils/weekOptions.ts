/**
 * Utility functions for computing ISO week ranges for a given year and month.
 * ISO weeks start on Monday and belong to the year containing the Thursday of that week.
 */

export interface WeekOption {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  label: string;
  year: number;
}

/**
 * Get the ISO week number for a given date (1-53).
 * ISO weeks start on Monday and week 1 contains the first Thursday of the year.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the year that the ISO week belongs to (may differ from calendar year).
 */
export function getISOWeekYear(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Get the start date (Monday) of an ISO week for a given year and week number.
 */
export function getISOWeekStartDate(year: number, weekNumber: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const targetMonday = new Date(week1Monday);
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);

  return targetMonday;
}

/**
 * Get all ISO weeks that intersect with a given month and year.
 * Returns weeks sorted by week number.
 */
export function getWeeksForMonth(year: number, month: number): WeekOption[] {
  const weeks: WeekOption[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Start from the first day of the month
  let currentDate = new Date(firstDay);
  const seenWeeks = new Set<string>();

  // Iterate through all days of the month
  while (currentDate <= lastDay) {
    const weekNumber = getISOWeekNumber(currentDate);
    const weekYear = getISOWeekYear(currentDate);
    const weekKey = `${weekYear}-${weekNumber}`;

    if (!seenWeeks.has(weekKey)) {
      seenWeeks.add(weekKey);

      const weekStart = getISOWeekStartDate(weekYear, weekNumber);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

      weeks.push({
        weekNumber,
        startDate: weekStart,
        endDate: weekEnd,
        label: formatWeekLabel(weekStart, weekEnd, weekYear),
        year: weekYear,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by week number
  weeks.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.weekNumber - b.weekNumber;
  });

  return weeks;
}

/**
 * Format a week label with start date, end date, and year.
 * Example: "Jan 08 – Jan 14, 2026"
 */
function formatWeekLabel(startDate: Date, endDate: Date, year: number): string {
  const monthNames = [
    "Jan",
    "Fév",
    "Mar",
    "Avr",
    "Mai",
    "Jun",
    "Jul",
    "Aoû",
    "Sep",
    "Oct",
    "Nov",
    "Déc",
  ];

  const startMonth = monthNames[startDate.getUTCMonth()];
  const startDay = startDate.getUTCDate().toString().padStart(2, "0");

  const endMonth = monthNames[endDate.getUTCMonth()];
  const endDay = endDate.getUTCDate().toString().padStart(2, "0");

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * Get the current week option for today's date.
 */
export function getCurrentWeekOption(): WeekOption {
  const today = new Date();
  const weekNumber = getISOWeekNumber(today);
  const weekYear = getISOWeekYear(today);
  const weekStart = getISOWeekStartDate(weekYear, weekNumber);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    weekNumber,
    startDate: weekStart,
    endDate: weekEnd,
    label: formatWeekLabel(weekStart, weekEnd, weekYear),
    year: weekYear,
  };
}

/**
 * Check if a timestamp falls within a week range (inclusive).
 */
export function isDateInWeek(
  timestamp: bigint,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  const date = new Date(Number(timestamp) / 1000000);
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const startOnly = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate(),
  );
  const endOnly = new Date(
    weekEnd.getFullYear(),
    weekEnd.getMonth(),
    weekEnd.getDate(),
  );

  return dateOnly >= startOnly && dateOnly <= endOnly;
}
