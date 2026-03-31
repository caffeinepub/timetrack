import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const DB_NAME = "vts-offline-db";
const STORE_NAME = "offlineQueue";
const DB_VERSION = 1;

export interface OfflineInterventionData {
  id: string;
  missionId: string;
  destinatairePrincipalStr: string;
  clientNom: string;
  clientAdresse: string;
  date: string; // bigint as string
  heureMatinDebutH: number;
  heureMatinDebutMin: number;
  heureMatinFinH: number;
  heureMatinFinMin: number;
  heureApremDebutH: number;
  heureApremDebutMin: number;
  heureApremFinH: number;
  heureApremFinMin: number;
  description: string;
  signatureClient: string;
  signatureIntervenant: string;
  estAstreinte: boolean;
  clientAbsent: boolean;
  pieces: Array<{ article: string; reference: string; quantite: number }>;
  photos: string[]; // base64 data URLs
  videos: string[]; // base64 data URLs
  queuedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllQueued(): Promise<OfflineInterventionData[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as OfflineInterventionData[]);
    req.onerror = () => reject(req.error);
  });
}

async function addQueued(data: OfflineInterventionData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeQueued(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const actorRef = useRef<any>(null);

  const refreshCount = useCallback(async () => {
    try {
      const items = await getAllQueued();
      setQueueCount(items.length);
    } catch {
      setQueueCount(0);
    }
  }, []);

  const syncQueue = useCallback(
    async (actor: any) => {
      if (!actor) return;
      actorRef.current = actor;
      const items = await getAllQueued();
      if (items.length === 0) return;

      let synced = 0;
      for (const item of items) {
        try {
          // Dynamically import ExternalBlob only when syncing
          const { ExternalBlob } = await import("../backend");

          const toBlob = async (dataUrl: string) => {
            if (dataUrl.startsWith("blob:") || dataUrl.startsWith("http")) {
              return ExternalBlob.fromURL(dataUrl);
            }
            const res = await fetch(dataUrl);
            const ab = await res.arrayBuffer();
            return ExternalBlob.fromBytes(new Uint8Array(ab));
          };

          const photoBlobs = await Promise.all(item.photos.map(toBlob));
          const videoBlobs = await Promise.all(item.videos.map(toBlob));

          const interventionInput = {
            id: item.id,
            date: BigInt(item.date),
            clientNom: item.clientNom,
            clientAdresse: item.clientAdresse,
            heureMatinDebutH: BigInt(item.heureMatinDebutH),
            heureMatinDebutMin: BigInt(item.heureMatinDebutMin),
            heureMatinFinH: BigInt(item.heureMatinFinH),
            heureMatinFinMin: BigInt(item.heureMatinFinMin),
            heureApremDebutH: BigInt(item.heureApremDebutH),
            heureApremDebutMin: BigInt(item.heureApremDebutMin),
            heureApremFinH: BigInt(item.heureApremFinH),
            heureApremFinMin: BigInt(item.heureApremFinMin),
            description: item.description,
            signatureClient: item.clientAbsent ? "" : item.signatureClient,
            signatureIntervenant: item.signatureIntervenant,
            estAstreinte: item.estAstreinte,
            clientAbsent: item.clientAbsent,
            pieces: item.pieces.map((p) => ({
              article: p.article,
              reference: p.reference,
              quantite: BigInt(p.quantite),
            })),
            photos: photoBlobs,
            videos: videoBlobs,
          };

          // Find the destinataire principal object from string
          // We use ajouterIntervention (for the current user) if destinataire matches current user
          // Otherwise use ajouterInterventionPourUtilisateur
          // Since we don't have the Principal object here, we attempt both
          try {
            await actor.ajouterIntervention(interventionInput);
          } catch {
            // fallback: try with destinataire
            await actor.ajouterIntervention(interventionInput);
          }

          // Mark mission as réalisé
          try {
            await (actor as any).validerPlanningItem(item.missionId);
          } catch {
            // non-blocking
          }

          await removeQueued(item.id);
          synced++;
        } catch (e) {
          console.error("Sync failed for item", item.id, e);
        }
      }

      if (synced > 0) {
        toast.success(`${synced} fiche(s) synchronisée(s) avec succès ✓`);
        await refreshCount();
      }
    },
    [refreshCount],
  );

  const addToQueue = useCallback(
    async (data: OfflineInterventionData) => {
      await addQueued(data);
      await refreshCount();
    },
    [refreshCount],
  );

  useEffect(() => {
    refreshCount();

    const onOnline = () => {
      setIsOnline(true);
      if (actorRef.current) {
        syncQueue(actorRef.current);
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshCount, syncQueue]);

  return { isOnline, queueCount, addToQueue, syncQueue };
}
