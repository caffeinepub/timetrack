import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";

import Nat "mo:core/Nat";



actor {
  include MixinStorage();

  public type DayType = {
    #work;
    #conge;
    #astreinte;
  };

  public type InterventionSlot = {
    startHour : Int;
    startMinute : Int;
    endHour : Int;
    endMinute : Int;
  };

  type TimeEntry = {
    id : Text;
    date : Time.Time;
    startMorning : Int;
    endMorning : Int;
    startAfternoon : Int;
    endAfternoon : Int;
    heuresRepas : Int;
    heuresTrajet : Int;
    startAstreinte : ?Int;
    endAstreinte : ?Int;
    typeOfDay : DayType;
    user : Principal;
    description : Text;
    interventionSlots : [InterventionSlot];
  };

  module TimeEntry {
    public func compareByDate(entry1 : TimeEntry, entry2 : TimeEntry) : Order.Order {
      Int.compare(entry1.date, entry2.date);
    };
  };

  type TimeEntryInput = {
    id : Text;
    date : Time.Time;
    startMorning : Int;
    endMorning : Int;
    startAfternoon : Int;
    endAfternoon : Int;
    heuresRepas : Int;
    heuresTrajet : Int;
    startAstreinte : ?Int;
    endAstreinte : ?Int;
    typeOfDay : DayType;
    description : Text;
    interventionSlots : [InterventionSlot];
  };

  public type MediaType = {
    #photo : Storage.ExternalBlob;
    #audio : Storage.ExternalBlob;
  };

  public type DailyMediaEntry = {
    id : Text;
    user : Principal;
    mediaType : MediaType;
    relatedDay : Time.Time;
    createdAt : Time.Time;
  };

  module DailyMediaEntry {
    public func compareByCreatedAt(entry1 : DailyMediaEntry, entry2 : DailyMediaEntry) : Order.Order {
      Int.compare(entry1.createdAt, entry2.createdAt);
    };
  };

  type JournalEntry = {
    id : Text;
    user : Principal;
    audioUrl : Text;
    transcription : Text;
    notes : Text;
    photos : [Storage.ExternalBlob];
    createdAt : Time.Time;
    dayType : ?DayType;
  };

  module JournalEntry {
    public func compareByCreatedAt(entry1 : JournalEntry, entry2 : JournalEntry) : Order.Order {
      Int.compare(entry1.createdAt, entry2.createdAt);
    };
  };

  // MemoEntry: public memo section (replaces journal in frontend)
  public type MemoEntry = {
    id : Text;
    authorName : Text;
    content : Text;
    photos : [Storage.ExternalBlob];
    videos : [Storage.ExternalBlob];
    createdAt : Time.Time;
    createdBy : Principal;
  };

  module MemoEntry {
    public func compareByCreatedAt(entry1 : MemoEntry, entry2 : MemoEntry) : Order.Order {
      // Descending: newest first
      Int.compare(entry2.createdAt, entry1.createdAt);
    };
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  public type Totals = {
    heuresTravailNormales : Int;
    heuresAstreinte : Int;
    heuresRepas : Int;
    heuresTrajet : Int;
  };

  public type PdfReportData = {
    titre : Text;
    periode : Text;
    enteteTableau : [Text];
    lignesTableau : [[Text]];
    totaux : {
      heuresTravailNormales : Text;
      heuresAstreinte : Text;
      heuresRepas : Text;
      heuresTrajet : Text;
    };
    exportTimestamp : Time.Time;
  };

  public type Fichier = {
    id : Nat;
    nom : Text;
    taille : Nat;
    typeMime : Text;
    contenu : Storage.ExternalBlob;
    url : Text;
    dateAjout : Time.Time;
    proprietaire : Principal;
    description : Text;
  };

  public type Client = {
    id : Text;
    nom : Text;
    adresse : Text;
    telephone : Text;
    email : Text;
    listeNoire : Bool;
    createdAt : Time.Time;
  };

  // Intervention type
  public type PieceUtilisee = {
    reference : Text;
    article : Text;
    quantite : Int;
  };

  // Intervention stored (photos/videos optional for backward compat)
  public type Intervention = {
    id : Text;
    date : Time.Time;
    clientNom : Text;
    clientAdresse : Text;
    heureMatinDebutH : Int;
    heureMatinDebutMin : Int;
    heureMatinFinH : Int;
    heureMatinFinMin : Int;
    heureApremDebutH : Int;
    heureApremDebutMin : Int;
    heureApremFinH : Int;
    heureApremFinMin : Int;
    description : Text;
    signatureClient : Text;
    signatureIntervenant : Text;
    user : Principal;
    createdAt : Time.Time;
  };

  // Intervention with pieces merged in (returned to frontend)
  public type InterventionAvecPieces = {
    id : Text;
    date : Time.Time;
    clientNom : Text;
    clientAdresse : Text;
    heureMatinDebutH : Int;
    heureMatinDebutMin : Int;
    heureMatinFinH : Int;
    heureMatinFinMin : Int;
    heureApremDebutH : Int;
    heureApremDebutMin : Int;
    heureApremFinH : Int;
    heureApremFinMin : Int;
    description : Text;
    signatureClient : Text;
    signatureIntervenant : Text;
    pieces : [PieceUtilisee];
    user : Principal;
    createdAt : Time.Time;
    photos : [Storage.ExternalBlob];
    videos : [Storage.ExternalBlob];
  };

  public type InterventionInput = {
    id : Text;
    date : Time.Time;
    clientNom : Text;
    clientAdresse : Text;
    heureMatinDebutH : Int;
    heureMatinDebutMin : Int;
    heureMatinFinH : Int;
    heureMatinFinMin : Int;
    heureApremDebutH : Int;
    heureApremDebutMin : Int;
    heureApremFinH : Int;
    heureApremFinMin : Int;
    description : Text;
    signatureClient : Text;
    signatureIntervenant : Text;
    pieces : [PieceUtilisee];
    photos : [Storage.ExternalBlob];
    videos : [Storage.ExternalBlob];
  };

  // Helper to convert Intervention to InterventionAvecPieces
  func interventionAvecPieces(i : Intervention) : InterventionAvecPieces {
    let pieces = switch (interventionPieces.get(i.id)) {
      case (?p) { p };
      case (null) { [] };
    };
    let photos = switch (interventionPhotos.get(i.id)) {
      case (?p) { p };
      case (null) { [] };
    };
    let videos = switch (interventionVideos.get(i.id)) {
      case (?v) { v };
      case (null) { [] };
    };
    {
      id = i.id;
      date = i.date;
      clientNom = i.clientNom;
      clientAdresse = i.clientAdresse;
      heureMatinDebutH = i.heureMatinDebutH;
      heureMatinDebutMin = i.heureMatinDebutMin;
      heureMatinFinH = i.heureMatinFinH;
      heureMatinFinMin = i.heureMatinFinMin;
      heureApremDebutH = i.heureApremDebutH;
      heureApremDebutMin = i.heureApremDebutMin;
      heureApremFinH = i.heureApremFinH;
      heureApremFinMin = i.heureApremFinMin;
      description = i.description;
      signatureClient = i.signatureClient;
      signatureIntervenant = i.signatureIntervenant;
      pieces;
      user = i.user;
      createdAt = i.createdAt;
      photos;
      videos;
    };
  };

  // Persistent storage
  let timeEntries = Map.empty<Text, TimeEntry>();
  let journalEntries = Map.empty<Text, JournalEntry>();
  let dailyMediaEntries = Map.empty<Text, DailyMediaEntry>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var fichiersStockes = Map.empty<Nat, Fichier>();
  var compteurFichiers : Nat = 0;
  let clients = Map.empty<Text, Client>();
  let interventions = Map.empty<Text, Intervention>();
  let interventionPieces = Map.empty<Text, [PieceUtilisee]>();
  let interventionPhotos = Map.empty<Text, [Storage.ExternalBlob]>();
  let interventionVideos = Map.empty<Text, [Storage.ExternalBlob]>();
  let memoEntries = Map.empty<Text, MemoEntry>();

  // Autorisation système
  let accessControlState = AccessControl.initState();

  // Sécurité et gestion des utilisateurs
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // -------- MEMO FUNCTIONS (public section) --------

  public shared ({ caller }) func creerMemo(id : Text, authorName : Text, content : Text, photos : [Storage.ExternalBlob], videos : [Storage.ExternalBlob]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent créer des mémos");
    };
    let entry : MemoEntry = {
      id;
      authorName;
      content;
      photos;
      videos;
      createdAt = Time.now();
      createdBy = caller;
    };
    memoEntries.add(id, entry);
  };

  // Public query - no authentication required
  public query func obtenirMemos() : async [MemoEntry] {
    let entries = memoEntries.values().toArray();
    entries.sort(MemoEntry.compareByCreatedAt);
  };

  public shared ({ caller }) func supprimerMemo(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent supprimer des mémos");
    };
    switch (memoEntries.get(id)) {
      case (null) { Runtime.trap("Mémo non trouvé") };
      case (?entry) {
        if (entry.createdBy != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez supprimer que vos propres mémos");
        };
      };
    };
    memoEntries.remove(id);
  };

  // -------- CLIENT FUNCTIONS --------

  public shared ({ caller }) func ajouterClient(client : Client) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent ajouter des clients");
    };
    clients.add(client.id, client);
  };

  public shared ({ caller }) func modifierClient(id : Text, client : Client) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent modifier des clients");
    };
    clients.add(id, client);
  };

  public shared ({ caller }) func supprimerClient(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent supprimer des clients");
    };
    clients.remove(id);
  };

  public query ({ caller }) func obtenirClients() : async [Client] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent consulter les clients");
    };
    clients.values().toArray();
  };

  public shared ({ caller }) func basculerListeNoire(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent basculer le statut de liste noire");
    };
    
    switch (clients.get(id)) {
      case (null) {
        Runtime.trap("Client non trouvé");
      };
      case (?existingClient) {
        let updatedClient : Client = {
          id = existingClient.id;
          nom = existingClient.nom;
          adresse = existingClient.adresse;
          telephone = existingClient.telephone;
          email = existingClient.email;
          listeNoire = not existingClient.listeNoire;
          createdAt = existingClient.createdAt;
        };
        clients.add(id, updatedClient);
      };
    };
  };

  // -------- INTERVENTION FUNCTIONS --------

  public shared ({ caller }) func ajouterIntervention(input : InterventionInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé");
    };
    let intervention : Intervention = {
      id = input.id;
      date = input.date;
      clientNom = input.clientNom;
      clientAdresse = input.clientAdresse;
      heureMatinDebutH = input.heureMatinDebutH;
      heureMatinDebutMin = input.heureMatinDebutMin;
      heureMatinFinH = input.heureMatinFinH;
      heureMatinFinMin = input.heureMatinFinMin;
      heureApremDebutH = input.heureApremDebutH;
      heureApremDebutMin = input.heureApremDebutMin;
      heureApremFinH = input.heureApremFinH;
      heureApremFinMin = input.heureApremFinMin;
      description = input.description;
      signatureClient = input.signatureClient;
      signatureIntervenant = input.signatureIntervenant;
      user = caller;
      createdAt = Time.now();
    };
    interventions.add(input.id, intervention);
    interventionPieces.add(input.id, input.pieces);
    interventionPhotos.add(input.id, input.photos);
    interventionVideos.add(input.id, input.videos);
  };

  public shared ({ caller }) func modifierIntervention(id : Text, input : InterventionInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé");
    };
    switch (interventions.get(id)) {
      case (null) { /* not found: will create */ };
      case (?existing) {
        if (existing.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé");
        };
      };
    };
    let intervention : Intervention = {
      id;
      date = input.date;
      clientNom = input.clientNom;
      clientAdresse = input.clientAdresse;
      heureMatinDebutH = input.heureMatinDebutH;
      heureMatinDebutMin = input.heureMatinDebutMin;
      heureMatinFinH = input.heureMatinFinH;
      heureMatinFinMin = input.heureMatinFinMin;
      heureApremDebutH = input.heureApremDebutH;
      heureApremDebutMin = input.heureApremDebutMin;
      heureApremFinH = input.heureApremFinH;
      heureApremFinMin = input.heureApremFinMin;
      description = input.description;
      signatureClient = input.signatureClient;
      signatureIntervenant = input.signatureIntervenant;
      user = caller;
      createdAt = Time.now();
    };
    interventions.add(id, intervention);
    interventionPieces.add(id, input.pieces);
    interventionPhotos.add(id, input.photos);
    interventionVideos.add(id, input.videos);
  };

  public shared ({ caller }) func supprimerIntervention(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé");
    };
    switch (interventions.get(id)) {
      case (null) { Runtime.trap("Intervention non trouvée") };
      case (?existing) {
        if (existing.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé");
        };
      };
    };
    interventions.remove(id);
  };

  public query ({ caller }) func obtenirInterventionsPourJour(date : Time.Time) : async [InterventionAvecPieces] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    interventions.values().filter(func(i : Intervention) : Bool {
      i.date == date and (i.user == caller or isAdmin)
    }).map(interventionAvecPieces).toArray();
  };

  public query ({ caller }) func obtenirToutesInterventions() : async [InterventionAvecPieces] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorise");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let sorted = interventions.values().filter(func(i : Intervention) : Bool {
      i.user == caller or isAdmin
    }).map(interventionAvecPieces).toArray();
    sorted.sort(func(a : InterventionAvecPieces, b : InterventionAvecPieces) : Order.Order {
      Int.compare(a.date, b.date)
    });
  };

  // -------- FILE FUNCTIONS --------

  public shared ({ caller }) func uploadPhotoDansStoic(filename : Text, content : Storage.ExternalBlob, mimeType : Text, taille : Nat, description : Text) : async ?Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent upload des medias");
    };

    let tailleMaxAutorisee = 10_000_000;

    if (taille > tailleMaxAutorisee) {
      Runtime.trap("Fichier trop volumineux. Limite = 10MB");
    };

    let nouveauId = compteurFichiers;
    compteurFichiers += 1;

    let url = "/fichier/" # nouveauId.toText();

    let fichier : Fichier = {
      id = nouveauId;
      nom = filename;
      taille;
      typeMime = mimeType;
      contenu = content;
      url;
      dateAjout = Time.now();
      proprietaire = caller;
      description;
    };

    fichiersStockes.add(nouveauId, fichier);

    ?nouveauId;
  };

  public query ({ caller }) func listerFichiers() : async [Fichier] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent lister les fichiers");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    
    if (isAdmin) {
      fichiersStockes.values().toArray();
    } else {
      fichiersStockes.values().filter(func(fichier : Fichier) : Bool {
        fichier.proprietaire == caller
      }).toArray();
    };
  };

  public query ({ caller }) func recupererFichier(_id : Nat) : async ?Fichier {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent récupérer les fichiers");
    };

    switch (fichiersStockes.get(_id)) {
      case (null) { null };
      case (?fichier) {
        if (fichier.proprietaire == caller or AccessControl.isAdmin(accessControlState, caller)) {
          ?fichier;
        } else {
          Runtime.trap("Non autorisé : vous ne pouvez accéder qu'à vos propres fichiers");
        };
      };
    };
  };

  public query ({ caller }) func rechercherFichiers(_motCle: Text) : async [Fichier] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent rechercher les fichiers");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    
    if (isAdmin) {
      fichiersStockes.values().toArray();
    } else {
      fichiersStockes.values().filter(func(fichier : Fichier) : Bool {
        fichier.proprietaire == caller
      }).toArray();
    };
  };

  public shared ({ caller }) func supprimerFichier(_id : Nat) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent supprimer les fichiers");
    };

    switch (fichiersStockes.get(_id)) {
      case (null) { false };
      case (?fichier) {
        if (fichier.proprietaire != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez supprimer que vos propres fichiers");
        };
        fichiersStockes.remove(_id);
        true;
      };
    };
  };

  // -------- USER PROFILE FUNCTIONS --------

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent récupérer les profils");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent consulter les profils");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez consulter que votre propre profil");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent enregistrer des profils");
    };
    userProfiles.add(caller, profile);
  };

  // Public functions (no authentication required)
  public query func obtenirTousLesProfils() : async [(Principal, UserProfile)] {
    userProfiles.entries().toArray()
  };

  public query func obtenirJourneesPubliques(user : Principal) : async [TimeEntry] {
    let entries = timeEntries.values();
    let filtered = entries.filter(func(entry : TimeEntry) : Bool { entry.user == user }).toArray();
    filtered.sort(TimeEntry.compareByDate);
  };

  public query func obtenirInterventionsPubliques(user : Principal) : async [InterventionAvecPieces] {
    let filtered = interventions.values().filter(func(i : Intervention) : Bool {
      i.user == user
    }).map(interventionAvecPieces).toArray();
    filtered.sort(func(a : InterventionAvecPieces, b : InterventionAvecPieces) : Order.Order {
      Int.compare(a.date, b.date)
    });
  };

  // -------- DAILY ENTRY FUNCTIONS --------

  public shared ({ caller }) func enregistrerJournee(input : TimeEntryInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent enregistrer des journées");
    };

    let timeEntry : TimeEntry = {
      id = input.id;
      date = input.date;
      startMorning = input.startMorning;
      endMorning = input.endMorning;
      startAfternoon = input.startAfternoon;
      endAfternoon = input.endAfternoon;
      typeOfDay = input.typeOfDay;
      heuresRepas = input.heuresRepas;
      heuresTrajet = input.heuresTrajet;
      startAstreinte = input.startAstreinte;
      endAstreinte = input.endAstreinte;
      user = caller;
      description = input.description;
      interventionSlots = input.interventionSlots;
    };
    timeEntries.add(input.id, timeEntry);
  };

  public shared ({ caller }) func modifierJournee(id : Text, input : TimeEntryInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent modifier les journées");
    };

    switch (timeEntries.get(id)) {
      case (null) {
        Runtime.trap("Journée non trouvée");
      };
      case (?existingEntry) {
        if (existingEntry.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez modifier que vos propres journées");
        };
      };
    };

    let timeEntry : TimeEntry = {
      id;
      date = input.date;
      startMorning = input.startMorning;
      endMorning = input.endMorning;
      startAfternoon = input.startAfternoon;
      endAfternoon = input.endAfternoon;
      typeOfDay = input.typeOfDay;
      heuresRepas = input.heuresRepas;
      heuresTrajet = input.heuresTrajet;
      startAstreinte = input.startAstreinte;
      endAstreinte = input.endAstreinte;
      user = caller;
      description = input.description;
      interventionSlots = input.interventionSlots;
    };
    timeEntries.add(id, timeEntry);
  };

  public shared ({ caller }) func supprimerJournee(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent supprimer les journées");
    };

    switch (timeEntries.get(id)) {
      case (null) {
        Runtime.trap("Journée non trouvée");
      };
      case (?existingEntry) {
        if (existingEntry.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez supprimer que vos propres journées");
        };
      };
    };

    timeEntries.remove(id);
  };

  public query ({ caller }) func obtenirJournees() : async [TimeEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent récupérer les journées");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let entries = timeEntries.values();
    let filteredEntries = if (isAdmin) {
      entries.toArray();
    } else {
      entries.filter(func(entry : TimeEntry) : Bool { entry.user == caller }).toArray();
    };
    filteredEntries.sort(TimeEntry.compareByDate);
  };

  // -------- DAILY MEDIA FUNCTIONS --------

  public shared ({ caller }) func enregistrerMediaQuotidien(id : Text, mediaType : MediaType, relatedDay : Time.Time) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé: seuls les utilisateurs peuvent enregistrer des médias quotidiens");
    };

    let entry : DailyMediaEntry = {
      id;
      user = caller;
      mediaType;
      relatedDay;
      createdAt = Time.now();
    };

    dailyMediaEntries.add(id, entry);
  };

  public shared ({ caller }) func supprimerMediaQuotidien(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé: seuls les utilisateurs peuvent supprimer des médias quotidiens");
    };

    switch (dailyMediaEntries.get(id)) {
      case (null) {
        Runtime.trap("Média quotidien non trouvé");
      };
      case (?existingEntry) {
        if (existingEntry.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez supprimer que vos propres médias quotidiens");
        };
      };
    };

    dailyMediaEntries.remove(id);
  };

  public query ({ caller }) func obtenirMediasPourJour(date : Time.Time) : async [DailyMediaEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé: seuls les utilisateurs peuvent récupérer les médias quotidiens");
    };

    let entries = dailyMediaEntries.values();
    let filteredEntries = entries.filter(
      func(entry) {
        entry.relatedDay == date and (entry.user == caller or AccessControl.isAdmin(accessControlState, caller));
      }
    );
    filteredEntries.toArray();
  };

  public query ({ caller }) func obtenirMediasAudioPourJour(date : Time.Time) : async [Storage.ExternalBlob] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé: seuls les utilisateurs peuvent récupérer les médias audio quotidiens");
    };

    let entries = dailyMediaEntries.values();
    let filteredEntries = entries.filter(
      func(entry) {
        entry.relatedDay == date and (switch (entry.mediaType) { case (#audio(_)) { true }; case (_) { false } }) and (entry.user == caller or AccessControl.isAdmin(accessControlState, caller));
      }
    ).toArray();

    filteredEntries.map(func(entry) { switch (entry.mediaType) { case (#audio(blob)) { blob }; case (_) { Runtime.trap("Media type is not audio") } } });
  };

  public query ({ caller }) func obtenirPhotosPourJour(date : Time.Time) : async [Storage.ExternalBlob] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé: seuls les utilisateurs peuvent récupérer les photos quotidiennes");
    };

    let entries = dailyMediaEntries.values();
    let filteredEntries = entries.filter(
      func(entry) {
        entry.relatedDay == date and (switch (entry.mediaType) { case (#photo(_)) { true }; case (_) { false } }) and (entry.user == caller or AccessControl.isAdmin(accessControlState, caller));
      }
    ).toArray();

    filteredEntries.map(func(entry) { switch (entry.mediaType) { case (#photo(blob)) { blob }; case (_) { Runtime.trap("Media type is not photo") } } });
  };

  // -------- JOURNAL FUNCTIONS (kept for compatibility) --------

  public shared ({ caller }) func enregistrerJournal(id : Text, audioUrl : Text, transcription : Text, notes : Text, photos : [Storage.ExternalBlob], dayType : ?DayType) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent enregistrer des entrées de journal");
    };

    let entry : JournalEntry = {
      id;
      user = caller;
      audioUrl;
      transcription;
      notes;
      photos;
      createdAt = Time.now();
      dayType;
    };

    journalEntries.add(id, entry);
  };

  public shared ({ caller }) func modifierJournal(id : Text, audioUrl : Text, transcription : Text, notes : Text, photos : [Storage.ExternalBlob], dayType : ?DayType) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent modifier les entrées de journal");
    };

    switch (journalEntries.get(id)) {
      case (null) {
        Runtime.trap("Entrée de journal non trouvée");
      };
      case (?existingEntry) {
        if (existingEntry.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez modifier que vos propres entrées de journal");
        };
      };
    };

    let entry : JournalEntry = {
      id;
      user = caller;
      audioUrl;
      transcription;
      notes;
      photos;
      createdAt = Time.now();
      dayType;
    };

    journalEntries.add(id, entry);
  };

  public shared ({ caller }) func supprimerJournal(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent supprimer les entrées de journal");
    };

    switch (journalEntries.get(id)) {
      case (null) {
        Runtime.trap("Entrée de journal non trouvée");
      };
      case (?existingEntry) {
        if (existingEntry.user != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Non autorisé : vous ne pouvez supprimer que vos propres entrées de journal");
        };
      };
    };

    journalEntries.remove(id);
  };

  public query ({ caller }) func obtenirJournaux() : async [JournalEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent récupérer les journaux");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let entries = journalEntries.values();
    let filteredEntries = if (isAdmin) {
      entries.toArray();
    } else {
      entries.filter(func(entry : JournalEntry) : Bool { entry.user == caller }).toArray();
    };
    filteredEntries.sort(JournalEntry.compareByCreatedAt);
  };

  // -------- CALCULATION FUNCTIONS --------

  public query ({ caller }) func calculerTotaux() : async Totals {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer les totaux");
    };

    var totalNormales : Int = 0;
    var totalAstreinte : Int = 0;
    var totalRepas : Int = 0;
    var totalTrajet : Int = 0;

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    let entries = timeEntries.values();
    let filteredEntries = if (isAdmin) {
      entries;
    } else {
      entries.filter(func(entry : TimeEntry) : Bool { entry.user == caller });
    };

    filteredEntries.forEach(
      func(entry) {
        switch ((entry.typeOfDay : DayType)) {
          case (#work) {
            totalNormales += calculerHeuresTravailNormales(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
          };
          case (#astreinte) {
            totalAstreinte += calculerHeuresAstreinte(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
            if (estJourSemaine(entry.date)) {
              totalNormales += calculerHeuresTravailNormales(entry);
            };
          };
          case (#conge) {
            totalNormales += calculerHeuresTravailNormales(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
          };
        };
      }
    );

    {
      heuresTravailNormales = totalNormales;
      heuresAstreinte = totalAstreinte;
      heuresRepas = totalRepas;
      heuresTrajet = totalTrajet;
    };
  };

  public query ({ caller }) func calculerTotauxPourUtilisateur(user : Principal) : async Totals {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer les totaux utilisateur");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez calculer les totaux que pour vos propres données");
    };

    var totalNormales : Int = 0;
    var totalAstreinte : Int = 0;
    var totalRepas : Int = 0;
    var totalTrajet : Int = 0;

    let entries = timeEntries.values().filter(func(entry) { entry.user == user });
    entries.forEach(
      func(entry) {
        switch ((entry.typeOfDay : DayType)) {
          case (#work) {
            totalNormales += calculerHeuresTravailNormales(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
          };
          case (#astreinte) {
            totalAstreinte += calculerHeuresAstreinte(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
            if (estJourSemaine(entry.date)) {
              totalNormales += calculerHeuresTravailNormales(entry);
            };
          };
          case (#conge) {
            totalNormales += calculerHeuresTravailNormales(entry);
            totalRepas += entry.heuresRepas;
            totalTrajet += entry.heuresTrajet;
          };
        };
      }
    );

    {
      heuresTravailNormales = totalNormales;
      heuresAstreinte = totalAstreinte;
      heuresRepas = totalRepas;
      heuresTrajet = totalTrajet;
    };
  };

  public query ({ caller }) func calculerTotauxPourMois(user : Principal, mois : Int, annee : Int) : async Totals {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer les totaux mensuels");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez calculer les totaux mensuels que pour vos propres données");
    };

    var totalNormales : Int = 0;
    var totalAstreinte : Int = 0;
    var totalRepas : Int = 0;
    var totalTrajet : Int = 0;

    let entries = timeEntries.values().filter(func(entry) { entry.user == user });
    entries.forEach(
      func(entry) {
        if (extraireMois(entry.date) == mois and extraireAnnee(entry.date) == annee) {
          switch ((entry.typeOfDay : DayType)) {
            case (#work) {
              totalNormales += calculerHeuresTravailNormales(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
            };
            case (#astreinte) {
              totalAstreinte += calculerHeuresAstreinte(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
              if (estJourSemaine(entry.date)) {
                totalNormales += calculerHeuresTravailNormales(entry);
              };
            };
            case (#conge) {
              totalNormales += calculerHeuresTravailNormales(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
            };
          };
        };
      }
    );

    {
      heuresTravailNormales = totalNormales;
      heuresAstreinte = totalAstreinte;
      heuresRepas = totalRepas;
      heuresTrajet = totalTrajet;
    };
  };

  public query ({ caller }) func calculerTotauxPourSemaine(user : Principal, semaine : Int, annee : Int) : async Totals {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer les totaux hebdomadaires");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez calculer les totaux hebdomadaires que pour vos propres données");
    };

    var totalNormales : Int = 0;
    var totalAstreinte : Int = 0;
    var totalRepas : Int = 0;
    var totalTrajet : Int = 0;

    let entries = timeEntries.values().filter(func(entry) { entry.user == user });
    entries.forEach(
      func(entry) {
        if (extraireSemaine(entry.date) == semaine and extraireAnnee(entry.date) == annee) {
          switch ((entry.typeOfDay : DayType)) {
            case (#work) {
              totalNormales += calculerHeuresTravailNormales(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
            };
            case (#astreinte) {
              totalAstreinte += calculerHeuresAstreinte(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
              if (estJourSemaine(entry.date)) {
                totalNormales += calculerHeuresTravailNormales(entry);
              };
            };
            case (#conge) {
              totalNormales += calculerHeuresTravailNormales(entry);
              totalRepas += entry.heuresRepas;
              totalTrajet += entry.heuresTrajet;
            };
          };
        };
      }
    );

    {
      heuresTravailNormales = totalNormales;
      heuresAstreinte = totalAstreinte;
      heuresRepas = totalRepas;
      heuresTrajet = totalTrajet;
    };
  };

  public query ({ caller }) func genererDonneesRapportPdf(typePeriode : { #semaine : (Int, Int); #mois : (Int, Int) }, user : Principal) : async PdfReportData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Accès non autorisé. Seuls les utilisateurs peuvent générer des rapports PDF.");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Accès non autorisé. Vous pouvez générer des rapports PDF uniquement pour vos propres données.");
    };

    let entries = timeEntries.values().filter(func(entry) { entry.user == user });

    let (periodeText, filteredEntries) = switch (typePeriode) {
      case (#mois(mois, annee)) {
        let periodeText = "Mois sélectionné 🗓: " # mois.toText() # "/" # annee.toText();
        (periodeText, entries.filter(func(entry) { extraireMois(entry.date) == mois and extraireAnnee(entry.date) == annee }));
      };
      case (#semaine(semaine, annee)) {
        let periodeText = "Semaine sélectionnée 📅: " # semaine.toText() # "/" # annee.toText();
        (periodeText, entries.filter(func(entry) { extraireSemaine(entry.date) == semaine and extraireAnnee(entry.date) == annee }));
      };
    };

    let sortedEntries = filteredEntries.toArray().sort(TimeEntry.compareByDate);

    let enteteTableau = [
      "Date",
      "Période matin/AM",
      "Période après-midi/PM",
      "Heures normales",
      "Astreinte (début/fin)",
      "Repas",
      "Trajet"
    ];

    let lignesTableau = sortedEntries.map(
      func(entry) {
        [
          entry.date.toText(),
          entry.startMorning.toText() # " - " # entry.endMorning.toText(),
          entry.startAfternoon.toText() # " - " # entry.endAfternoon.toText(),
          calculerHeuresTravailNormales(entry).toText() # "h",
          switch (entry.startAstreinte, entry.endAstreinte) {
            case (?start, ?end) { start.toText() # "h - " # end.toText() # "h" };
            case (_) { "N/A" };
          },
          entry.heuresRepas.toText() # "h",
          entry.heuresTrajet.toText() # "h"
        ];
      }
    );

    var totalNormales : Int = 0;
    var totalAstreinte : Int = 0;
    var totalRepas : Int = 0;
    var totalTrajet : Int = 0;

    filteredEntries.forEach(
      func(entry) {
        totalNormales += calculerHeuresTravailNormales(entry);
        totalAstreinte += calculerHeuresAstreinte(entry);
        totalRepas += entry.heuresRepas;
        totalTrajet += entry.heuresTrajet;
      }
    );

    let totaux = {
      heuresTravailNormales = totalNormales.toText() # " h";
      heuresAstreinte = totalAstreinte.toText() # " h";
      heuresRepas = totalRepas.toText() # " h";
      heuresTrajet = totalTrajet.toText() # " h";
    };

    {
      titre = "Rapport de travail";
      periode = periodeText;
      enteteTableau;
      lignesTableau;
      totaux;
      exportTimestamp = Time.now();
    };
  };

  func calculerHeuresAstreinte(entry : TimeEntry) : Int {
    switch (entry.startAstreinte, entry.endAstreinte) {
      case (?start, ?end) {
        if (end > start) { end - start } else { 0 };
      };
      case (_) { 0 };
    };
  };

  func calculerHeuresTravailNormales(entry : TimeEntry) : Int {
    func computePeriod(start : Int, end : Int) : Int {
      if (end > start) { end - start } else { 0 };
    };
    let morning = computePeriod(entry.startMorning, entry.endMorning);
    let afternoon = computePeriod(entry.startAfternoon, entry.endAfternoon);
    morning + afternoon;
  };

  func estJourSemaine(_date : Time.Time) : Bool {
    true;
  };

  func extraireMois(_date : Time.Time) : Int {
    0;
  };

  func extraireAnnee(_date : Time.Time) : Int {
    0;
  };

  func extraireSemaine(_date : Time.Time) : Int {
    0;
  };

  public query ({ caller }) func calculerNombreConge(user : Principal) : async Int {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer le nombre de jours de congé");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez calculer les jours de congé que pour vos propres données");
    };

    var totalConge : Int = 0;
    let entries = timeEntries.values().filter(func(entry) { entry.user == user });

    entries.forEach(
      func(entry) {
        switch ((entry.typeOfDay : DayType)) {
          case (#work) {};
          case (#astreinte) {};
          case (#conge) { totalConge += 1 };
        };
      }
    );

    totalConge;
  };

  public query ({ caller }) func calculerNombreAstreinte(user : Principal) : async Int {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Non autorisé : seuls les utilisateurs peuvent calculer le nombre de jours d'astreinte");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Non autorisé : vous ne pouvez calculer les jours d'astreinte que pour vos propres données");
    };

    var totalAstreinte : Int = 0;
    let entries = timeEntries.values().filter(func(entry) { entry.user == user });

    entries.forEach(
      func(entry) {
        switch ((entry.typeOfDay : DayType)) {
          case (#work) {};
          case (#conge) {};
          case (#astreinte) { totalAstreinte += 1 };
        };
      }
    );

    totalAstreinte;
  };

  // ------- Publish Retry Workflow --------

  public shared ({ caller }) func restartPublish() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform a restart publish");
    };

    Runtime.trap("Publish restart workflow triggered. This actor is already running the latest version. If a publish failure occurred, redeploying should automatically resolve it. No further action is needed.");
  };
};
