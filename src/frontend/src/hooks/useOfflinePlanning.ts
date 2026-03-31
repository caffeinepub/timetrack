import { useEffect, useState } from "react";

const CACHE_KEY = "vts_planning_cache";

interface PlanningCache {
  missions: any[];
  timestamp: number;
}

export function useOfflinePlanning({
  missions,
  isOnline,
}: {
  missions: any[];
  isOnline: boolean;
}) {
  const [cachedMissions, setCachedMissions] = useState<any[]>([]);
  const [cacheDate, setCacheDate] = useState<Date | null>(null);

  // When online and missions load, update the cache
  useEffect(() => {
    if (isOnline && missions.length > 0) {
      try {
        const payload: PlanningCache = {
          missions,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch {
        // localStorage might be full — ignore
      }
    }
  }, [isOnline, missions]);

  // Load cache from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: PlanningCache = JSON.parse(raw);
        setCachedMissions(parsed.missions);
        setCacheDate(new Date(parsed.timestamp));
      }
    } catch {
      // ignore
    }
  }, []);

  const isCached = !isOnline && cachedMissions.length > 0;
  const displayMissions = isOnline ? missions : cachedMissions;

  return { missions: displayMissions, isCached, cacheDate };
}
