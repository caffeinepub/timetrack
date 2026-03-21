import type { InterventionAvecPieces, TimeEntry } from "../backend.d";
import { exportPdf } from "./exportPdf";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
} from "./timeFormatting";

export function exportAnnualPdf(
  year: number,
  allEntries: TimeEntry[],
  allInterventions: InterventionAvecPieces[],
  userPrincipal: string,
): void {
  const yearEntries = allEntries
    .filter((e) => {
      if (e.user.toString() !== userPrincipal) return false;
      return new Date(Number(e.date) / 1_000_000).getFullYear() === year;
    })
    .sort((a, b) => Number(a.date) - Number(b.date));

  const yearInterventions = allInterventions
    .filter((inv) => {
      if (inv.user.toString() !== userPrincipal) return false;
      return new Date(Number(inv.date) / 1_000_000).getFullYear() === year;
    })
    .sort((a, b) => Number(a.date) - Number(b.date));

  let totalNormal = 0;
  let totalAstreinte = 0;
  let totalRepas = 0;
  let totalTrajet = 0;
  let totalIntervention = 0;

  for (const entry of yearEntries) {
    totalNormal += computeNormalHours(entry);
    totalAstreinte += computeAstreinteHours(entry);
    totalRepas += Number(entry.heuresRepas);
    totalTrajet += Number(entry.heuresTrajet);
    totalIntervention += computeInterventionHours(entry.interventionSlots);
  }

  exportPdf(`Rapport Annuel - ${year}`, yearEntries, yearInterventions, {
    totalNormal,
    totalAstreinte,
    totalRepas,
    totalTrajet,
    totalIntervention,
  });
}
