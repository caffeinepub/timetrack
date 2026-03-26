import { Principal } from "@icp-sdk/core/principal";
import { ChevronDown, ChevronUp, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../backend.d";
import { UserRole } from "../backend.d";
import { useActor } from "../hooks/useActor";

const ADMIN_PRINCIPAL_ID =
  "qqb4l-yz3r5-axq5a-4pvuz-2i2ao-6ssuu-tc6rb-ocqyp-asmgd-jsu2l-6qe";

const ALL_SECTIONS = [
  { key: "dashboard", label: "Bord" },
  { key: "calendar", label: "Calendrier" },
  { key: "memo", label: "M\u00e9mo" },
  { key: "facturation", label: "Facturation" },
  { key: "clients", label: "Clients" },
  { key: "ticket-resto", label: "Ticket Resto" },
  { key: "ticket-essence", label: "Ticket Essence" },
];

export function getBlockedSections(principalId: string): string[] {
  try {
    const raw = localStorage.getItem("admin_section_restrictions");
    if (!raw) return [];
    const data = JSON.parse(raw) as Record<string, string[]>;
    return data[principalId] || [];
  } catch {
    return [];
  }
}

function setBlockedSections(principalId: string, blocked: string[]) {
  try {
    const raw = localStorage.getItem("admin_section_restrictions");
    const data = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    data[principalId] = blocked;
    localStorage.setItem("admin_section_restrictions", JSON.stringify(data));
  } catch {
    // ignore
  }
}

interface ProfileWithPrincipal {
  principalStr: string;
  profile: UserProfile;
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export default function Profil() {
  const { actor, isFetching } = useActor();
  const [profiles, setProfiles] = useState<ProfileWithPrincipal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [statusMap, setStatusMap] = useState<
    Record<string, "active" | "disabled">
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [blockedMap, setBlockedMap] = useState<Record<string, string[]>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryCount is used as a manual trigger
  useEffect(() => {
    if (!actor || isFetching) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setErrorDetail(null);

      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await actor.obtenirTousLesProfils();
          if (cancelled) return;
          const parsed: ProfileWithPrincipal[] = result.map(([p, profile]) => ({
            principalStr: p.toString(),
            profile,
          }));
          setProfiles(parsed);

          const newBlockedMap: Record<string, string[]> = {};
          for (const { principalStr } of parsed) {
            newBlockedMap[principalStr] = getBlockedSections(principalStr);
          }
          setBlockedMap(newBlockedMap);

          const newStatus: Record<string, "active" | "disabled"> = {};
          for (const { principalStr } of parsed) {
            newStatus[principalStr] = "active";
          }
          setStatusMap(newStatus);
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (!cancelled) {
        console.error("Failed to load profiles:", lastError);
        const detail = extractErrorMessage(lastError);
        setErrorDetail(detail);
        setError("Erreur lors du chargement des profils.");
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  const toggleStatus = async (principalStr: string) => {
    if (!actor) return;
    if (principalStr === ADMIN_PRINCIPAL_ID) return;
    setActionLoading((prev) => ({ ...prev, [principalStr]: true }));
    try {
      const current = statusMap[principalStr] || "active";
      const newRole = current === "active" ? UserRole.guest : UserRole.user;
      await actor.assignCallerUserRole(
        Principal.fromText(principalStr),
        newRole,
      );
      setStatusMap((prev) => ({
        ...prev,
        [principalStr]: current === "active" ? "disabled" : "active",
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading((prev) => ({ ...prev, [principalStr]: false }));
    }
  };

  const toggleSection = (principalStr: string, sectionKey: string) => {
    const current = blockedMap[principalStr] || [];
    let updated: string[];
    if (current.includes(sectionKey)) {
      updated = current.filter((s) => s !== sectionKey);
    } else {
      updated = [...current, sectionKey];
    }
    setBlockedMap((prev) => ({ ...prev, [principalStr]: updated }));
    setBlockedSections(principalStr, updated);
  };

  const toggleExpand = (principalStr: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [principalStr]: !prev[principalStr],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4 shadow-lg"
        style={{ background: "oklch(var(--navy-dark))" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#ea580c" }}
        >
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">
            Section Profil \u2014 Administration
          </h1>
          <p className="text-sm" style={{ color: "oklch(var(--vts-green))" }}>
            Gestion des acc\u00e8s utilisateurs
          </p>
        </div>
      </div>

      {loading && (
        <div
          className="rounded-xl p-8 flex items-center justify-center"
          style={{ background: "oklch(var(--navy-dark))" }}
          data-ocid="profil.loading_state"
        >
          <div
            className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin mr-3"
            style={{
              border: "3px solid #ea580c",
              borderTopColor: "transparent",
            }}
          />
          <span className="text-white/70">Chargement des profils...</span>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl p-4 border border-red-500/30 flex flex-col gap-3"
          style={{ background: "oklch(var(--navy-dark))" }}
          data-ocid="profil.error_state"
        >
          <span className="text-red-400 font-semibold">{error}</span>
          {errorDetail && (
            <p className="text-red-300/70 text-xs font-mono break-all">
              {errorDetail}
            </p>
          )}
          <button
            type="button"
            onClick={handleRetry}
            className="self-start px-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#ea580c" }}
            data-ocid="profil.primary_button"
          >
            R\u00e9essayer
          </button>
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div
          className="rounded-xl p-8 text-center text-white/50"
          style={{ background: "oklch(var(--navy-dark))" }}
          data-ocid="profil.empty_state"
        >
          Aucun profil utilisateur enregistr\u00e9.
        </div>
      )}

      {!loading &&
        profiles.map(({ principalStr, profile }, idx) => {
          const isAdmin = principalStr === ADMIN_PRINCIPAL_ID;
          const status = statusMap[principalStr] || "active";
          const isExpanded = !!expandedSections[principalStr];
          const blocked = blockedMap[principalStr] || [];
          const isActioning = !!actionLoading[principalStr];

          return (
            <div
              key={principalStr}
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ background: "oklch(var(--navy-dark))" }}
              data-ocid={`profil.item.${idx + 1}`}
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
                    style={{
                      backgroundColor: isAdmin
                        ? "#ea580c"
                        : "oklch(var(--vts-green) / 0.6)",
                    }}
                  >
                    {profile.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm truncate">
                        {profile.name || "Sans nom"}
                      </span>
                      {isAdmin && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#ea580c", color: "white" }}
                        >
                          ADMIN
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {status === "active" ? "Actif" : "D\u00e9sactiv\u00e9"}
                      </span>
                    </div>
                    {profile.email && (
                      <p className="text-white/50 text-xs truncate mt-0.5">
                        {profile.email}
                      </p>
                    )}
                    <p className="text-white/30 text-[10px] mt-0.5 font-mono truncate">
                      {principalStr}
                    </p>
                  </div>
                </div>

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleStatus(principalStr)}
                    disabled={isActioning}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor:
                        status === "active" ? "#ef4444" : "#22c55e",
                    }}
                    data-ocid={`profil.toggle.${idx + 1}`}
                  >
                    {isActioning
                      ? "..."
                      : status === "active"
                        ? "D\u00e9sactiver"
                        : "Activer"}
                  </button>
                )}
              </div>

              <div
                className="mx-4 h-px"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />

              <button
                type="button"
                onClick={() => toggleExpand(principalStr)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white/70 hover:text-white transition-colors"
                data-ocid={`profil.panel.${idx + 1}`}
              >
                <span style={{ color: "oklch(var(--vts-green))" }}>
                  G\u00e9rer les sections
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {ALL_SECTIONS.map((section) => {
                    const isBlocked = blocked.includes(section.key);
                    return (
                      <label
                        key={section.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!isBlocked}
                          onChange={() =>
                            toggleSection(principalStr, section.key)
                          }
                          className="w-4 h-4 rounded accent-orange-500"
                        />
                        <span className="text-white/75 text-xs">
                          {section.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
