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
export interface Mission {
    id: string;
    statut: string;
    titre: string;
    typeMission: string;
    createur: Principal;
    datePrevue: Time;
    description: string;
    nomClient: string;
    nomDestinataire: string;
    nomCreateur: string;
    destinataire: Principal;
    dateCreation: Time;
}
export interface PlanningItem {
    id: string;
    statut: string;
    titre: string;
    typeMission: string;
    createur: Principal;
    createdAt: Time;
    description: string;
    nomDestinataire: string;
    nomCreateur: string;
    destinataire: Principal;
    clientNom: string;
    dates: Array<Time>;
}
export type Time = bigint;
export type MediaType = {
    __kind__: "audio";
    audio: ExternalBlob;
} | {
    __kind__: "photo";
    photo: ExternalBlob;
};
export interface InterventionSlot {
    endHour: bigint;
    endMinute: bigint;
    startMinute: bigint;
    startHour: bigint;
}
export interface InterventionInput {
    id: string;
    clientAbsent: boolean;
    estAstreinte: boolean;
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
    videos: Array<ExternalBlob>;
    heureMatinFinMin: bigint;
    photos: Array<ExternalBlob>;
}
export interface PieceUtilisee {
    reference: string;
    article: string;
    quantite: bigint;
}
export interface InterventionAvecPieces {
    id: string;
    clientAbsent: boolean;
    estAstreinte: boolean;
    date: Time;
    createdAt: Time;
    user: Principal;
    valide: boolean;
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
    nomUtilisateur: string;
    clientNom: string;
    heureMatinDebutH: bigint;
    videos: Array<ExternalBlob>;
    heureMatinFinMin: bigint;
    photos: Array<ExternalBlob>;
}
export interface DailyMediaEntry {
    id: string;
    createdAt: Time;
    user: Principal;
    relatedDay: Time;
    mediaType: MediaType;
}
export interface Client {
    id: string;
    nom: string;
    createdAt: Time;
    email: string;
    adresse: string;
    listeNoire: boolean;
    telephone: string;
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
export interface MemoEntry {
    id: string;
    content: string;
    createdAt: Time;
    createdBy: Principal;
    authorName: string;
    videos: Array<ExternalBlob>;
    photos: Array<ExternalBlob>;
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
export interface TicketEssence {
    id: string;
    userId: Principal;
    date: Time;
    createdAt: Time;
    adBluePrixLitre?: number;
    immatriculation: string;
    kmTotal: bigint;
    nomUtilisateur: string;
    montant: number;
    prixLitre: number;
    adBlueMontant?: number;
    typeVehicule: string;
}
export interface TicketResto {
    id: string;
    userId: Principal;
    date: Time;
    createdAt: Time;
    semaineKey: string;
    jourSemaine: string;
    nomUtilisateur: string;
    montant: number;
}
export interface VehiculeDefaut {
    lastAdBlueMontant?: number;
    immatriculation: string;
    typeVehicule: string;
    lastAdBluePrixLitre?: number;
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
export interface UserProfile {
    name: string;
    signatureIntervenant?: string;
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
    accepterMission(id: string): Promise<void>;
    accepterPlanningItem(id: string): Promise<void>;
    ajouterClient(client: Client): Promise<void>;
    ajouterIntervention(input: InterventionInput): Promise<void>;
    ajouterInterventionPourUtilisateur(targetUser: Principal, input: InterventionInput): Promise<void>;
    ajouterTicketEssence(ticket: TicketEssence): Promise<void>;
    ajouterTicketResto(ticket: TicketResto): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    basculerListeNoire(id: string): Promise<void>;
    calculerNombreAstreinte(user: Principal): Promise<bigint>;
    calculerNombreConge(user: Principal): Promise<bigint>;
    calculerTotaux(): Promise<Totals>;
    calculerTotauxPourMois(user: Principal, mois: bigint, annee: bigint): Promise<Totals>;
    calculerTotauxPourSemaine(user: Principal, semaine: bigint, annee: bigint): Promise<Totals>;
    calculerTotauxPourUtilisateur(user: Principal): Promise<Totals>;
    compterMissionsEnAttentePourMoi(): Promise<bigint>;
    creerMemo(id: string, authorName: string, content: string, photos: Array<ExternalBlob>, videos: Array<ExternalBlob>): Promise<void>;
    creerMission(id: string, titre: string, datePrevue: Time, destinataire: Principal, nomDestinataire: string, nomCreateur: string, nomClient: string, typeMission: string, description: string): Promise<void>;
    creerPlanningItem(id: string, titre: string, dates: Array<Time>, destinataire: Principal, nomDestinataire: string, nomCreateur: string, clientNom: string, typeMission: string, description: string): Promise<void>;
    enregistrerJournal(id: string, audioUrl: string, transcription: string, notes: string, photos: Array<ExternalBlob>, dayType: DayType | null): Promise<void>;
    enregistrerJournee(input: TimeEntryInput): Promise<void>;
    enregistrerMediaQuotidien(id: string, mediaType: MediaType, relatedDay: Time): Promise<void>;
    estInterventionValidee(id: string): Promise<boolean>;
    genererDonneesRapportPdf(typePeriode: {
        __kind__: "semaine";
        semaine: [bigint, bigint];
    } | {
        __kind__: "mois";
        mois: [bigint, bigint];
    }, user: Principal): Promise<PdfReportData>;
    getAllCreatedMissionsForCreators(): Promise<Array<Mission>>;
    getAllPendingMissionsForEveryone(): Promise<Array<Mission>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listerFichiers(): Promise<Array<Fichier>>;
    modifierClient(id: string, client: Client): Promise<void>;
    modifierDatesPlanningItem(id: string, newDates: Array<Time>): Promise<void>;
    modifierIntervention(id: string, input: InterventionInput): Promise<void>;
    modifierJournal(id: string, audioUrl: string, transcription: string, notes: string, photos: Array<ExternalBlob>, dayType: DayType | null): Promise<void>;
    modifierJournee(id: string, input: TimeEntryInput): Promise<void>;
    obtenirClients(): Promise<Array<Client>>;
    obtenirInterventionsPourJour(date: Time): Promise<Array<InterventionAvecPieces>>;
    obtenirInterventionsPubliques(user: Principal): Promise<Array<InterventionAvecPieces>>;
    obtenirJournaux(): Promise<Array<JournalEntry>>;
    obtenirJournees(): Promise<Array<TimeEntry>>;
    obtenirJourneesPubliques(user: Principal): Promise<Array<TimeEntry>>;
    obtenirMediasAudioPourJour(date: Time): Promise<Array<ExternalBlob>>;
    obtenirMediasPourJour(date: Time): Promise<Array<DailyMediaEntry>>;
    obtenirMemos(): Promise<Array<MemoEntry>>;
    obtenirMissionsCreees(): Promise<Array<Mission>>;
    obtenirMissionsRecues(): Promise<Array<Mission>>;
    obtenirPhotosPourJour(date: Time): Promise<Array<ExternalBlob>>;
    obtenirPlanningItemsPourJour(date: Time): Promise<Array<PlanningItem>>;
    obtenirSignatureIntervenant(): Promise<string | null>;
    obtenirTicketsEssence(): Promise<Array<TicketEssence>>;
    obtenirTicketsResto(): Promise<Array<TicketResto>>;
    obtenirTousLesProfils(): Promise<Array<[Principal, UserProfile]>>;
    supprimerProfil(userId: Principal): Promise<undefined>;
    obtenirTousPlanningItems(): Promise<Array<PlanningItem>>;
    obtenirToutesInterventions(): Promise<Array<InterventionAvecPieces>>;
    obtenirToutesInterventionsPourFacturation(): Promise<Array<InterventionAvecPieces>>;
    obtenirToutesMissionsAcceptees(): Promise<Array<Mission>>;
    obtenirVehiculeDefaut(): Promise<VehiculeDefaut | null>;
    rechercherFichiers(_motCle: string): Promise<Array<Fichier>>;
    recupererFichier(_id: bigint): Promise<Fichier | null>;
    redigerMissionVersAutre(id: string, nouveauDestinataire: Principal, nomNouveauDestinataire: string): Promise<void>;
    restartPublish(): Promise<void>;
    sauvegarderSignatureIntervenant(sig: string): Promise<void>;
    sauverVehiculeDefaut(vehicule: VehiculeDefaut): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    supprimerClient(id: string): Promise<void>;
    supprimerDeFacturation(id: string): Promise<void>;
    supprimerFichier(_id: bigint): Promise<boolean>;
    supprimerIntervention(id: string): Promise<void>;
    supprimerJournal(id: string): Promise<void>;
    supprimerInterventionDraft(planningItemId: string, interventionId: string): Promise<void>;
    supprimerJournee(id: string): Promise<void>;
    supprimerMediaQuotidien(id: string): Promise<void>;
    supprimerMemo(id: string): Promise<void>;
    supprimerMission(id: string): Promise<void>;
    supprimerPlanningItem(id: string): Promise<void>;
    validerPlanningItem(id: string): Promise<void>;
    supprimerTicketEssence(id: string): Promise<boolean>;
    supprimerTicketResto(id: string): Promise<boolean>;
    uploadPhotoDansStoic(filename: string, content: ExternalBlob, mimeType: string, taille: bigint, description: string): Promise<bigint | null>;
    validerIntervention(id: string): Promise<void>;
}
