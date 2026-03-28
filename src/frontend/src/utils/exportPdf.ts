import type { InterventionAvecPieces } from "../backend.d";
import type { TimeEntry } from "../backend.d";
import {
  computeAstreinteHours,
  computeInterventionHours,
  computeNormalHours,
  formatMinutes,
} from "./timeFormatting";

interface Totals {
  totalNormal: number;
  totalAstreinte: number;
  totalRepas: number;
  totalTrajet: number;
  totalIntervention: number;
}

function fmtHeure(h: bigint, m: bigint): string {
  return `${Number(h)}h${String(Number(m)).padStart(2, "0")}`;
}

function fmtDate(nanoTs: bigint): string {
  return new Date(Number(nanoTs) / 1_000_000).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildInterventionRows(
  interventions: InterventionAvecPieces[],
): string {
  if (interventions.length === 0)
    return "<p style='color:#666;font-style:italic'>Aucune fiche intervention pour cette période.</p>";
  return interventions
    .map((inv) => {
      const hasMatin =
        Number(inv.heureMatinDebutH) > 0 || Number(inv.heureMatinFinH) > 0;
      const hasAprem =
        Number(inv.heureApremDebutH) > 0 || Number(inv.heureApremFinH) > 0;
      const piecesRows =
        inv.pieces.length > 0
          ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:11px">
          <thead><tr style="background:#f0f0f0">
            <th style="text-align:left;padding:3px 6px;border:1px solid #ddd">Réf.</th>
            <th style="text-align:left;padding:3px 6px;border:1px solid #ddd">Article</th>
            <th style="text-align:right;padding:3px 6px;border:1px solid #ddd">Qté</th>
          </tr></thead>
          <tbody>${inv.pieces.map((p) => `<tr><td style="padding:3px 6px;border:1px solid #ddd">${p.reference}</td><td style="padding:3px 6px;border:1px solid #ddd">${p.article}</td><td style="text-align:right;padding:3px 6px;border:1px solid #ddd">${Number(p.quantite)}</td></tr>`).join("")}</tbody>
        </table>`
          : "";
      const sigBadges = [
        inv.signatureClient
          ? "<span style='background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:10px;font-size:10px'>✓ Client</span>"
          : "",
        inv.signatureIntervenant
          ? "<span style='background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:10px;font-size:10px'>✓ Intervenant</span>"
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
      <div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <span style="font-size:11px;color:#666;text-transform:capitalize">${fmtDate(inv.date)}</span>
          <div style="display:flex;gap:4px">${sigBadges}</div>
        </div>
        <div style="margin-bottom:6px">
          <strong style="font-size:14px">${inv.clientNom || "—"}</strong>
          ${inv.clientAdresse ? `<div style="font-size:11px;color:#666">${inv.clientAdresse}</div>` : ""}
        </div>
        ${
          hasMatin || hasAprem
            ? `<div style="display:flex;gap:16px;margin-bottom:6px;font-size:12px">
          ${hasMatin ? `<span><strong>Matin :</strong> ${fmtHeure(inv.heureMatinDebutH, inv.heureMatinDebutMin)} → ${fmtHeure(inv.heureMatinFinH, inv.heureMatinFinMin)}</span>` : ""}
          ${hasAprem ? `<span><strong>Après-midi :</strong> ${fmtHeure(inv.heureApremDebutH, inv.heureApremDebutMin)} → ${fmtHeure(inv.heureApremFinH, inv.heureApremFinMin)}</span>` : ""}
        </div>`
            : ""
        }
        ${inv.description ? `<p style="font-size:12px;color:#555;font-style:italic;border-left:3px solid #ddd;padding-left:8px;margin:6px 0">${inv.description}</p>` : ""}
        ${inv.pieces.length > 0 ? `<p style="font-size:11px;font-weight:600;margin:6px 0 2px">Pièces utilisées :</p>${piecesRows}` : ""}
        <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af">
          Z.I. du Martinet — 15300 Murat
          <br/><br/>
          04 71 20 12 22
        </div>
      </div>`;
    })
    .join("");
}

function buildEntriesTable(entries: TimeEntry[]): string {
  const typeLabel: Record<string, string> = {
    work: "Travail",
    conge: "Congé",
    astreinte: "Astreinte",
  };
  const typeColor: Record<string, string> = {
    work: "#1d4ed8",
    conge: "#059669",
    astreinte: "#f97316",
  };
  const rows = entries
    .map((entry) => {
      const date = new Date(Number(entry.date) / 1_000_000).toLocaleDateString(
        "fr-FR",
        { weekday: "short", day: "numeric", month: "short" },
      );
      const type = typeLabel[entry.typeOfDay] ?? entry.typeOfDay;
      const color = typeColor[entry.typeOfDay] ?? "#333";
      const _epDay = new Date(Number(entry.date) / 1_000_000).getDay();
      const normal = formatMinutes(
        entry.typeOfDay === "astreinte" && (_epDay === 0 || _epDay === 6)
          ? 0
          : computeNormalHours(entry),
      );
      const astreinte = formatMinutes(computeAstreinteHours(entry));
      const intervention = formatMinutes(
        computeInterventionHours(entry.interventionSlots),
      );
      const repas = formatMinutes(Number(entry.heuresRepas));
      const trajet = formatMinutes(Number(entry.heuresTrajet));
      return `<tr>
      <td style="padding:5px 8px;border:1px solid #e5e7eb">${date}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;color:${color};font-weight:600">${type}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#1d4ed8">${normal}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#f97316">${astreinte}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right">${intervention}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#64748b">${repas}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#94a3b8">${trajet}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:11px;color:#666;max-width:150px">${entry.description || ""}</td>
    </tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#f8fafc">
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Date</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Type</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Normal</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Astreinte</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Interv.</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Repas</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right">Trajet</th>
      <th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left">Description</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildHtml(
  title: string,
  entries: TimeEntry[],
  interventions: InterventionAvecPieces[],
  totals: Totals,
): string {
  const genDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; padding: 20px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 600; margin: 20px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
  .meta { font-size: 11px; color: #666; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
  .summary-card .value { font-size: 18px; font-weight: 700; }
  .summary-card .label { font-size: 10px; color: #666; margin-top: 2px; }
  @media print {
    body { margin: 0; padding: 1cm; }
    .no-print { display: none; }
    h2 { break-before: auto; }
    .page-break { break-before: page; }
  }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Généré le ${genDate}</p>

  <h2>Résumé</h2>
  <div class="summary-grid">
    <div class="summary-card"><div class="value" style="color:#1d4ed8">${formatMinutes(totals.totalNormal)}</div><div class="label">Heures travail</div></div>
    <div class="summary-card"><div class="value" style="color:#f97316">${formatMinutes(totals.totalAstreinte)}</div><div class="label">Astreinte</div></div>
    <div class="summary-card"><div class="value">${formatMinutes(totals.totalIntervention)}</div><div class="label">Interventions</div></div>
    <div class="summary-card"><div class="value" style="color:#64748b">${formatMinutes(totals.totalRepas)}</div><div class="label">Repas</div></div>
    <div class="summary-card"><div class="value" style="color:#94a3b8">${formatMinutes(totals.totalTrajet)}</div><div class="label">Trajet</div></div>
  </div>

  <h2>Journées (${entries.length})</h2>
  ${entries.length === 0 ? "<p style='color:#666;font-style:italic'>Aucune journée pour cette période.</p>" : buildEntriesTable(entries)}

  <h2 class="page-break">Fiches Interventions (${interventions.length})</h2>
  ${buildInterventionRows(interventions)}
</body>
</html>`;
}

export function exportPdf(
  title: string,
  entries: TimeEntry[],
  interventions: InterventionAvecPieces[],
  totals: Totals,
): void {
  const html = buildHtml(title, entries, interventions, totals);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Popup bloqué. Veuillez autoriser les popups pour ce site.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
