import { useMemo } from "react";
import type { Page } from "../App";
import { getSectionAccess } from "../utils/userAccessControl";

export const ADMIN_PRINCIPAL_ID =
  "gilph-edmid-nr3ic-svhal-6eq2x-ef6kc-ll54b-f6ow2-wc6zo-yf3cx-sae";

const ALL_PAGES: Page[] = [
  "dashboard",
  "calendar",
  "planning",
  "memo",
  "facturation",
  "clients",
  "ticket-resto",
  "ticket-essence",
];

export function useAccessControl(principalId: string | null) {
  return useMemo(() => {
    if (!principalId) {
      return {
        isSectionVisible: (_page: Page) => false,
        isSectionReadOnly: (_page: Page) => false,
        visiblePages: [] as Page[],
        isAdmin: false,
      };
    }

    const isAdmin = principalId === ADMIN_PRINCIPAL_ID;

    const isSectionVisible = (page: Page): boolean => {
      if (isAdmin) return true;
      const level = getSectionAccess(principalId, page);
      return level === "full" || level === "readonly";
    };

    const isSectionReadOnly = (page: Page): boolean => {
      if (isAdmin) return false;
      const level = getSectionAccess(principalId, page);
      return level === "readonly";
    };

    const visiblePages = ALL_PAGES.filter((p) => isSectionVisible(p));

    return { isSectionVisible, isSectionReadOnly, visiblePages, isAdmin };
  }, [principalId]);
}
