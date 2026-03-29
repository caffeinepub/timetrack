import {
  CalendarCheck,
  CalendarDays,
  Car,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Shield,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import type { Page } from "../App";
import { useSafeTap } from "../hooks/useSafeTap";

interface MobileBottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  visiblePages?: Page[];
  isAdmin?: boolean;
}

const NAV_ITEMS: { page: Page; label: string; Icon: React.ElementType }[] = [
  { page: "dashboard", label: "Bord", Icon: LayoutDashboard },
  { page: "calendar", label: "Calendrier", Icon: CalendarDays },
  { page: "planning", label: "Planning", Icon: CalendarCheck },
  { page: "memo", label: "Mémo", Icon: MessageSquare },
  { page: "facturation", label: "Facturation", Icon: Receipt },
  { page: "clients", label: "Clients", Icon: Users },
  { page: "ticket-resto", label: "T.Resto", Icon: UtensilsCrossed },
  { page: "ticket-essence", label: "T.Essence", Icon: Car },
];

export default function MobileBottomNav({
  currentPage,
  onNavigate,
  visiblePages,
  isAdmin = false,
}: MobileBottomNavProps) {
  const safeTap = useSafeTap({ debounceMs: 300 });

  const handleNavigate = useCallback(
    (page: Page) => safeTap(() => onNavigate(page))(),
    [safeTap, onNavigate],
  );

  const filteredItems = visiblePages
    ? NAV_ITEMS.filter((item) => visiblePages.includes(item.page))
    : NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden shadow-lg"
      style={{
        backgroundColor: "oklch(var(--navy-dark))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        borderTop: "2px solid oklch(var(--vts-green) / 0.5)",
      }}
    >
      <div
        className="flex items-stretch h-14 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {filteredItems.map(({ page, label, Icon }) => {
          const isActive = currentPage === page;
          const activeColor = "oklch(var(--vts-green))";
          return (
            <button
              key={page}
              type="button"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavigate(page)}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors select-none relative"
              style={{
                minWidth: "52px",
                color: isActive ? activeColor : "rgba(255,255,255,0.55)",
              }}
              data-ocid={`nav.${page}.link`}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}
              <Icon
                className={[
                  "w-5 h-5 transition-transform",
                  isActive ? "scale-110" : "",
                ].join(" ")}
                strokeWidth={isActive ? 2.4 : 1.7}
              />
              <span>{label}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            type="button"
            aria-label="Administration"
            aria-current={currentPage === "profil" ? "page" : undefined}
            onClick={() => handleNavigate("profil")}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition-colors select-none relative"
            style={{
              minWidth: "52px",
              color:
                currentPage === "profil" ? "#ea580c" : "rgba(255,255,255,0.55)",
            }}
            data-ocid="nav.profil.link"
          >
            {currentPage === "profil" && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b-full"
                style={{ backgroundColor: "#ea580c" }}
              />
            )}
            <Shield
              className={[
                "w-5 h-5 transition-transform",
                currentPage === "profil" ? "scale-110" : "",
              ].join(" ")}
              strokeWidth={currentPage === "profil" ? 2.4 : 1.7}
            />
            <span>Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
}
