import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SectionAccessLevel } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export const ADMIN_PRINCIPAL_ID =
  "cpipl-aryn4-cbti4-rb7e3-csw4p-ppmbj-x2qwf-46tky-paxza-2dcvi-sae";

export type AccessLevel = "full" | "readonly" | "disabled";

function fromBackendLevel(level: SectionAccessLevel): AccessLevel {
  if ("full" in level) return "full";
  if ("readonly" in level) return "readonly";
  return "disabled";
}

interface AccessControlState {
  sectionAccess: Record<string, Record<string, AccessLevel>>;
  userStatus: Record<string, "active" | "disabled">;
  loaded: boolean;
}

interface AccessControlContextValue extends AccessControlState {
  setSectionAccess: (
    userId: string,
    sectionKey: string,
    level: AccessLevel,
  ) => Promise<void>;
  setUserStatus: (
    userId: string,
    status: "active" | "disabled",
  ) => Promise<void>;
  reload: () => void;
  getSectionAccessLevel: (userId: string, sectionKey: string) => AccessLevel;
  isUserActive: (userId: string) => boolean;
  getUsersDisabledForSection: (sectionKey: string) => string[];
  getDisabledUserIds: () => string[];
}

const defaultContextValue: AccessControlContextValue = {
  sectionAccess: {},
  userStatus: {},
  loaded: false,
  setSectionAccess: async () => {},
  setUserStatus: async () => {},
  reload: () => {},
  getSectionAccessLevel: () => "full",
  isUserActive: () => true,
  getUsersDisabledForSection: () => [],
  getDisabledUserIds: () => [],
};

const AccessControlContext =
  createContext<AccessControlContextValue>(defaultContextValue);

export function AccessControlProvider({
  children,
}: { children: React.ReactNode }) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const [state, setState] = useState<AccessControlState>({
    sectionAccess: {},
    userStatus: {},
    loaded: false,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is used as a manual reload trigger
  useEffect(() => {
    if (!actor || isFetching || !identity) return;
    const principalStr = identity.getPrincipal().toText();
    if (principalStr === "2vxsx-fae") return; // anonymous

    const isAdmin = principalStr === ADMIN_PRINCIPAL_ID;

    const load = async () => {
      try {
        if (isAdmin) {
          const [allAccess, allStatuses] = await Promise.all([
            (actor as any).obtenirTousLesAcces(),
            (actor as any).obtenirTousStatutsComptes(),
          ]);

          const sectionAccess: Record<string, Record<string, AccessLevel>> = {};
          for (const [key, level] of allAccess as Array<
            [string, SectionAccessLevel]
          >) {
            const sepIdx = key.indexOf("::");
            if (sepIdx === -1) continue;
            const pid = key.substring(0, sepIdx);
            const sec = key.substring(sepIdx + 2);
            if (!sectionAccess[pid]) sectionAccess[pid] = {};
            sectionAccess[pid][sec] = fromBackendLevel(level);
          }

          const userStatus: Record<string, "active" | "disabled"> = {};
          for (const [pid, status] of allStatuses as Array<[string, string]>) {
            userStatus[pid] = status as "active" | "disabled";
          }

          setState({ sectionAccess, userStatus, loaded: true });
        } else {
          const principal = identity.getPrincipal();
          const [myAccess, myStatus] = await Promise.all([
            (actor as any).obtenirAccesSectionPourUtilisateur(principal),
            (actor as any).obtenirStatutCompte(principal),
          ]);

          const sectionAccess: Record<string, Record<string, AccessLevel>> = {};
          sectionAccess[principalStr] = {};
          for (const [sec, level] of myAccess as Array<
            [string, SectionAccessLevel]
          >) {
            sectionAccess[principalStr][sec] = fromBackendLevel(level);
          }

          const userStatus: Record<string, "active" | "disabled"> = {};
          userStatus[principalStr] = myStatus as "active" | "disabled";

          setState({ sectionAccess, userStatus, loaded: true });
        }
      } catch (e) {
        console.error("Failed to load access control:", e);
        setState((prev) => ({ ...prev, loaded: true }));
      }
    };

    load();
  }, [actor, isFetching, identity, reloadKey]);

  const setSectionAccess = useCallback(
    async (userId: string, sectionKey: string, level: AccessLevel) => {
      if (!actor) return;
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(userId);
      const backendLevel: SectionAccessLevel =
        level === "full"
          ? { full: null }
          : level === "readonly"
            ? { readonly: null }
            : { disabled: null };
      await (actor as any).definirAccesSection(
        principal,
        sectionKey,
        backendLevel,
      );
      setState((prev) => {
        const next = { ...prev };
        if (!next.sectionAccess[userId]) next.sectionAccess[userId] = {};
        next.sectionAccess[userId] = {
          ...next.sectionAccess[userId],
          [sectionKey]: level,
        };
        return next;
      });
    },
    [actor],
  );

  const setUserStatus = useCallback(
    async (userId: string, status: "active" | "disabled") => {
      if (!actor) return;
      const { Principal } = await import("@icp-sdk/core/principal");
      const principal = Principal.fromText(userId);
      await (actor as any).definirStatutCompte(principal, status);
      setState((prev) => ({
        ...prev,
        userStatus: { ...prev.userStatus, [userId]: status },
      }));
    },
    [actor],
  );

  const getSectionAccessLevel = useCallback(
    (userId: string, sectionKey: string): AccessLevel => {
      return state.sectionAccess[userId]?.[sectionKey] ?? "full";
    },
    [state.sectionAccess],
  );

  const isUserActive = useCallback(
    (userId: string): boolean => {
      return (state.userStatus[userId] ?? "active") === "active";
    },
    [state.userStatus],
  );

  const getUsersDisabledForSection = useCallback(
    (sectionKey: string): string[] => {
      return Object.entries(state.sectionAccess)
        .filter(([, sections]) => sections[sectionKey] === "disabled")
        .map(([pid]) => pid);
    },
    [state.sectionAccess],
  );

  const getDisabledUserIds = useCallback((): string[] => {
    return Object.entries(state.userStatus)
      .filter(([, v]) => v === "disabled")
      .map(([k]) => k);
  }, [state.userStatus]);

  return (
    <AccessControlContext.Provider
      value={{
        ...state,
        setSectionAccess,
        setUserStatus,
        reload,
        getSectionAccessLevel,
        isUserActive,
        getUsersDisabledForSection,
        getDisabledUserIds,
      }}
    >
      {children}
    </AccessControlContext.Provider>
  );
}

// Safe hook — never throws, always returns a valid value even outside provider
export function useAccessControlContext(): AccessControlContextValue {
  return useContext(AccessControlContext);
}
