import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, TimeEntry, TimeEntryInput, JournalEntry, ExternalBlob, MediaType, DailyMediaEntry, DayType } from '../backend';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
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
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Admin Status Query
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Restart Publish Mutation
export function useRestartPublish() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.restartPublish();
    },
  });
}

// Time Entry Queries
export function useGetTimeEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<TimeEntry[]>({
    queryKey: ['timeEntries'],
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
      if (!actor) throw new Error('Actor not available');
      return actor.enregistrerJournee(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

export function useUpdateTimeEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TimeEntryInput }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.modifierJournee(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.supprimerJournee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

// Statistics Queries
export function useGetVacationDaysCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<number>({
    queryKey: ['vacationDaysCount'],
    queryFn: async () => {
      if (!actor || !identity) return 0;
      const principal = identity.getPrincipal();
      const count = await actor.calculerNombreConge(principal);
      return Number(count);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetOnCallDaysCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<number>({
    queryKey: ['onCallDaysCount'],
    queryFn: async () => {
      if (!actor || !identity) return 0;
      const principal = identity.getPrincipal();
      const count = await actor.calculerNombreAstreinte(principal);
      return Number(count);
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

// Daily Media Queries
export function useGetDailyMedia(date: Date | null) {
  const { actor, isFetching } = useActor();

  return useQuery<DailyMediaEntry[]>({
    queryKey: ['dailyMedia', date?.getTime()],
    queryFn: async () => {
      if (!actor || !date) return [];
      const timestamp = BigInt(date.getTime() * 1000000);
      return actor.obtenirMediasPourJour(timestamp);
    },
    enabled: !!actor && !isFetching && !!date,
  });
}

export function useGetDailyPhotos(date: Date | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob[]>({
    queryKey: ['dailyPhotos', date?.getTime()],
    queryFn: async () => {
      if (!actor || !date) return [];
      const timestamp = BigInt(date.getTime() * 1000000);
      return actor.obtenirPhotosPourJour(timestamp);
    },
    enabled: !!actor && !isFetching && !!date,
  });
}

export function useGetDailyAudio(date: Date | null) {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob[]>({
    queryKey: ['dailyAudio', date?.getTime()],
    queryFn: async () => {
      if (!actor || !date) return [];
      const timestamp = BigInt(date.getTime() * 1000000);
      return actor.obtenirMediasAudioPourJour(timestamp);
    },
    enabled: !!actor && !isFetching && !!date,
  });
}

export function useSaveDailyMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      mediaType,
      relatedDay,
    }: {
      id: string;
      mediaType: MediaType;
      relatedDay: Date;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const timestamp = BigInt(relatedDay.getTime() * 1000000);
      return actor.enregistrerMediaQuotidien(id, mediaType, timestamp);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyMedia', variables.relatedDay.getTime()] });
      queryClient.invalidateQueries({ queryKey: ['dailyPhotos', variables.relatedDay.getTime()] });
      queryClient.invalidateQueries({ queryKey: ['dailyAudio', variables.relatedDay.getTime()] });
    },
  });
}

export function useDeleteDailyMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, relatedDay }: { id: string; relatedDay: Date }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.supprimerMediaQuotidien(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dailyMedia', variables.relatedDay.getTime()] });
      queryClient.invalidateQueries({ queryKey: ['dailyPhotos', variables.relatedDay.getTime()] });
      queryClient.invalidateQueries({ queryKey: ['dailyAudio', variables.relatedDay.getTime()] });
    },
  });
}

// Journal Entry Queries
export function useGetJournalEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<JournalEntry[]>({
    queryKey: ['journalEntries'],
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
    mutationFn: async ({
      id,
      audioUrl,
      transcription,
      notes,
      photos,
      dayType,
    }: {
      id: string;
      audioUrl: string;
      transcription: string;
      notes: string;
      photos: ExternalBlob[];
      dayType: DayType | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.enregistrerJournal(id, audioUrl, transcription, notes, photos, dayType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

export function useUpdateJournalEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      audioUrl,
      transcription,
      notes,
      photos,
      dayType,
    }: {
      id: string;
      audioUrl: string;
      transcription: string;
      notes: string;
      photos: ExternalBlob[];
      dayType: DayType | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.modifierJournal(id, audioUrl, transcription, notes, photos, dayType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.supprimerJournal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['vacationDaysCount'] });
      queryClient.invalidateQueries({ queryKey: ['onCallDaysCount'] });
    },
  });
}

// PDF Report Query
export function useGeneratePdfReportData() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      reportType,
      period,
    }: {
      reportType: 'weekly' | 'monthly';
      period: { week?: number; month?: number; year: number };
    }) => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('User not authenticated');

      const principal = identity.getPrincipal();

      if (reportType === 'weekly' && period.week !== undefined) {
        return actor.genererDonneesRapportPdf(
          { __kind__: 'semaine', semaine: [BigInt(period.week), BigInt(period.year)] },
          principal
        );
      } else if (reportType === 'monthly' && period.month !== undefined) {
        return actor.genererDonneesRapportPdf(
          { __kind__: 'mois', mois: [BigInt(period.month), BigInt(period.year)] },
          principal
        );
      }

      throw new Error('Invalid report parameters');
    },
  });
}
