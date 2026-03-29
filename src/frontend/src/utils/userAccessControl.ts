export type AccessLevel = "full" | "readonly" | "disabled";

const STORAGE_KEY = "vts_section_access";
const STATUS_KEY = "vts_user_status";

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

// --- Account-level disabled status ---

function loadStatusAll(): Record<string, "active" | "disabled"> {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, "active" | "disabled">;
  } catch {
    return {};
  }
}

export function getUserAccountStatus(
  principalId: string,
): "active" | "disabled" {
  return loadStatusAll()[principalId] ?? "active";
}

export function setUserAccountStatus(
  principalId: string,
  status: "active" | "disabled",
): void {
  try {
    const data = loadStatusAll();
    data[principalId] = status;
    localStorage.setItem(STATUS_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getDisabledUserIds(): string[] {
  const data = loadStatusAll();
  return Object.entries(data)
    .filter(([, v]) => v === "disabled")
    .map(([k]) => k);
}

export function getUsersDisabledForSection(sectionKey: string): string[] {
  const all = loadAll();
  return Object.entries(all)
    .filter(([, sections]) => sections[sectionKey] === "disabled")
    .map(([principalId]) => principalId);
}

export function deleteUserFromLocalStorage(principalId: string): void {
  try {
    const allAccess = loadAll();
    delete allAccess[principalId];
    saveAll(allAccess);

    const statusData = loadStatusAll();
    delete statusData[principalId];
    localStorage.setItem(STATUS_KEY, JSON.stringify(statusData));
  } catch {
    // ignore
  }
}
