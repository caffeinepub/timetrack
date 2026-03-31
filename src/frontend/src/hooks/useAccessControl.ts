import { useMemo } from "react";
import type { Page } from "../App";
import {
  ADMIN_PRINCIPAL_ID,
  useAccessControlContext,
} from "../contexts/AccessControlContext";

export { ADMIN_PRINCIPAL_ID };

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
  const ctx = useAccessControlContext();

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
      const level = ctx.getSectionAccessLevel(principalId, page);
      return level === "full" || level === "readonly";
    };

    const isSectionReadOnly = (page: Page): boolean => {
      if (isAdmin) return false;
      const level = ctx.getSectionAccessLevel(principalId, page);
      return level === "readonly";
    };

    const visiblePages = ALL_PAGES.filter((p) => isSectionVisible(p));

    return { isSectionVisible, isSectionReadOnly, visiblePages, isAdmin };
  }, [principalId, ctx]);
}
