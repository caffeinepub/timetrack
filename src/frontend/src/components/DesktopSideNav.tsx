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
import type { Page } from "../App";

interface DesktopSideNavProps {
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
  { page: "ticket-resto", label: "Ticket Resto", Icon: UtensilsCrossed },
  { page: "ticket-essence", label: "Ticket Essence", Icon: Car },
];

export default function DesktopSideNav({
  currentPage,
  onNavigate,
  visiblePages,
  isAdmin = false,
}: DesktopSideNavProps) {
  const filteredItems = visiblePages
    ? NAV_ITEMS.filter((item) => visiblePages.includes(item.page))
    : NAV_ITEMS;

  return (
    <aside
      className="hidden md:flex flex-col w-52 flex-shrink-0 sticky top-[68px] self-start h-[calc(100vh-68px)] overflow-y-auto"
      style={{
        backgroundColor: "oklch(var(--navy-dark))",
        borderRight: "2px solid oklch(var(--vts-green) / 0.4)",
      }}
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {filteredItems.map(({ page, label, Icon }) => {
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

        {isAdmin && (
          <>
            <div
              className="my-2 h-px"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            />
            <button
              type="button"
              onClick={() => onNavigate("profil")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left w-full"
              style={{
                backgroundColor:
                  currentPage === "profil"
                    ? "rgba(234,88,12,0.15)"
                    : "transparent",
                color:
                  currentPage === "profil"
                    ? "#ea580c"
                    : "rgba(255,255,255,0.65)",
                borderLeft:
                  currentPage === "profil"
                    ? "3px solid #ea580c"
                    : "3px solid transparent",
              }}
              data-ocid="nav.profil.link"
            >
              <Shield
                className="w-5 h-5 flex-shrink-0"
                strokeWidth={currentPage === "profil" ? 2.4 : 1.7}
              />
              <span>Administration</span>
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
