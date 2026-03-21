import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface InterventionInput {
    id: string;
    date: Time;
    heureApremDebutMin: bigint;
    heureApremDebutH: bigint;
    heureApremFinH: bigint;
    signatureIntervenant: string;
    heureMatinFinH: bigint;
    description: string;
    clientAdresse: string;
    heureApremFinMin: bigint;
    pieces: Array<PieceUtilisee>;
    heureMatinDebutMin: bigint;
    signatureClient: string;
    clientNom: string;
    heureMatinDebutH: bigint;
    heureMatinFinMin: bigint;
}
export type Time = bigint;
export interface PieceUtilisee {
    reference: string;
    article: string;
    quantite: bigint;
}
export interface InterventionAvecPieces {
    id: string;
    date: Time;
    createdAt: Time;
    user: Principal;
    heureApremDebutMin: bigint;
    heureApremDebutH: bigint;
    heureApremFinH: bigint;
    signatureIntervenant: string;
    heureMatinFinH: bigint;
    description: string;
    clientAdresse: string;
    heureApremFinMin: bigint;
    pieces: Array<PieceUtilisee>;
    heureMatinDebutMin: bigint;
    signatureClient: string;
    clientNom: string;
    heureMatinDebutH: bigint;
    heureMatinFinMin: bigint;
}
export interface DailyMediaEntry {
    id: string;
    createdAt: Time;
    user: Principal;
    relatedDay: Time;
    mediaType: MediaType;
}
export interface JournalEntry {
    id: string;
    createdAt: Time;
    user: Principal;
    audioUrl: string;
    transcription: string;
    notes: string;
    dayType?: DayType;
    photos: Array<ExternalBlob>;
}
export interface Fichier {
    id: bigint;
    nom: string;
    url: string;
    contenu: ExternalBlob;
    description: string;
    taille: bigint;
    typeMime: string;
    proprietaire: Principal;
    dateAjout: Time;
}
export interface TimeEntryInput {
    id: string;
    heuresTrajet: bigint;
    date: Time;
    description: string;
    startMorning: bigint;
    endAstreinte?: bigint;
    interventionSlots: Array<InterventionSlot>;
    startAstreinte?: bigint;
    endMorning: bigint;
    endAfternoon: bigint;
    typeOfDay: DayType;
    heuresRepas: bigint;
    startAfternoon: bigint;
}
export interface Totals {
    heuresTrajet: bigint;
    heuresTravailNormales: bigint;
    heuresAstreinte: bigint;
    heuresRepas: bigint;
}
export interface InterventionSlot {
    endHour: bigint;
    endMinute: bigint;
    startMinute: bigint;
    startHour: bigint;
}
export interface PdfReportData {
    titre: string;
    enteteTableau: Array<string>;
    periode: string;
    totaux: {
        heuresTrajet: string;
        heuresTravailNormales: string;
        heuresAstreinte: string;
        heuresRepas: string;
    };
    exportTimestamp: Time;
    lignesTableau: Array<Array<string>>;
}
export type MediaType = {
    __kind__: "audio";
    audio: ExternalBlob;
} | {
    __kind__: "photo";
    photo: ExternalBlob;
};
export interface Client {
    id: string;
    nom: string;
    createdAt: Time;
    email: string;
    adresse: string;
    listeNoire: boolean;
    telephone: string;
}
export interface UserProfile {
    name: string;
    email: string;
}
export interface TimeEntry {
    id: string;
    heuresTrajet: bigint;
    date: Time;
    user: Principal;
    description: string;
    startMorning: bigint;
    endAstreinte?: bigint;
    interventionSlots: Array<InterventionSlot>;
    startAstreinte?: bigint;
    endMorning: bigint;
    endAfternoon: bigint;
    typeOfDay: DayType;
    heuresRepas: bigint;
    startAfternoon: bigint;
}
export enum DayType {
    conge = "conge",
    work = "work",
    astreinte = "astreinte"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    ajouterClient(client: Client): Promise<void>;
    ajouterIntervention(input: InterventionInput): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    basculerListeNoire(id: string): Promise<void>;
    calculerNombreAstreinte(user: Principal): Promise<bigint>;
    calculerNombreConge(user: Principal): Promise<bigint>;
    calculerTotaux(): Promise<Totals>;
    calculerTotauxPourMois(user: Principal, mois: bigint, annee: bigint): Promise<Totals>;
    calculerTotauxPourSemaine(user: Principal, semaine: bigint, annee: bigint): Promise<Totals>;
    calculerTotauxPourUtilisateur(user: Principal): Promise<Totals>;
    enregistrerJournal(id: string, audioUrl: string, transcription: string, notes: string, photos: Array<ExternalBlob>, dayType: DayType | null): Promise<void>;
    enregistrerJournee(input: TimeEntryInput): Promise<void>;
    enregistrerMediaQuotidien(id: string, mediaType: MediaType, relatedDay: Time): Promise<void>;
    genererDonneesRapportPdf(typePeriode: {
        __kind__: "semaine";
        semaine: [bigint, bigint];
    } | {
        __kind__: "mois";
        mois: [bigint, bigint];
    }, user: Principal): Promise<PdfReportData>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listerFichiers(): Promise<Array<Fichier>>;
    modifierClient(id: string, client: Client): Promise<void>;
    modifierIntervention(id: string, input: InterventionInput): Promise<void>;
    modifierJournal(id: string, audioUrl: string, transcription: string, notes: string, photos: Array<ExternalBlob>, dayType: DayType | null): Promise<void>;
    modifierJournee(id: string, input: TimeEntryInput): Promise<void>;
    obtenirClients(): Promise<Array<Client>>;
    obtenirInterventionsPourJour(date: Time): Promise<Array<InterventionAvecPieces>>;
    obtenirJournaux(): Promise<Array<JournalEntry>>;
    obtenirJournees(): Promise<Array<TimeEntry>>;
    obtenirInterventionsPubliques(user: Principal): Promise<Array<InterventionAvecPieces>>;
    obtenirJourneesPubliques(user: Principal): Promise<Array<TimeEntry>>;
    obtenirTousLesProfils(): Promise<Array<[Principal, UserProfile]>>;
    obtenirMediasAudioPourJour(date: Time): Promise<Array<ExternalBlob>>;
    obtenirMediasPourJour(date: Time): Promise<Array<DailyMediaEntry>>;
    obtenirPhotosPourJour(date: Time): Promise<Array<ExternalBlob>>;
    rechercherFichiers(_motCle: string): Promise<Array<Fichier>>;
    recupererFichier(_id: bigint): Promise<Fichier | null>;
    restartPublish(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    supprimerClient(id: string): Promise<void>;
    supprimerFichier(_id: bigint): Promise<boolean>;
    supprimerIntervention(id: string): Promise<void>;
    supprimerJournal(id: string): Promise<void>;
    supprimerJournee(id: string): Promise<void>;
    supprimerMediaQuotidien(id: string): Promise<void>;
    uploadPhotoDansStoic(filename: string, content: ExternalBlob, mimeType: string, taille: bigint, description: string): Promise<bigint | null>;
}
