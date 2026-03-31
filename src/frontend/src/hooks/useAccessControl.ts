import { useMemo } from "react";
import type { Page } from "../App";
import { getSectionAccess } from "../utils/userAccessControl";

export const ADMIN_PRINCIPAL_ID =
  "cpipl-aryn4-cbti4-rb7e3-csw4p-ppmbj-x2qwf-46tky-paxza-2dcvi-sae";

const ALL_PAGES: Page[] = [
  "dashboard",
  "calendar",
  "planning",
  "memo",
  "facturation",
  "clients",
  "ticket-resto",
  "ticket-essence",
  "contact",
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
