import {
  CalendarDays,
  Car,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type React from "react";
import type { Page } from "../App";

interface DesktopSideNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; label: string; Icon: React.ElementType }[] = [
  { page: "dashboard", label: "Bord", Icon: LayoutDashboard },
  { page: "calendar", label: "Calendrier", Icon: CalendarDays },
  { page: "memo", label: "Mémo", Icon: MessageSquare },
  { page: "facturation", label: "Facturation", Icon: Receipt },
  { page: "clients", label: "Clients", Icon: Users },
  { page: "ticket-resto", label: "Ticket Resto", Icon: UtensilsCrossed },
  { page: "ticket-essence", label: "Ticket Essence", Icon: Car },
];

export default function DesktopSideNav({
  currentPage,
  onNavigate,
}: DesktopSideNavProps) {
  return (
    <aside
      className="hidden md:flex flex-col w-52 flex-shrink-0 sticky top-[68px] self-start h-[calc(100vh-68px)] overflow-y-auto"
      style={{
        backgroundColor: "oklch(var(--navy-dark))",
        borderRight: "2px solid oklch(var(--vts-green) / 0.4)",
      }}
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {NAV_ITEMS.map(({ page, label, Icon }) => {
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left w-full"
              style={{
                backgroundColor: isActive
                  ? "oklch(var(--vts-green) / 0.15)"
                  : "transparent",
                color: isActive
                  ? "oklch(var(--vts-green))"
                  : "rgba(255,255,255,0.65)",
                borderLeft: isActive
                  ? "3px solid oklch(var(--vts-green))"
                  : "3px solid transparent",
              }}
              data-ocid={`nav.${page}.link`}
            >
              <Icon
                className="w-5 h-5 flex-shrink-0"
                strokeWidth={isActive ? 2.4 : 1.7}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
