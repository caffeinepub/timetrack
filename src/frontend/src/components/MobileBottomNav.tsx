import {
  BarChart2,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
} from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { useSafeTap } from "../hooks/useSafeTap";

type Page = "dashboard" | "calendar" | "journal" | "reports";

interface MobileBottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; label: string; Icon: React.ElementType }[] = [
  { page: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { page: "calendar", label: "Calendar", Icon: CalendarDays },
  { page: "journal", label: "Journal", Icon: BookOpen },
  { page: "reports", label: "Reports", Icon: BarChart2 },
];

export default function MobileBottomNav({
  currentPage,
  onNavigate,
}: MobileBottomNavProps) {
  const safeTap = useSafeTap({ debounceMs: 300 });

  const handleNavigate = useCallback(
    (page: Page) => safeTap(() => onNavigate(page))(),
    [safeTap, onNavigate],
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch h-14">
        {NAV_ITEMS.map(({ page, label, Icon }) => {
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              type="button"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavigate(page)}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors select-none",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary",
              ].join(" ")}
            >
              <Icon
                className={[
                  "w-5 h-5 transition-transform",
                  isActive ? "scale-110" : "",
                ].join(" ")}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
