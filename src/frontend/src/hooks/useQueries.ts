import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DailyMediaEntry,
  ExternalBlob,
  JournalEntry,
  MediaType,
  PdfReportData,
  TimeEntry,
  TimeEntryInput,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ---- Time Entries ----

export function useGetTimeEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<TimeEntry[]>({
    queryKey: ["timeEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirJournees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveTimeEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimeEntryInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enregistrerJournee(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["totals"] });
      queryClient.invalidateQueries({ queryKey: ["vacationDaysCount"] });
      queryClient.invalidateQueries({ queryKey: ["onCallDaysCount"] });
    },
  });
}

export function useUpdateTimeEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: string; input: TimeEntryInput }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.modifierJournee(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["totals"] });
      queryClient.invalidateQueries({ queryKey: ["vacationDaysCount"] });
      queryClient.invalidateQueries({ queryKey: ["onCallDaysCount"] });
    },
  });
}

export function useDeleteTimeEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.supprimerJournee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["totals"] });
      queryClient.invalidateQueries({ queryKey: ["vacationDaysCount"] });
      queryClient.invalidateQueries({ queryKey: ["onCallDaysCount"] });
    },
  });
}

// ---- Journal Entries ----

export function useGetJournalEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<JournalEntry[]>({
    queryKey: ["journalEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirJournaux();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveJournalEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      audioUrl: string;
      transcription: string;
      notes: string;
      photos: ExternalBlob[];
      dayType: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enregistrerJournal(
        params.id,
        params.audioUrl,
        params.transcription,
        params.notes,
        params.photos,
        params.dayType as any,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });
}

export function useUpdateJournalEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      audioUrl: string;
      transcription: string;
      notes: string;
      photos: ExternalBlob[];
      dayType: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.modifierJournal(
        params.id,
        params.audioUrl,
        params.transcription,
        params.notes,
        params.photos,
        params.dayType as any,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });
}

export function useDeleteJournalEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.supprimerJournal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });
}

// ---- Daily Media ----

export function useGetDailyMedia(date: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyMediaEntry[]>({
    queryKey: ["dailyMedia", date.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirMediasPourJour(date);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveDailyMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      mediaType: MediaType;
      relatedDay: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.enregistrerMediaQuotidien(
        params.id,
        params.mediaType,
        params.relatedDay,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dailyMedia", variables.relatedDay.toString()],
      });
    },
  });
}

export function useDeleteDailyMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; relatedDay: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.supprimerMediaQuotidien(params.id);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dailyMedia", variables.relatedDay.toString()],
      });
    },
  });
}

// ---- User Profile ----

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        return await actor.getCallerUserProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Alias for backward compatibility
export const useSaveUserProfile = useSaveCallerUserProfile;

// ---- Totals / Stats ----

export function useGetTotals() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["totals"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.calculerTotaux();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTotalsForMonth(
  user: Principal | null,
  month: number,
  year: number,
) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["totalsMonth", user?.toString(), month, year],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.calculerTotauxPourMois(user, BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useGetTotalsForWeek(
  user: Principal | null,
  week: number,
  year: number,
) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["totalsWeek", user?.toString(), week, year],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.calculerTotauxPourSemaine(user, BigInt(week), BigInt(year));
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

// Vacation days count (used by Dashboard)
export function useGetVacationDaysCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<number>({
    queryKey: ["vacationDaysCount"],
    queryFn: async () => {
      if (!actor || !identity) return 0;
      const principal = identity.getPrincipal();
      const count = await actor.calculerNombreConge(principal);
      return Number(count);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

// On-call days count (used by Dashboard)
export function useGetOnCallDaysCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery<number>({
    queryKey: ["onCallDaysCount"],
    queryFn: async () => {
      if (!actor || !identity) return 0;
      const principal = identity.getPrincipal();
      const count = await actor.calculerNombreAstreinte(principal);
      return Number(count);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetCongeCount(user: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["congeCount", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return 0n;
      return actor.calculerNombreConge(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

export function useGetAstreinteCount(user: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["astreinteCount", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return 0n;
      return actor.calculerNombreAstreinte(user);
    },
    enabled: !!actor && !isFetching && !!user,
  });
}

// ---- Admin ----

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRestartPublish() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.restartPublish();
    },
  });
}

// ---- PDF Report ----

export function useGetPdfReportData() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: {
      typePeriode:
        | { __kind__: "semaine"; semaine: [bigint, bigint] }
        | { __kind__: "mois"; mois: [bigint, bigint] };
      user: Principal;
    }): Promise<PdfReportData> => {
      if (!actor) throw new Error("Actor not available");
      return actor.genererDonneesRapportPdf(params.typePeriode, params.user);
    },
  });
}

// Alias used by old Reports page
export const useGeneratePdfReportData = useGetPdfReportData;

// ---- Clients ----

export function useGetClients() {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend").Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.obtenirClients();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: import("../backend").Client) => {
      if (!actor) throw new Error("Actor not available");
      return actor.ajouterClient(client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      client,
    }: { id: string; client: import("../backend").Client }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.modifierClient(id, client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.supprimerClient(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useToggleBlacklist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.basculerListeNoire(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// ---- Interventions ----

export function useGetInterventionsPourJour(date: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend.d").InterventionAvecPieces[]>({
    queryKey: ["interventions", date.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirInterventionsPourJour(date);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddIntervention() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: import("../backend.d").InterventionInput) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).ajouterIntervention(input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interventions", variables.date.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["interventions", "all"],
      });
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
    },
  });
}

export function useUpdateIntervention() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: string; input: import("../backend.d").InterventionInput }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).modifierIntervention(id, input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interventions", variables.input.date.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["interventions", "all"],
      });
      queryClient.invalidateQueries({ queryKey: ["facturationInterventions"] });
    },
  });
}

export function useDeleteIntervention() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; date: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).supprimerIntervention(id);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interventions", variables.date.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["interventions", "all"],
      });
    },
  });
}

export function useGetAllInterventions() {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend.d").InterventionAvecPieces[]>({
    queryKey: ["interventions", "all"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirToutesInterventionsPourFacturation();
    },
    enabled: !!actor && !isFetching,
  });
}

// ---- Memos ----

export function useGetMemos() {
  const { actor, isFetching } = useActor();
  return useQuery<any[]>({
    queryKey: ["memos"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirMemos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMemo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      authorName,
      content,
      photos,
      videos,
    }: {
      id: string;
      authorName: string;
      content: string;
      photos: import("../backend").ExternalBlob[];
      videos: import("../backend").ExternalBlob[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).creerMemo(id, authorName, content, photos, videos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}

export function useDeleteMemo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as any).supprimerMemo(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
}

export function useGetToutesInterventionsFact() {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend.d").InterventionAvecPieces[]>({
    queryKey: ["facturationInterventions"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).obtenirToutesInterventionsPourFacturation();
    },
    enabled: !!actor && !isFetching,
  });
}
