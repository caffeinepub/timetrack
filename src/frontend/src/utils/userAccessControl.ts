export type AccessLevel = "full" | "readonly" | "disabled";

const STORAGE_KEY = "vts_section_access";

function loadAll(): Record<string, Record<string, AccessLevel>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, AccessLevel>>;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, Record<string, AccessLevel>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getSectionAccess(
  principalId: string,
  sectionKey: string,
): AccessLevel {
  const all = loadAll();
  return all[principalId]?.[sectionKey] ?? "full";
}

export function setSectionAccess(
  principalId: string,
  sectionKey: string,
  level: AccessLevel,
): void {
  const all = loadAll();
  if (!all[principalId]) all[principalId] = {};
  all[principalId][sectionKey] = level;
  saveAll(all);
}

export function getAllUserAccess(
  principalId: string,
): Record<string, AccessLevel> {
  const all = loadAll();
  return all[principalId] ?? {};
}
