import { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../backend.d";
import { UserRole } from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  type AccessLevel,
  getAllUserAccess,
  setSectionAccess,
} from "../utils/userAccessControl";

export const ADMIN_PRINCIPAL_ID =
  "cpipl-aryn4-cbti4-rb7e3-csw4p-ppmbj-x2qwf-46tky-paxza-2dcvi-sae";

const ALL_SECTIONS = [
  { key: "dashboard", label: "Bord" },
  { key: "calendar", label: "Calendrier" },
  { key: "planning", label: "Planning" },
  { key: "memo", label: "Mémo" },
  { key: "facturation", label: "Facturation" },
  { key: "clients", label: "Clients" },
  { key: "ticket-resto", label: "Ticket Resto" },
  { key: "ticket-essence", label: "Ticket Essence" },
];

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

const LEVEL_CONFIG: Record<
  AccessLevel,
  { label: string; color: string; bg: string }
> = {
  full: { label: "Complet", color: "#16a34a", bg: "rgba(22,163,74,0.15)" },
  readonly: { label: "Lecture", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  disabled: {
    label: "Désactivé",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
  },
};

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
  const [accessMap, setAccessMap] = useState<
    Record<string, Record<string, AccessLevel>>
  >({});
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

          const newAccessMap: Record<string, Record<string, AccessLevel>> = {};
          for (const { principalStr } of parsed) {
            newAccessMap[principalStr] = getAllUserAccess(principalStr);
          }
          setAccessMap(newAccessMap);

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
        setErrorDetail(extractErrorMessage(lastError));
        setError("Erreur lors du chargement des profils.");
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [actor, isFetching, retryCount]);

  const handleRetry = () => setRetryCount((c) => c + 1);

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

  const handleSectionLevel = (
    principalStr: string,
    sectionKey: string,
    level: AccessLevel,
  ) => {
    setSectionAccess(principalStr, sectionKey, level);
    setAccessMap((prev) => ({
      ...prev,
      [principalStr]: {
        ...(prev[principalStr] ?? {}),
        [sectionKey]: level,
      },
    }));
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
            Section Profil — Administration
          </h1>
          <p className="text-sm" style={{ color: "oklch(var(--vts-green))" }}>
            Gestion des accès utilisateurs
          </p>
        </div>
      </div>

      {/* Legend */}
      <div
        className="rounded-xl p-3 flex flex-wrap gap-3"
        style={{ background: "oklch(var(--navy-dark))" }}
      >
        {Object.entries(LEVEL_CONFIG).map(([level, cfg]) => (
          <div key={level} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: cfg.color }}
            />
            <span className="text-white/70 text-xs">{cfg.label}</span>
          </div>
        ))}
        <span className="text-white/40 text-xs ml-auto">
          Cliquez sur les boutons pour changer le niveau d'accès
        </span>
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
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && profiles.length === 0 && (
        <div
          className="rounded-xl p-8 text-center text-white/50"
          style={{ background: "oklch(var(--navy-dark))" }}
          data-ocid="profil.empty_state"
        >
          Aucun profil utilisateur enregistré.
        </div>
      )}

      {!loading &&
        profiles.map(({ principalStr, profile }, idx) => {
          const isAdminUser = principalStr === ADMIN_PRINCIPAL_ID;
          const status = statusMap[principalStr] || "active";
          const isExpanded = !!expandedSections[principalStr];
          const userAccess = accessMap[principalStr] ?? {};
          const isActioning = !!actionLoading[principalStr];

          return (
            <div
              key={principalStr}
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ background: "oklch(var(--navy-dark))" }}
              data-ocid={`profil.item.${idx + 1}`}
            >
              {/* User header row */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
                    style={{
                      backgroundColor: isAdminUser
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
                      {isAdminUser && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#ea580c", color: "white" }}
                        >
                          ADMIN
                        </span>
                      )}
                      {!isAdminUser && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {status === "active" ? "Actif" : "Désactivé"}
                        </span>
                      )}
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

                {!isAdminUser && (
                  <button
                    type="button"
                    onClick={() => toggleStatus(principalStr)}
                    disabled={isActioning}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-50"
                    style={{
                      backgroundColor:
                        status === "active" ? "#ef4444" : "#22c55e",
                    }}
                    data-ocid={`profil.toggle.${idx + 1}`}
                  >
                    {isActioning ? (
                      "..."
                    ) : status === "active" ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Désactiver
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Activer
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                className="mx-4 h-px"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />

              {!isAdminUser && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleExpand(principalStr)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
                    data-ocid={`profil.panel.${idx + 1}`}
                  >
                    <span style={{ color: "oklch(var(--vts-green))" }}>
                      Gérer les accès par section
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2">
                      {ALL_SECTIONS.map((section) => {
                        const currentLevel: AccessLevel =
                          userAccess[section.key] ?? "full";
                        return (
                          <div
                            key={section.key}
                            className="flex items-center justify-between gap-2 py-1"
                          >
                            <span className="text-white/80 text-sm font-medium">
                              {section.label}
                            </span>
                            <div className="flex gap-1">
                              {(
                                Object.entries(LEVEL_CONFIG) as [
                                  AccessLevel,
                                  (typeof LEVEL_CONFIG)[AccessLevel],
                                ][]
                              ).map(([level, cfg]) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() =>
                                    handleSectionLevel(
                                      principalStr,
                                      section.key,
                                      level,
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                                  style={{
                                    backgroundColor:
                                      currentLevel === level
                                        ? cfg.color
                                        : "rgba(255,255,255,0.07)",
                                    color:
                                      currentLevel === level
                                        ? "white"
                                        : "rgba(255,255,255,0.45)",
                                    border:
                                      currentLevel === level
                                        ? `1px solid ${cfg.color}`
                                        : "1px solid rgba(255,255,255,0.1)",
                                  }}
                                  data-ocid={`profil.${section.key}.button`}
                                >
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {isAdminUser && (
                <div className="px-4 py-3">
                  <span className="text-white/30 text-xs">
                    L'administrateur a toujours accès complet à toutes les
                    sections.
                  </span>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
